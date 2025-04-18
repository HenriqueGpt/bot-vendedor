require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

app.post('/webhook', async (req, res) => {
  const msg = req.body.body;
  const numero = req.body.from;

  console.log("📩 Mensagem recebida de:", numero, "Conteúdo:", msg);

  const resposta = `Olá! Recebemos sua mensagem: "${msg}". Em breve um vendedor entrará em contato.`;

  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;

  console.log("🧾 INSTÂNCIA:", instanceId);
  console.log("🔐 TOKEN:", token);

  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-messages`;

  try {
    await axios.post(url, {
      phone: numero,
      message: resposta
    });

    console.log("✅ Resposta enviada com sucesso!");
    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Erro ao enviar mensagem via Z-API:", err.message);
    res.sendStatus(500);
  }
});

app.listen(10000, () => {
  console.log("🚀 Bot vendedor rodando na porta 10000");
});
