// Versão 1.0.9 - Corrige token enviado no cabeçalho HTTP

const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

app.post('/webhook', async (req, res) => {
  try {
    const numero = req.body.phone;
    const msg = req.body.text?.message;

    console.log(`✅ Mensagem recebida de: ${numero} | Conteúdo: ${msg}`);

    const instanceId = process.env.ZAPI_INSTANCE_ID;
    const token = process.env.ZAPI_TOKEN;

    const resposta = `Olá! Recebemos sua mensagem: "${msg}". Em breve um vendedor entrará em contato.`;

    // ✅ NOVO ENDPOINT (sem token na URL)
    const url = `https://api.z-api.io/instances/${instanceId}/send-text`;

    const payload = {
      phone: numero,
      message: resposta
    };

    const headers = {
      'Content-Type': 'application/json',
      'Client-Token': token // ✅ Aqui agora está certo!
    };

    const result = await axios.post(url, payload, { headers });

    console.log(`📤 Resposta enviada com sucesso para ${numero}`);
    res.sendStatus(200);

  } catch (err) {
    console.error('❌ Erro ao enviar resposta:', err.response?.data || err.message);
    res.sendStatus(500);
  }
});

const PORT = 10000;
app.listen(PORT, () => {
  console.log(`🚀 Bot vendedor rodando na porta ${PORT}`);
});
