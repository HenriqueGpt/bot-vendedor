require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json()); // <- ESSA LINHA É ESSENCIAL

app.post('/webhook', async (req, res) => {
  const msg = req.body.message.body;
  const numero = req.body.key.remoteJid;

  console.log("📥 Mensagem recebida de:", numero, "|", msg);

  const resposta = `Olá! Recebemos sua mensagem: "${msg}". Em breve um vendedor entrará em contato.`;

  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;

  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

  try {
    await axios.post(url, {
      phone: numero,
      message: resposta
    });
    console.log("📤 Mensagem enviada com sucesso!");
  } catch (err) {
    console.error("❌ Erro ao enviar mensagem via Z-API:", err.message);
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Bot vendedor rodando na porta ${PORT}`);
});
