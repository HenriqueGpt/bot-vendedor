// Versão: 1.0.8
require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// Variáveis de ambiente
const instanceId   = process.env.ZAPI_INSTANCE_ID;
const token        = process.env.ZAPI_TOKEN;
const clientToken  = process.env.ZAPI_CLIENT_TOKEN;   // Account Security Token da Z‑API
const openaiApiKey = process.env.OPENAI_API_KEY;
const botNumber    = process.env.ROBOT_NUMBER;        // Ex: "5531972361753"
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
    const numero   = req.body.phone;
    const mensagem = req.body?.text?.message;

    // Filtra: sem mensagem ou vinda do próprio robô => ignora
    if (!mensagem || mensagem.trim() === '' || numero === botNumber) {
      return res.sendStatus(200);
    }

    console.log("📩 Mensagem recebida de:", numero, "| Conteúdo:", mensagem);

    // Gera resposta do ChatGPT
    const respostaChatGPT = await obterRespostaChatGPT(mensagem);

    const payload = {
      phone: numero,
      message: respostaChatGPT,
    };

    console.log("📤 Enviando payload:", payload);

    // Configura headers adicionais se houver clientToken
    const config = clientToken
      ? { headers: { 'Client-Token': clientToken } }
      : {};

    const respostaApi = await axios.post(url, payload, config);
    console.log("✅ Mensagem enviada com sucesso. Resposta API:", respostaApi.data);

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
