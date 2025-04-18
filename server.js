// Versão: 1.0.0

const express = require('express');
const axios = require('axios');
const app = express();

// Habilita parsing do corpo em JSON e urlencoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/webhook', async (req, res) => {
  try {
    const numero = req.body.phone || req.body.from || "sem número";
    const msg =
      req.body.message?.body ||
      req.body.body ||
      req.body.message ||
      "Mensagem não detectada";

    console.log("📩 Mensagem recebida de:", numero, "| Conteúdo:", msg);

    // Carrega variáveis do ambiente
    const instanceId = process.env.ZAPI_INSTANCE_ID;
    const token = process.env.ZAPI_TOKEN;

    // Monta a resposta automática
    const resposta = `Olá! Recebemos sua mensagem: "${msg}". Em breve um vendedor entrará em contato.`;

    // Define o endpoint correto da Z-API
    const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

    // Envia mensagem pela Z-API
    await axios.post(url, {
      phone: numero,
      message: resposta,
    });

    console.log("📤 Mensagem enviada com sucesso.");
    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Erro ao processar mensagem:", error.message);
    res.status(500).send("Erro interno do servidor");
  }
});

// Inicia o servidor
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Bot vendedor rodando na porta ${PORT}`);
});
