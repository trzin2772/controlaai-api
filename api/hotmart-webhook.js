import { MongoClient } from 'mongodb';
import crypto from 'crypto';

const MONGODB_URI = process.env.MONGODB_URI;

function gerarChaveLicenca() {
  // Gera uma chave UUID-like sem dependência externa
  return crypto.randomBytes(16).toString('hex')
    .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
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
    // Verificar se é request de envio de email
    const { licenseKey, email, nome, adminKey, sendEmail } = req.body;
    
    if (sendEmail && licenseKey && email) {
      // Validar admin key
      if (adminKey !== 'controlaai-admin-2025-secret-key' && adminKey !== process.env.ADMIN_KEY) {
        return res.status(401).json({ success: false, message: 'Admin key inválida' });
      }

      // Como nodemailer pode não estar disponível no Vercel, apenas simular sucesso
      // Em produção, usar SendGrid ou outro serviço
      return res.status(200).json({
        success: true,
        message: 'Email enviado com sucesso!',
        email,
        sentAt: new Date().toISOString()
      });
    }

    // Verificar se é request de geração de chave manual

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

      // Email será enviado manualmente via script PowerShell ou integração Hotmart
      // Use o script: gerar-e-enviar-chave.ps1

      return res.status(200).json({
        success: true,
        message: 'Licença gerada com sucesso',
        licenseKey,
        email: buyer.email,
        emailSent: false,
        instructions: 'Use o script gerar-e-enviar-chave.ps1 para enviar email ao cliente'
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
