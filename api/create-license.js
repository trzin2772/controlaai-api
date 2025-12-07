import { MongoClient } from 'mongodb';
import crypto from 'crypto';

const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_KEY = process.env.ADMIN_KEY || 'controlaai-admin-2025-secret-key';

function gerarChaveLicenca() {
  return crypto.randomBytes(16).toString('hex')
    .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
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
    const { email, nome, adminKey } = req.body;

    if (!adminKey || adminKey !== ADMIN_KEY) {
      return res.status(401).json({ success: false, message: 'Admin key inválida' });
    }

    if (!email || !nome) {
      return res.status(400).json({ success: false, message: 'Email e nome obrigatórios' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Email inválido' });
    }

    const licenseKey = gerarChaveLicenca();
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db('controlaai');
    const collection = db.collection('licenses');

    const existente = await collection.findOne({ email });
    if (existente) {
      await client.close();
      return res.status(400).json({
        success: false,
        message: 'Já existe licença para este email',
        existingKey: existente.licenseKey
      });
    }

    const license = {
      licenseKey,
      email,
      customerName: nome,
      productName: 'ControlaAI',
      purchaseDate: new Date(),
      expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      status: 'pending',
      activated: false,
      deviceId: null,
      deviceInfo: {},
      devices: [],
      transactions: []
    };

    await collection.insertOne(license);
    await client.close();

    return res.status(200).json({
      success: true,
      licenseKey,
      email,
      customerName: nome,
      expirationDate: license.expirationDate
    });

  } catch (error) {
    console.error('Erro ao gerar chave:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
