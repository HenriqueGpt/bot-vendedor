// server.js — repassador para o n8n
require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;

app.post('/webhook', async (req, res) => {
  try {
    const { fromMe, text, isStatusReply, phone } = req.body;
    const mensagem = text?.message?.trim();

    // Ignora mensagens vazias, automáticas ou do próprio bot
    if (fromMe || isStatusReply || !mensagem) {
      return res.sendStatus(200);
    }

    console.log(`→ Recebido de ${phone}: ${mensagem}`);

    // Repassa para o n8n
    await axios.post("https://hgptii.app.n8n.cloud/webhook/chat", {
      phone,
      mensagem,
      data: new Date().toISOString()
    });

    return res.sendStatus(200);
  } catch (err) {
    console.error('❌ Erro ao repassar para n8n:',
      err.response?.status, err.response?.data || err.message);
    return res.sendStatus(500);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Bot repassador rodando na porta ${PORT}`);
});
