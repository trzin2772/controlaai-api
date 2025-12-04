const { getLicensesCollection } = require('../lib/db');

module.exports = async (req, res) => {
  // Configura CORS
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
    const { licenseKey, deviceId } = req.body;

    if (!licenseKey || !deviceId) {
      return res.status(400).json({
        valid: false,
        message: 'Dados incompletos'
      });
    }

    const collection = await getLicensesCollection();
    const license = await collection.findOne({ licenseKey });

    if (!license) {
      return res.status(404).json({
        valid: false,
        message: 'Licença não encontrada'
      });
    }

    if (license.status !== 'active') {
      return res.status(403).json({
        valid: false,
        message: 'Licença revogada ou inativa'
      });
    }

    if (license.deviceId !== deviceId) {
      return res.status(403).json({
        valid: false,
        message: 'Esta licença pertence a outro dispositivo'
      });
    }

    // Atualiza última verificação
    await collection.updateOne(
      { licenseKey },
      { $set: { lastVerified: new Date() } }
    );

    return res.status(200).json({
      valid: true,
      message: 'Licença válida'
    });

  } catch (error) {
    console.error('Erro ao verificar licença:', error);
    return res.status(500).json({
      valid: false,
      message: 'Erro no servidor'
    });
  }
};
