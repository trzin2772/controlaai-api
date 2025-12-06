import { MongoClient } from 'mongodb';
import nodemailer from 'nodemailer';

const MONGODB_URI = process.env.MONGODB_URI;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const EMAIL_FROM = process.env.EMAIL_FROM || 'seu-email@gmail.com';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { licenseKey, email, nome, adminKey } = req.body;

  // Validar admin key
  if (adminKey !== process.env.ADMIN_KEY && adminKey !== 'controlaai-admin-2025-secret-key') {
    return res.status(401).json({ success: false, message: 'Admin key inválida' });
  }

  // Validar email
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Email inválido' });
  }

  // Validar license key
  if (!licenseKey || licenseKey.trim() === '') {
    return res.status(400).json({ success: false, message: 'License key inválida' });
  }

  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db('controlaai');
    const licensesCollection = db.collection('licenses');

    // Verificar se a chave existe
    const license = await licensesCollection.findOne({ licenseKey });
    if (!license) {
      await client.close();
      return res.status(404).json({ success: false, message: 'Chave de licença não encontrada' });
    }

    // Configurar transporter do Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: EMAIL_FROM,
        pass: GMAIL_APP_PASSWORD
      }
    });

    // Preparar email
    const mailOptions = {
      from: EMAIL_FROM,
      to: email,
      subject: 'Sua Chave de Ativação ControlaAI 🔓',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #007bff;">Bem-vindo ao ControlaAI! 🎉</h2>
          
          <p>Olá <strong>${nome}</strong>,</p>
          
          <p>Sua chave de ativação foi gerada com sucesso! Use o código abaixo para ativar o app ControlaAI:</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="margin: 0; color: #666; font-size: 12px;">CHAVE DE ATIVAÇÃO</p>
            <h3 style="margin: 10px 0; color: #007bff; font-size: 24px; letter-spacing: 2px;">${licenseKey}</h3>
            <p style="margin: 0; color: #999; font-size: 12px;">Válida até: ${license.expirationDate}</p>
          </div>
          
          <h3 style="color: #333;">Como Ativar:</h3>
          <ol>
            <li>Abra o app ControlaAI no seu celular</li>
            <li>Clique em "Ativar Licença"</li>
            <li>Cole a chave acima: <strong>${licenseKey}</strong></li>
            <li>Clique em "Ativar"</li>
            <li>Pronto! Seu app será ativado automaticamente 🚀</li>
          </ol>
          
          <h3 style="color: #333;">Informações Importantes:</h3>
          <ul>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Data de Ativação:</strong> ${new Date().toLocaleDateString('pt-BR')}</li>
            <li><strong>Validade:</strong> 1 ano a partir da ativação</li>
            <li><strong>Suporte:</strong> Abra um ticket no app ou envie um email</li>
          </ul>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999;">
            <p>Se não solicitou essa chave, ignore este email.</p>
            <p>© 2025 ControlaAI. Todos os direitos reservados.</p>
          </div>
        </div>
      `,
      text: \`Sua Chave de Ativação: \${licenseKey}\n\nCole esta chave no app ControlaAI para ativar sua licença.\n\nValidade: \${license.expirationDate}\`
    };

    // Enviar email
    await transporter.sendMail(mailOptions);

    // Atualizar license com timestamp de envio
    await licensesCollection.updateOne(
      { licenseKey },
      { $set: { emailSentAt: new Date(), sentTo: email } }
    );

    await client.close();

    return res.status(200).json({
      success: true,
      message: 'Email enviado com sucesso!',
      email,
      sentAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro ao enviar email:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao enviar email: ' + error.message
    });
  }
}
