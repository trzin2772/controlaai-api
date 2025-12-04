const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
let cachedClient = null;

async function getLicensesCollection() {
  if (!uri) {
    throw new Error('MONGODB_URI não configurada');
  }

  if (cachedClient) {
    const db = cachedClient.db('controlaai');
    return db.collection('licenses');
  }

  const client = new MongoClient(uri);
  await client.connect();
  cachedClient = client;
  
  const db = client.db('controlaai');
  return db.collection('licenses');
}

module.exports = async (req, res) => {
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
    const { licenseKey, adminKey } = req.body;

    // Verifica chave de admin
    if (adminKey !== process.env.ADMIN_KEY) {
      return res.status(401).json({
        success: false,
        message: 'Acesso não autorizado'
      });
    }

    if (!licenseKey) {
      return res.status(400).json({
        success: false,
        message: 'Chave de licença obrigatória'
      });
    }

    const collection = await getLicensesCollection();
    
    const result = await collection.updateOne(
      { licenseKey },
      { $set: { status: 'revoked', revokedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Licença não encontrada'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Licença revogada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao revogar licença:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
};
