// Versão 1.0.5 — Corrige envio para Z-API e extrai corretamente o texto
const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json()); // ESSENCIAL para ler req.body

app.post('/webhook', async (req, res) => {
  try {
    const numero = req.body.phone;
    const msg = req.body.text?.message;

    if (!numero || !msg) {
      console.log("❌ Mensagem inválida recebida:", req.body);
      return res.sendStatus(400);
    }

    console.log("✅ Mensagem recebida de:", numero, "| Conteúdo:", msg);

    // Variáveis de ambiente
    const instanceId = process.env.ZAPI_INSTANCE_ID;
    const token = process.env.ZAPI_TOKEN;

    // Mensagem de resposta
    const resposta = `Olá! Recebemos sua mensagem: "${msg}". Em breve um vendedor entrará em contato.`;

    // Monta o endpoint
    const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

    const payload = {
      phone: numero,
      message: resposta
    };

    // Envia a resposta
    const apiResponse = await axios.post(url, payload);
    console.log("📤 Resposta enviada com sucesso:", apiResponse.data);

    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Erro ao enviar resposta:", error.response?.data || error.message);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Bot vendedor rodando na porta ${PORT}`);
});
