require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

app.post('/webhook', async (req, res) => {
  const msg = req.body.message?.text?.body || '';
  const numero = req.body.message?.from || '';

  console.log("📩 Mensagem recebida de:", numero, "| Conteúdo:", msg);

  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;

  console.log("🔁 INSTÂNCIA:", instanceId);
  console.log("🔐 TOKEN:", token);

  const resposta = `Olá! Recebemos sua mensagem: "${msg}". Em breve um vendedor entrará em contato.`;

  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-messages`;


  try {
    const payload = {
      phone: numero,
      message: resposta
    };

    const zapi = await axios.post(url, payload);
    console.log("✅ Mensagem enviada com sucesso:", zapi.data);
  } catch (error) {
    console.error("❌ Erro ao enviar mensagem via Z-API:", error.response?.data || error.message);
  }

  res.sendStatus(200);
});

app.listen(10000, () => {
  console.log("🚀 Bot vendedor rodando na porta 10000");
});
