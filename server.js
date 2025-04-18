const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

app.post('/webhook', async (req, res) => {
  const msg = req.body.message.body;
  const numero = req.body.message.from;

  console.log("📩 Mensagem recebida de:", numero, "Conteúdo:", msg);

  // Variáveis de ambiente
  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;

  const resposta = `Olá! Recebemos sua mensagem: "${msg}". Em breve um vendedor entrará em contato.`;

  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

  try {
    const respostaApi = await axios.post(url, {
      phone: numero,
      message: resposta
    });

    console.log("✅ Resposta enviada via Z-API:", respostaApi.data);
    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Erro ao enviar mensagem via Z-API:", error.response?.data || error.message);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Bot vendedor rodando na porta ${PORT}`);
});
