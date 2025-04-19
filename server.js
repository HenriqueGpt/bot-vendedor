// server.js — Versão: v1.3.0
require('dotenv').config();
console.log('🚀 Iniciando Bot v1.3.0');

const express = require('express');
const axios   = require('axios');
const https   = require('https');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const {
  DATABASE_URL,
  ZAPI_INSTANCE_ID: instanceId,
  ZAPI_TOKEN: token,
  ZAPI_CLIENT_TOKEN: clientToken,
  OPENAI_API_KEY: openaiApiKey,
  PORT = 10000
} = process.env;

console.log('📦 DATABASE_URL:', DATABASE_URL);
console.log('🔑 ZAPI_CLIENT_TOKEN:', clientToken);

// HTTPS Agent para OpenAI e Z‑API
const httpsAgent = new https.Agent({ keepAlive: true });

// Pool PostgreSQL usando Direct Connection do Supabase
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const zapiUrl = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

async function obterRespostaChatGPT(pergunta) {
  const resp = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: pergunta }],
      temperature: 0.7,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      httpsAgent
    }
  );
  return resp.data.choices[0].message.content;
}

app.post('/webhook', async (req, res) => {
  try {
    const { fromMe, isStatusReply, text, phone } = req.body;
    const mensagem = text?.message;
    if (fromMe || isStatusReply || !mensagem) return res.sendStatus(200);

    console.log(`📩 Mensagem recebida de: ${phone} | Conteúdo: ${mensagem}`);

    // 1) Gera resposta do ChatGPT
    const botReply = await obterRespostaChatGPT(mensagem);

    // 2) Persiste no banco
    const { rowCount } = await pool.query(
      `INSERT INTO public.messages(phone, user_message, bot_response)
       VALUES($1, $2, $3)`,
      [phone, mensagem, botReply]
    );
    console.log(`💾 Gravado no banco: ${rowCount} linha(s)`);

    // 3) Envia pela Z‑API com Client‑Token
    console.log('📤 Enviando payload:', { phone, message: botReply });
    await axios.post(
      zapiUrl,
      { phone, message: botReply },
      {
        headers: {
          'Content-Type': 'application/json',
          'Client-Token': clientToken
        },
        httpsAgent
      }
    );
    console.log('✅ Mensagem enviada com sucesso.');

    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Erro ao enviar resposta:', err.response?.data || err.message);
    res.sendStatus(500);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Bot rodando na porta ${PORT}`);
});
