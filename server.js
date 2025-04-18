const express = require('express');
const axios = require('axios');
const app = express();

// Middleware para interpretar JSON
app.use(express.json());

app.post('/webhook', async (req, res) => {
  try {
    const numero = req.body.phone;
    
    // Corrigido: a mensagem vem em req.body.text.message
    const msg = req.body.message?.body || req.body.text?.message;

    if (!numero || !msg) {
      console.log("❌ Mensagem inválida recebida:", req.body);
      return res.status(400).send('Corpo da requisição inválido');
    }

    console.log("✅ Mensagem recebida de:", numero, "| Conteúdo:", msg);

    const instanceId = process.env.ZAPI_INSTANCE_ID;
    const token = process.env.ZAPI_TOKEN;

    const resposta = `Olá! Recebemos sua mensagem: "${msg}". Em breve um vendedor entrará em contato.`;

    const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

    await axios.post(url, {
      phone: numero,
      message: resposta,
    });

    res.status(200).send('Mensagem processada com sucesso');
  } catch (error) {
    console.error("❌ Erro ao processar mensagem:", error.message);
    res.status(500).send('Erro ao processar a mensagem');
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Bot vendedor rodando na porta ${PORT}`);
});
