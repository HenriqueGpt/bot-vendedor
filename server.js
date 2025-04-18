const express = require('express');
const axios = require('axios');
const app = express();

// Essencial para o req.body funcionar
app.use(express.json());

app.post('/webhook', async (req, res) => {
  try {
    const numero = req.body.phone;
    const msg = req.body.text?.message;

    if (!numero || !msg) {
      console.log("❌ Mensagem inválida recebida:", req.body);
      return res.sendStatus(400);
    }

    console.log("✅ Mensagem recebida de:", numero, "| Conteúdo:", msg);

    const instanceId = process.env.ZAPI_INSTANCE_ID;
    const token = process.env.ZAPI_TOKEN;

    const resposta = `Olá! Recebemos sua mensagem: "${msg}". Em breve um vendedor entrará em contato.`;

    const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-message`;

    await axios.post(url, {
      phone: numero,
      message: resposta
    });

    res.sendStatus(200);
  } catch (erro) {
    console.error("❌ Erro ao processar mensagem:", erro.message);
    res.sendStatus(500);
  }
});

const PORT = 10000;
app.listen(PORT, () => {
  console.log(`🚀 Bot vendedor rodando na porta ${PORT}`);
});
