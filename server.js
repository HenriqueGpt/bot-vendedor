const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

app.post('/webhook', async (req, res) => {
  try {
    const numero = req.body.phone;
    const msg = req.body.message.body;

    console.log("Mensagem recebida de:", numero, "Conteúdo:", msg);

    // Carrega variáveis de ambiente
    const instanceId = process.env.ZAPI_INSTANCE_ID;
    const token = process.env.ZAPI_TOKEN;

    // Monta a resposta
    const resposta = `Olá! Recebemos sua mensagem: "${msg}". Em breve um vendedor entrará em contato.`;

    // Monta o endpoint da Z-API
    const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

    // Envia resposta via Z-API
    await axios.post(url, {
      phone: numero,
      message: resposta
    });

    console.log("Mensagem enviada com sucesso para", numero);
    res.sendStatus(200);
  } catch (error) {
    console.error("Erro ao processar mensagem:", error.response?.data || error.message);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Bot vendedor rodando na porta ${PORT}`);
});
