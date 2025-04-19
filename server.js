// server.js — Versão: 1.0.9
require('dotenv').config();
const express = require('express');
const axios   = require('axios');

const app = express();
app.use(express.json());

// Variáveis de ambiente
const instanceId   = process.env.ZAPI_INSTANCE_ID;
const token        = process.env.ZAPI_TOKEN;
const clientToken  = process.env.ZAPI_CLIENT_TOKEN;   // Account Security Token da Z‑API
const openaiApiKey = process.env.OPENAI_API_KEY;
const url          = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

// Função para gerar resposta via ChatGPT
async function obterRespostaChatGPT(pergunta) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${openaiApiKey}`
  };
  const dados = {
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: pergunta }],
    temperature: 0.7,
  };
  const resposta = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    dados,
    { headers }
  );
  return resposta.data.choices[0].message.content;
}

app.post('/webhook', async (req, res) => {
  try {
    const { fromMe, text, isStatusReply } = req.body;
    const mensagem = text?.message;

    // 1) Filtrar:
    // • Ignorar status reply (resposta de entrega)
    // • Ignorar mensagens enviadas pelo próprio bot (fromMe=true)
    if (isStatusReply || fromMe || !mensagem || mensagem.trim() === '') {
      return res.sendStatus(200);
    }

    // 2) Processar mensagem do usuário
    const numero = req.body.phone;
    console.log("📩 Mensagem recebida de:", numero, "| Conteúdo:", mensagem);

    const respostaChatGPT = await obterRespostaChatGPT(mensagem);

    const payload = {
      phone: numero,
      message: respostaChatGPT,
    };
    console.log("📤 Enviando payload:", payload);

    // 3) Chamada à Z‑API (com header Client-Token se configurado)
    const config = clientToken
      ? { headers: { 'Client-Token': clientToken } }
      : {};
    const respostaApi = await axios.post(url, payload, config);
    console.log("✅ Mensagem enviada com sucesso. Resposta API:", respostaApi.data);

    return res.sendStatus(200);
  } catch (erro) {
    console.error("❌ Erro ao enviar resposta:", erro.response?.data || erro.message);
    return res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () =>
