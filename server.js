// Versão: 1.1.3
require('dotenv').config();
const express = require('express');
const axios   = require('axios');
const dns     = require('dns');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

// Configuração do Pool Postgres forçando IPv4 e desabilitando verificação de certificado
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  lookup: (hostname, options, callback) =>
    dns.lookup(hostname, { family: 4 }, callback),
});

// Variáveis de ambiente Z‑API e OpenAI
const instanceId   = process.env.ZAPI_INSTANCE_ID;
const token        = process.env.ZAPI_TOKEN;
const clientToken  = process.env.ZAPI_CLIENT_TOKEN;
const openaiApiKey = process.env.OPENAI_API_KEY;
const url          = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

// Função ChatGPT
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
  const resp = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    dados,
    { headers }
  );
  return resp.data.choices[0].message.content;
}

app.post('/webhook', async (req, res) => {
  try {
    const { fromMe, text, isStatusReply, phone } = req.body;
    const mensagem = text?.message;

    if (isStatusReply || fromMe || !mensagem || mensagem.trim() === '') {
      return res.sendStatus(200);
    }

    console.log("📩 Mensagem recebida de:", phone, "| Conteúdo:", mensagem);

    const respostaChatGPT = await obterRespostaChatGPT(mensagem);

    const dbResult = await pool.query(
      `INSERT INTO public.messages(phone, user_message, bot_response)
       VALUES($1, $2, $3)`,
      [phone, mensagem, respostaChatGPT]
    );
    console.log(`💾 Gravado no banco: ${dbResult.rowCount} linha(s) inserida(s)`);

    const payload = { phone, message: respostaChatGPT };
    console.log("📤 Enviando payload:", payload);
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
app.listen(PORT, () => {
  console.log(`🚀 Bot vendedor rodando na porta ${PORT}`);
});
