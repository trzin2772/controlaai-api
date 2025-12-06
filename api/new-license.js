const { MongoClient } = require('mongodb');
const crypto = require('crypto');

const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_KEY = process.env.ADMIN_KEY || 'controlaai-admin-2025-secret-key';

function gerarChaveLicenca() {
  return crypto.randomBytes(16).toString('hex')
    .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, nome, adminKey } = req.body;

    if (!adminKey || adminKey !== ADMIN_KEY) {
      return res.status(401).json({ success: false, message: 'Invalid admin key' });
    }

    if (!email || !nome) {
      return res.status(400).json({ success: false, message: 'Email and name required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email' });
    }

    const licenseKey = gerarChaveLicenca();
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db('controlaai');
    const collection = db.collection('licenses');

    const existente = await collection.findOne({ email });
    if (existente) {
      await client.close();
      return res.status(400).json({ success: false, message: 'License already exists for this email', existingKey: existente.licenseKey });
    }

    const license = {
      licenseKey,
      email,
      customerName: nome,
      productName: 'ControlaAI',
      createdAt: new Date(),
      expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      status: 'active',
      activated: false,
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
    console.error('Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
