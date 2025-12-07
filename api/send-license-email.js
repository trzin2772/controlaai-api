import { MongoClient } from 'mongodb';
import nodemailer from 'nodemailer';

const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_KEY = process.env.ADMIN_KEY || 'controlaai-admin-2025-secret-key';
const GMAIL_USER = process.env.EMAIL_FROM || process.env.SUPPORT_EMAIL;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

// Configura transportador Gmail
let transporter = null;
if (GMAIL_APP_PASSWORD && GMAIL_USER) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD
    }
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { licenseKey, email, nome, adminKey } = req.body;

    if (!adminKey || adminKey !== ADMIN_KEY) {
      return res.status(401).json({ success: false, message: 'Admin key inválida' });
    }

    if (!licenseKey || !email) {
      return res.status(400).json({ success: false, message: 'Chave e email obrigatórios' });
    }

    // Verifica se a chave existe no banco
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db('controlaai');
    const collection = db.collection('licenses');

    const license = await collection.findOne({ licenseKey });
    
    if (!license) {
      await client.close();
      return res.status(404).json({ 
        success: false, 
        message: 'Chave não encontrada no banco de dados' 
      });
    }

    if (license.email !== email) {
      await client.close();
      return res.status(400).json({ 
        success: false, 
        message: 'Email não corresponde à chave' 
      });
    }

    await client.close();

    // Monta o email
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .key-box { background: #fff; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
    .key { font-size: 24px; font-weight: bold; color: #667eea; letter-spacing: 2px; font-family: monospace; }
    .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    .steps { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .step { margin: 15px 0; padding-left: 30px; position: relative; }
    .step:before { content: "✓"; position: absolute; left: 0; color: #667eea; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Bem-vindo ao ControlaAI!</h1>
      <p>Sua chave de ativação está pronta</p>
    </div>
    
    <div class="content">
      <p>Olá <strong>${nome || 'Cliente'}</strong>,</p>
      
      <p>Obrigado por adquirir o <strong>ControlaAI</strong>! Seu app de controle financeiro pessoal está pronto para uso.</p>
      
      <div class="key-box">
        <p style="margin: 0 0 10px 0; color: #666;">Sua Chave de Ativação:</p>
        <div class="key">${licenseKey}</div>
      </div>
      
      <div class="steps">
        <h3 style="color: #667eea; margin-top: 0;">📱 Como Ativar:</h3>
        <div class="step">Baixe o app ControlaAI</div>
        <div class="step">Abra o aplicativo pela primeira vez</div>
        <div class="step">Cole ou digite sua chave de ativação</div>
        <div class="step">Pronto! Comece a controlar suas finanças</div>
      </div>
      
      <p style="margin-top: 30px;"><strong>⚠️ Importante:</strong></p>
      <ul>
        <li>Guarde esta chave em local seguro</li>
        <li>A chave funciona apenas em 1 dispositivo</li>
        <li>Validade: 1 ano a partir da ativação</li>
        <li>Em caso de problemas, entre em contato com o suporte</li>
      </ul>
      
      <p style="text-align: center; margin-top: 30px;">
        <strong>Precisa de ajuda?</strong><br>
        Entre em contato: <a href="mailto:${GMAIL_USER}">${GMAIL_USER}</a>
      </p>
    </div>
    
    <div class="footer">
      <p>© 2025 ControlaAI - Controle Financeiro Pessoal</p>
      <p>Este é um email automático, por favor não responda.</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    // Texto simples do email
    const emailText = `
Olá ${nome || 'Cliente'},

Obrigado por adquirir o ControlaAI!

Sua Chave de Ativação: ${licenseKey}

Como Ativar:
1. Baixe o app ControlaAI
2. Abra o aplicativo pela primeira vez
3. Cole ou digite sua chave de ativação
4. Pronto! Comece a controlar suas finanças

Importante:
- Guarde esta chave em local seguro
- A chave funciona apenas em 1 dispositivo
- Validade: 1 ano a partir da ativação

Precisa de ajuda? Entre em contato: ${GMAIL_USER}

Atenciosamente,
Equipe ControlaAI
    `.trim();

    // Envia email via Gmail
    if (transporter) {
      try {
        const mailOptions = {
          from: `"ControlaAI" <${GMAIL_USER}>`,
          to: email,
          subject: '🎉 Sua chave de ativação do ControlaAI está pronta!',
          text: emailText,
          html: emailHtml
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email enviado via Gmail:', info.messageId);

        // Atualiza a licença para marcar que o email foi enviado
        const client2 = new MongoClient(MONGODB_URI);
        await client2.connect();
        const db2 = client2.db('controlaai');
        const collection2 = db2.collection('licenses');
        
        await collection2.updateOne(
          { licenseKey },
          { 
            $set: { 
              emailSentAt: new Date(),
              lastEmailSent: new Date(),
              emailMessageId: info.messageId
            } 
          }
        );
        
        await client2.close();

        return res.status(200).json({
          success: true,
          message: 'Email enviado com sucesso!',
          email,
          licenseKey,
          sentAt: new Date().toISOString(),
          provider: 'Gmail',
          messageId: info.messageId
        });

      } catch (emailError) {
        console.error('❌ Erro ao enviar via Gmail:', emailError);
        
        return res.status(500).json({
          success: false,
          message: 'Erro ao enviar email via Gmail',
          error: emailError.message,
          details: emailError.response || 'Sem detalhes adicionais'
        });
      }
    } else {
      console.log('⚠️ Gmail não configurado, retornando preview');
      
      return res.status(200).json({
        success: false,
        message: 'Gmail não configurado (faltam GMAIL_APP_PASSWORD ou EMAIL_FROM)',
        email,
        licenseKey,
        provider: 'Simulado',
        emailContent: emailHtml
      });
    }

  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao enviar email',
      error: error.message
    });
  }
}
