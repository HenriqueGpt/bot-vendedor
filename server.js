// server.js — Versão: 1.1.5
require('dotenv').config();

// ** Atenção **: desabilita checagem de certificado (somente em ambiente de dev)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const express = require('express');
const axios   = require('axios');
const https   = require('https');
const dns     = require('dns');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

// usa um https.Agent que ignora rejeição de certificado
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// pool Postgres forçando IPv4 e SSL sem checar certificado
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  lookup: (hostname, options, callback) =>
    dns.lookup(hostname, { family: 4 }, callback),
});

// Z‑API + OpenAI
const instanceId   = process.env.ZAPI_INSTANCE_ID;
const token        = process.env.ZAPI_TOKEN;
const clientToken  = process.env.ZAPI_CLIENT_TOKEN;
const openaiApiKey = process.env.OPENAI_API_KEY;
const zapiUrl      = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

async function obterRespostaChatGPT(pergunta) {
  const resp = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    { model: 'gpt-3.5-turbo', messages: [{ role: 'user', content: pergunta }] },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      httpsAgent
    }
  );
  return resp.data.choices[0].message.content;
}

app.post('/webhook', async (req, res) => {
  try {
    const { fromMe, text, isStatusReply, phone } = req.body;
    const msg = text?.message?.trim();
    if (fromMe || isStatusReply || !msg) return res.sendStatus(200);

    console.log(`📩 Mensagem recebida de: ${phone} | Conteúdo: ${msg}`);

    // 1) Gera resposta no ChatGPT
    const botReply = await obterRespostaChatGPT(msg);

    // 2) Persiste no Postgres
    const { rowCount } = await pool.query(
      `INSERT INTO public.messages(phone, user_message, bot_response)
       VALUES($1, $2, $3)`,
      [phone, msg, botReply]
    );
    console.log(`💾 Gravado no banco: ${rowCount} linha(s)`);

    // 3) Dispara pela Z‑API
    const zapiConfig = {
      httpsAgent,
      headers: { 'Client-Token': clientToken }
    };
    console.log('📤 Enviando payload:', { phone, message: botReply });
    const zapiResp = await axios.post(
      zapiUrl,
      { phone, message: botReply },
      zapiConfig
    );
    console.log('✅ Mensagem enviada. Z‑API respondeu:', zapiResp.data);

    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Erro ao enviar resposta:', err.response?.data || err.message);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Bot vendedor rodando na porta ${PORT}`);
});
