require('dotenv').config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const express = require('express');
const axios   = require('axios');
const https   = require('https');
const dns     = require('dns');
const { Pool } = require('pg');

const {
  DATABASE_URL,
  ZAPI_INSTANCE_ID,
  ZAPI_TOKEN,
  ZAPI_CLIENT_TOKEN,
  OPENAI_API_KEY,
  PORT = 10000
} = process.env;

console.log('🚀 Iniciando Bot v1.3.2');
console.log('📦 DATABASE_URL:', DATABASE_URL);
console.log('🔑 ZAPI_CLIENT_TOKEN:', ZAPI_CLIENT_TOKEN);

const app = express();
app.use(express.json());

// HTTPS Agent que ignora certificado
const httpsAgent = new https.Agent({ keepAlive: true, rejectUnauthorized: false });

// Pool PostgreSQL com channelBinding desabilitado
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  lookup: (host, opts, cb) => dns.lookup(host, { family: 4 }, cb),
  channelBinding: 'disable'
});

// URL da Z‑API (endpoint correto)
const zapiUrl = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/sendText`;

async function obterRespostaChatGPT(pergunta) {
  const resp = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: pergunta }],
      temperature: 0.7
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      httpsAgent
    }
  );
  return resp.data.choices[0].message.content;
}

app.post('/webhook', async (req, res) => {
  try {
    const { fromMe, isStatusReply, text, phone } = req.body;
    const msg = text?.message?.trim();
    if (fromMe || isStatusReply || !msg) return res.sendStatus(200);

    console.log(`📩 Mensagem recebida de: ${phone} | Conteúdo: ${msg}`);

    const botReply = await obterRespostaChatGPT(msg);

    const { rowCount } = await pool.query(
      `INSERT INTO public.messages(phone, user_message, bot_response) VALUES($1, $2, $3)`,
      [phone, msg, botReply]
    );
    console.log(`💾 Gravado no banco: ${rowCount} linha(s)`);

    console.log('📤 Enviando payload:', { phone, message: botReply });
    const zapiResp = await axios.post(
      zapiUrl,
      { phone, message: botReply },
      {
        headers: {
          'Content-Type': 'application/json',
          'Client-Token': ZAPI_CLIENT_TOKEN
        },
        httpsAgent
      }
    );
    console.log('✅ Z‑API response:', zapiResp.data);
    console.log('✅ Mensagem enviada com sucesso.');

    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Erro ao enviar resposta:', err.response?.data ?? err.message);
    res.sendStatus(err.response?.status || 500);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Bot rodando na porta ${PORT}`);
});
