import { getLicensesCollection } from '../lib/db.js';

/**
 * Endpoint para atualizar deviceId de uma licença
 * Útil quando o cliente perde acesso e precisa redefinir o dispositivo
 */
export default async function handler(req, res) {
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
    const { licenseKey, newDeviceId, adminSecret } = req.body;

    // Proteção admin (senha simples para testes)
    if (adminSecret !== 'admin123') {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }

    if (!licenseKey || !newDeviceId) {
      return res.status(400).json({
        success: false,
        message: 'Dados incompletos'
      });
    }

    const collection = await getLicensesCollection();
    
    // Atualiza o deviceId
    const result = await collection.updateOne(
      { licenseKey },
      { 
        $set: { 
          deviceId: newDeviceId,
          lastVerified: new Date()
        } 
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Licença não encontrada'
      });
    }

    return res.status(200).json({
      success: true,
      message: `Device ID atualizado para: ${newDeviceId}`
    });

  } catch (error) {
    console.error('Erro ao atualizar device:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
};
