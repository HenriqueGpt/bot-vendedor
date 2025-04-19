// server.js — Versão: v1.2.2
require('dotenv').config();
// Desabilita verificação de certificado em todo o Node.js (apenas em dev)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const express = require('express');
const axios   = require('axios');
const https   = require('https');
const dns     = require('dns');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

// Agente HTTPS que ignora validação de certificado
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// Pool Postgres (Supabase Transaction Pooler) forçando IPv4 e ignorando verificação SSL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  lookup: (hostname, options, callback) =>
    dns.lookup(hostname, { family: 4 }, callback),
});

const {
  ZAPI_INSTANCE_ID: instanceId,
  ZAPI_TOKEN: token,
  OPENAI_API_KEY: openaiApiKey
} = process.env;

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
    const { fromMe, text, isStatusReply, phone } = req.body;
    const msg = text?.message?.trim();
    if (isStatusReply || fromMe || !msg) return res.sendStatus(200);

    console.log(`📩 Mensagem recebida de: ${phone} | Conteúdo: ${msg}`);

    // 1) ChatGPT
    const botReply = await obterRespostaChatGPT(msg);

    // 2) Grava no banco
    const { rowCount } = await pool.query(
      `INSERT INTO public.messages(phone, user_message, bot_response)
       VALUES($1, $2, $3)`,
      [phone, msg, botReply]
    );
    console.log(`💾 Gravado no banco: ${rowCount} linha(s)`);

    // 3) Envia pela Z‑API, usando o mesmo agente HTTPS
    console.log('📤 Enviando payload:', { phone, message: botReply });
    await axios.post(
      zapiUrl,
      { phone, message: botReply },
      { httpsAgent }
    );
    console.log('✅ Mensagem enviada com sucesso.');

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
