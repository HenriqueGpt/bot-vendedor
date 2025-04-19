// server.js — Versão: 1.1.5
require('dotenv').config();
// força aceitar certificados self‑signed (se você confia na conexão)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const express = require('express');
const axios   = require('axios');
const https   = require('https');
const dns     = require('dns');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

// agente HTTPS que ignora verificação de certificado
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// configura pool do Postgres (IPv4 + SSL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  lookup: (hostname, options, cb) => dns.lookup(hostname, { family: 4 }, cb),
});

// Z‑API e OpenAI
const instanceId   = process.env.ZAPI_INSTANCE_ID;
const token        = process.env.ZAPI_TOKEN;
const openaiApiKey = process.env.OPENAI_API_KEY;

// URL de envio de texto na Z‑API
const zapiUrl = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

// gera resposta do ChatGPT
async function obterRespostaChatGPT(pergunta) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${openaiApiKey}`
  };
  const body = {
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: pergunta }],
    temperature: 0.7,
  };
  const resp = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    body,
    { headers, httpsAgent }
  );
  return resp.data.choices[0].message.content;
}

app.post('/webhook', async (req, res) => {
  try {
    const { fromMe, text, isStatusReply, phone } = req.body;
    const mensagem = text?.message;

    // ignora mensagens de sistema, vazias ou enviadas pelo bot
    if (isStatusReply || fromMe || !mensagem?.trim()) {
      return res.sendStatus(200);
    }

    console.log("📩 Mensagem recebida de:", phone, "| Conteúdo:", mensagem);

    // 1) Resposta do ChatGPT
    const respostaChatGPT = await obterRespostaChatGPT(mensagem);

    // 2) Grava no banco
    const { rowCount } = await pool.query(
      `INSERT INTO public.messages(phone, user_message, bot_response)
       VALUES($1, $2, $3)`,
      [phone, mensagem, respostaChatGPT]
    );
    console.log(`💾 Gravado no banco: ${rowCount} linha(s)`);

    // 3) Envia pela Z‑API (sem cabeçalhos extras)
    console.log("📤 Enviando payload:", { phone, message: respostaChatGPT });
    await axios.post(zapiUrl, { phone, message: respostaChatGPT }, { httpsAgent });
    console.log("✅ Mensagem enviada com sucesso.");
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
