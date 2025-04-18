// server.js — Versão 11.0

const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json()); // Essencial para ler req.body

app.post('/webhook', async (req, res) => {
  try {
    const numero = req.body.phone || req.body.from;
    const msg = req.body.text?.message || req.body.message?.body;

    console.log('✅ Mensagem recebida de:', numero, '| Conteúdo:', msg);

    const instanceId = process.env.ZAPI_INSTANCE_ID;
    const token = process.env.ZAPI_TOKEN;

    const resposta = `Recebemos sua mensagem: "${msg}". Um vendedor responderá em breve.`;

    const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

    const payload = {
      phone: numero,
      message: resposta
    };

    const headers = {
      'Content-Type': 'application/json',
      'Client-Token': token // Header obrigatório da Z-API
    };

    const r = await axios.post(url, payload, { headers });

    console.log('📤 Resposta enviada com sucesso para', numero);
    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Erro ao enviar resposta:', err.response?.data || err.message);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Bot vendedor rodando na porta ${PORT}`);
});
