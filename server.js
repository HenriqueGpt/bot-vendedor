// Versão 1.0.7 - Corrige envio para Z-API com Client-Token no header

const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json()); // Habilita leitura do body em JSON

app.post('/webhook', async (req, res) => {
  try {
    const numero = req.body.phone;
    const msg = req.body.text?.message;

    console.log(`✅ Mensagem recebida de: ${numero} | Conteúdo: ${msg}`);

    const instanceId = process.env.ZAPI_INSTANCE_ID;
    const token = process.env.ZAPI_TOKEN;

    console.log("🔍 Verificando variáveis de ambiente:");
    console.log(`- ID: ${instanceId}`);
    console.log(`- TOKEN: ${token}`);

    if (!instanceId || !token) {
      console.error('❌ Erro: Variáveis de ambiente não definidas.');
      return res.sendStatus(500);
    }

    const resposta = `Olá! Recebemos sua mensagem: "${msg}". Em breve um vendedor entrará em contato.`;

    const url = `https://api.z-api.io/instances/${instanceId}/send-text`;

    const headers = {
      'Content-Type': 'application/json',
      'Client-Token': token,
    };

    const payload = {
      phone: numero,
      message: resposta,
    };

    await axios.post(url, payload, { headers });

    console.log(`✅ Resposta enviada com sucesso para ${numero}`);
    res.sendStatus(200);

  } catch (err) {
    console.error('❌ Erro ao enviar resposta:', err.response?.data || err.message || err);
    res.sendStatus(500);
  }
});

const PORT = 10000;
app.listen(PORT, () => {
  console.log(`🚀 Bot vendedor rodando na porta ${PORT}`);
});
