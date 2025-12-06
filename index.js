import { MongoClient } from 'mongodb';
import crypto from 'crypto';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Se for GET na raiz, retornar info
  if (req.method === 'GET') {
    return res.json({
      message: 'ControlaAI API funcionando!',
      version: '1.0.0',
      endpoints: ['POST /api/license-create', 'POST /api/hotmart-webhook']
    });
  }

  // POST - processar geração/envio de chaves
  try {
    const body = req.body || {};

    // Geração de chave manual
    if (body.generateLicense === true && body.email && body.nome) {
      const licenseKey = crypto.randomBytes(16).toString('hex')
        .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');

      const client = new MongoClient(process.env.MONGODB_URI);
      await client.connect();
      const db = client.db('controlaai');
      const col = db.collection('licenses');

      const license = {
        licenseKey,
        email: body.email,
        customerName: body.nome,
        productName: 'ControlaAI',
        createdAt: new Date(),
        expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        status: 'active',
        activated: false,
        devices: [],
        transactions: []
      };

      await col.insertOne(license);
      await client.close();

      return res.json({
        success: true,
        licenseKey,
        email: body.email,
        customerName: body.nome,
        expirationDate: license.expirationDate
      });
    }

    // Envio de email (simulado)
    if (body.sendEmail === true && body.email && body.licenseKey) {
      return res.json({
        success: true,
        message: 'Email enviado com sucesso!',
        email: body.email,
        sentAt: new Date().toISOString()
      });
    }

    return res.json({ success: true, message: 'OK' });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

