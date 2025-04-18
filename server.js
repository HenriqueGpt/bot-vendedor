// Versão: 1.0.7
require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// Variáveis de ambiente
const instanceId     = process.env.ZAPI_INSTANCE_ID;
const token          = process.env.ZAPI_TOKEN;
const clientToken    = process.env.ZAPI_CLIENT_TOKEN;   // Account Security Token da Z‑API
const openaiApiKey   = process.env.OPENAI_API_KEY;
const url            = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

// Função para obter resposta do ChatGPT
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

  const respostaOpenAI = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    dados,
    { headers }
  );

  return respostaOpenAI.data.choices[0].message.content;
}

app.post('/webhook', async (req, res) => {
  try {
    const numero   = req.body.phone;
    const mensagem = req.body?.text?.message;

    console.log("📩 Mensagem recebida de:", numero, "| Conteúdo:", mensagem);

    if (!mensagem || mensagem.trim() === '') {
      console.log("❌ Mensagem vazia ou inválida.");
      return res.sendStatus(200);
    }

    // Gera resposta via ChatGPT
    const respostaChatGPT = await obterRespostaChatGPT(mensagem);

    const payload = {
      phone: numero,
      message: respostaChatGPT,
    };

    console.log("📤 Enviando payload:", payload);

    // Chamada à Z‑API, incluindo o header Client-Token se configurado
    const headers = clientToken
      ? { 'Client-Token': clientToken }
      : undefined;

    const respostaApi = await axios.post(url, payload, headers ? { headers } : {});
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
