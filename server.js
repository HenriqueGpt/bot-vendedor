// Versão: 1.0.5 (com Client-Token no cabeçalho)

const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

app.post('/webhook', async (req, res) => {
  try {
    const numero = req.body.phone;
    const mensagem = req.body?.text?.message;

    console.log("📩 Mensagem recebida de:", numero, "| Conteúdo:", mensagem);

    if (!mensagem || mensagem.trim() === '') {
      console.log("❌ Mensagem vazia ou inválida.");
      return res.sendStatus(200);
    }

    const instanceId = process.env.ZAPI_INSTANCE_ID;
    const clientToken = process.env.CLIENT_TOKEN;

    const resposta = `Olá! Recebemos sua mensagem: "${mensagem}". Em breve um vendedor entrará em contato.`;

    const url = `https://api.z-api.io/instances/${instanceId}/send-text`;

    const payload = {
      phone: numero,
      message: resposta,
    };

    const headers = {
      'Client-Token': clientToken,
      'Content-Type': 'application/json',
    };

    await axios.post(url, payload, { headers });
    console.log("✅ Mensagem enviada com sucesso.");

    res.sendStatus(200);
  } catch (erro) {
    console.error("❌ Erro ao enviar resposta:", erro.response?.data || erro.message);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Bot vendedor rodando na porta ${PORT}`);
});
