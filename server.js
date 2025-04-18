// server.js — versão 11.2
const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

app.post('/webhook', async (req, res) => {
  try {
    const numero = req.body.phone;
    const msg = req.body.message?.body || req.body.text?.message || "Mensagem não detectada";

    console.log(`✅ Mensagem recebida de: ${numero} | Conteúdo: ${msg}`);

    // Carrega variáveis de ambiente
    const instanceId = process.env.ZAPI_INSTANCE_ID;
    const token = process.env.ZAPI_TOKEN;

    console.log("🔍 Verificando variáveis de ambiente:");
    console.log("- ID:", instanceId);
    console.log("- TOKEN:", token);

    const resposta = `🤖 Olá! Recebemos sua mensagem: "${msg}"`;

    const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

    const payload = {
      phone: numero,
      message: resposta
    };

    const headers = {
      'Content-Type': 'application/json',
      'Client-Token': token  // cabeçalho necessário
    };

    const envio = await axios.post(url, payload, { headers });

    if (envio.data?.message) {
      console.log(`📤 Resposta enviada com sucesso para ${numero}`);
    } else {
      console.log(`⚠️ Retorno inesperado da Z-API:`, envio.data);
    }

    res.sendStatus(200);

  } catch (err) {
    console.error("❌ Erro ao enviar resposta:", err.response?.data || err.message || err);
    res.sendStatus(500);
  }
});

app.listen(10000, () => {
  console.log("🚀 Bot vendedor rodando na porta 10000");
});
