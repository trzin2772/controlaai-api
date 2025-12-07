module.exports = (req, res) => {
  res.status(200).json({ 
    message: 'ControlaAI API funcionando!',
    endpoints: [
      'POST /api/activate',
      'POST /api/verify', 
      'POST /api/revoke'
    ]
  });
};
