const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

app.post('/webhook', async (req, res) => {
  const body = req.body;
  const msg = body?.message?.text?.body;
  const numero = body?.message?.from;

  if (!msg || !numero) return res.sendStatus(400);

  console.log("📩 Mensagem recebida de", numero + ":", msg);

  // Log das variáveis de ambiente
  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;
  console.log("🔍 ID:", instanceId);
  console.log("🔍 TOKEN:", token);

  const resposta = `Olá! Recebemos sua mensagem: "${msg}". Em breve um vendedor entrará em contato.`;

  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

  try {
    await axios.post(url, {
      phone: numero,
      message: resposta
    });
    console.log("✅ Resposta enviada para", numero);
  } catch (err) {
    console.error("❌ Erro ao enviar mensagem via Z-API:", err.response?.data || err.message);
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🤖 Bot vendedor rodando na porta ${PORT}`);
});
