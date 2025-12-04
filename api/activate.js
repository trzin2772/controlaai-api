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
  // Configura CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Responde OPTIONS para preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { licenseKey, deviceId, deviceInfo } = req.body;

    // Validação
    if (!licenseKey || !deviceId) {
      return res.status(400).json({
        valid: false,
        message: 'Chave de licença e ID do dispositivo são obrigatórios'
      });
    }

    // Validação de formato UUID
    const uuidRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
    if (!uuidRegex.test(licenseKey)) {
      return res.status(400).json({
        valid: false,
        message: 'Formato de chave inválido'
      });
    }

    const collection = await getLicensesCollection();

    // Verifica se a chave já existe
    const existingLicense = await collection.findOne({ licenseKey });

    if (existingLicense) {
      // Chave já existe - verifica se é o mesmo dispositivo
      if (existingLicense.deviceId === deviceId) {
        // Mesmo dispositivo - permite (reativação)
        await collection.updateOne(
          { licenseKey },
          {
            $set: {
              lastVerified: new Date(),
              status: 'active'
            }
          }
        );

        return res.status(200).json({
          valid: true,
          message: 'Licença reativada com sucesso!'
        });
      } else {
        // Dispositivo diferente - BLOQUEIA
        return res.status(403).json({
          valid: false,
          message: 'Esta chave já foi ativada em outro dispositivo.'
        });
      }
    }

    // Chave nova - cria registro
    const licenseData = {
      licenseKey,
      deviceId,
      deviceInfo: deviceInfo || {},
      activatedAt: new Date(),
      lastVerified: new Date(),
      status: 'active'
    };

    await collection.insertOne(licenseData);

    return res.status(200).json({
      valid: true,
      message: 'Licença ativada com sucesso!'
    });

  } catch (error) {
    console.error('Erro ao ativar licença:', error);
    return res.status(500).json({
      valid: false,
      message: 'Erro no servidor. Tente novamente.'
    });
  }
};
