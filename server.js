require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 10000;

app.post('/webhook', async (req, res) => {
  try {
    const msg = req.body.message?.body;
    const numero = req.body.key?.remoteJid;

    console.log("📥 Mensagem recebida de:", numero, "| Conteúdo:", msg);

    // Logs das variáveis de ambiente
    const instanceId = process.env.ZAPI_INSTANCE_ID;
    const token = process.env.ZAPI_TOKEN;

    console.log("🔐 INSTÂNCIA:", instanceId);
    console.log("🔐 TOKEN:", token);

    const resposta = `Olá! Recebemos sua mensagem: "${msg}". Em breve um vendedor entrará em contato.`;

    const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;
    const payload = {
      phone: numero.split('@')[0],
      message: resposta,
    };

    const respostaApi = await axios.post(url, payload);
    console.log("📤 Mens
