import { MongoClient } from 'mongodb';
import crypto from 'crypto';

const MONGODB_URI = process.env.MONGODB_URI;
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'controlaaifinancas@gmail.com';

function gerarChaveLicenca() {
  // Gera uma chave UUID-like sem dependência externa
  return crypto.randomBytes(16).toString('hex')
    .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
}

async function enviarEmailComChave(email, nomeCliente, chave) {
  if (!SENDGRID_API_KEY) {
    console.warn('⚠️ SENDGRID_API_KEY não configurada - email não será enviado');
    return false;
  }

  try {
    const assunto = 'Seu ControlaAI foi ativado! 🎉';
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
            .header { text-align: center; color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 20px; }
            .content { padding: 20px 0; }
            .chave { background-color: #ecf0f1; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0; }
            .chave-texto { font-size: 18px; font-weight: bold; color: #2c3e50; font-family: monospace; word-break: break-all; }
            .botao { display: inline-block; background-color: #3498db; color: white; padding: 12px 24px; border-radius: 5px; text-decoration: none; margin: 20px 0; }
            .rodape { text-align: center; color: #7f8c8d; font-size: 12px; border-top: 1px solid #ecf0f1; padding-top: 20px; margin-top: 20px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Bem-vindo ao ControlaAI!</h1>
            </div>
            
            <div class="content">
                <p>Olá <strong>${nomeCliente}</strong>,</p>
                
                <p>Obrigado por comprar o <strong>ControlaAI</strong>! 🙌</p>
                
                <p>Sua chave de ativação está pronta. Use-a para ativar o app no seu celular:</p>
                
                <div class="chave">
                    <p style="margin: 0; color: #7f8c8d; font-size: 12px;">CHAVE DE ATIVAÇÃO</p>
                    <p class="chave-texto">${chave}</p>
                </div>
                
                <h3>Como usar:</h3>
                <ol>
                    <li>Baixe o app ControlaAI no seu celular</li>
                    <li>Abra o app e clique em "Ativar"</li>
                    <li>Cole ou digite esta chave: <code>${chave}</code></li>
                    <li>Pronto! Comece a controlar seus gastos! 💰</li>
                </ol>
                
                <p style="text-align: center;">
                    <a href="https://play.google.com/store/apps/details?id=com.controlaai" class="botao">
                        Baixar ControlaAI
                    </a>
                </p>
                
                <p>Se tiver dúvidas, responda este email que ajudaremos! 📧</p>
                
                <p>Abraços,<br><strong>Time ControlaAI</strong> 🚀</p>
            </div>
            
            <div class="rodape">
                <p>Este é um email automático. Não responda diretamente.</p>
                <p>Qualquer dúvida, contate: controlaaifinancas@gmail.com</p>
            </div>
        </div>
    </body>
    </html>
    `;

    const payload = {
      personalizations: [
        {
          to: [{ email, name: nomeCliente }],
          subject: assunto
        }
      ],
      from: { email: EMAIL_FROM, name: 'ControlaAI' },
      content: [
        {
          type: 'text/html',
          value: htmlContent
        }
      ]
    };

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.status === 202) {
      console.log('✅ Email enviado com sucesso para', email);
      return true;
    } else {
      console.error('❌ Erro ao enviar email:', response.status, response.statusText);
      return false;
    }

  } catch (error) {
    console.error('❌ Erro ao enviar email:', error.message);
    return false;
  }
}

export default async function handler(req, res) {
  // Configura CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Webhook do Hotmart envia dados em formato específico
    const { event, data, source } = req.body;

    console.log('📨 Webhook Hotmart recebido:', { event, source });

    // Valida se é realmente do Hotmart (você pode adicionar token de verificação)
    // const token = req.headers.authorization;
    // if (!token || token !== `Bearer ${process.env.HOTMART_WEBHOOK_TOKEN}`) {
    //   return res.status(401).json({ error: 'Token inválido' });
    // }

    // Processa diferentes tipos de eventos
    if (event === 'PURCHASE') {
      const { buyer, product } = data;

      if (!buyer || !buyer.email) {
        return res.status(400).json({
          success: false,
          message: 'Email do comprador não fornecido'
        });
      }

      // Gera chave de licença única (UUID-like)
      const licenseKey = gerarChaveLicenca();
      
      const client = new MongoClient(MONGODB_URI);
      await client.connect();
      const db = client.db('controlaai');
      const collection = db.collection('licenses');

      // Salva a licença no MongoDB
      const license = {
        licenseKey,
        email: buyer.email,
        customerName: buyer.name || 'Sem nome',
        productId: product?.id || 'unknown',
        productName: product?.name || 'ControlaAI',
        purchaseDate: new Date(),
        expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 ano
        status: 'active',
        activated: false,
        devices: [],
        transactions: []
      };

      await collection.insertOne(license);

      console.log('✅ Licença criada:', licenseKey, 'para', buyer.email);

      // Envia email com a chave
      const emailEnviado = await enviarEmailComChave(buyer.email, buyer.name || 'Cliente', licenseKey);

      return res.status(200).json({
        success: true,
        message: 'Licença gerada com sucesso',
        licenseKey,
        email: buyer.email,
        emailSent: emailEnviado
      });
    }

    if (event === 'CHARGEBACK' || event === 'CANCELLATION') {
      const { buyer } = data;

      if (!buyer || !buyer.email) {
        return res.status(400).json({
          success: false,
          message: 'Email do comprador não fornecido'
        });
      }

      const client = new MongoClient(MONGODB_URI);
      await client.connect();
      const db = client.db('controlaai');
      const collection = db.collection('licenses');

      // Revoga todas as licenças do cliente
      await collection.updateMany(
        { email: buyer.email },
        { $set: { status: 'revoked', revokedDate: new Date() } }
      );

      console.log('🚫 Licenças revogadas para', buyer.email);

      return res.status(200).json({
        success: true,
        message: 'Licenças revogadas'
      });
    }

    // Evento não reconhecido
    return res.status(200).json({
      success: true,
      message: 'Evento recebido mas não processado',
      event
    });

  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
