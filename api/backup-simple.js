// Backup simples sem KV - armazena em memória (temporário)
// NOTA: Este é um sistema temporário para testes
// Em produção, use um banco de dados real

// Armazenamento em memória (será perdido ao reiniciar)
const backups = new Map();

module.exports = async (req, res) => {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            message: 'Método não permitido'
        });
    }

    try {
        const { email, data } = req.body;

        // Validações
        if (!email || !email.includes('@')) {
            return res.status(400).json({
                success: false,
                message: 'Email inválido'
            });
        }

        if (!data) {
            return res.status(400).json({
                success: false,
                message: 'Dados não fornecidos'
            });
        }

        // Normaliza o email (lowercase)
        const normalizedEmail = email.toLowerCase().trim();

        // Prepara os dados do backup
        const backupData = {
            email: normalizedEmail,
            transacoes: data.transacoes || [],
            despesasFixas: data.despesasFixas || [],
            pagamentosDespesas: data.pagamentosDespesas || [],
            lastBackup: new Date().toISOString(),
            version: '1.0'
        };

        // Salva em memória
        backups.set(normalizedEmail, backupData);

        return res.status(200).json({
            success: true,
            message: 'Backup realizado com sucesso!',
            backup: {
                email: normalizedEmail,
                timestamp: backupData.lastBackup,
                transacoes: backupData.transacoes.length,
                despesasFixas: backupData.despesasFixas.length,
                pagamentosDespesas: backupData.pagamentosDespesas.length
            }
        });

    } catch (error) {
        console.error('Erro ao fazer backup:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao realizar backup',
            error: error.message
        });
    }
};
