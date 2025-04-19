// Versão: 1.2.0
require('dotenv').config();

// ⚠️ Para ambientes com certificado self‑signed
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const express = require('express');
const axios   = require('axios');
const https   = require('https');
const dns     = require('dns');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

// — Agente HTTPS que ignora verificação de certificado —
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// — Pool PostgreSQL (força IPv4 + SSL) —
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  lookup: (hostname, options, callback) =>
    dns.lookup(hostname, { family: 4 }, callback),
});

// — Variáveis de ambiente Z‑API e OpenAI —
const instanceId   = process.env.ZAPI_INSTANCE_ID;
const token        = process.env.ZAPI_TOKEN;
const clientToken  = process.env.ZAPI_CLIENT_TOKEN;
const openaiApiKey = process.env.OPENAI_API_KEY;
const PORT         = process.env.PORT || 10000;

// URL da Z‑API
const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

// 🔍 Debug: imprima na inicialização
console.log('🔑 ZAPI_CLIENT_TOKEN:', clientToken);
console.log('🌐 DATABASE_URL:', process.env.DATABASE_URL);

// — Função para chamar o ChatGPT via OpenAI API —
async function obterRespostaChatGPT(pergunta) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${openaiApiKey}`,
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
    const { fromMe, isStatusReply, text, phone } = req.body;
    const mensagem = text?.message;

    // — Filtrar mensagens sem conteúdo, status ou do próprio bot —
    if (fromMe || isStatusReply || !mensagem || mensagem.trim() === '') {
      return res.sendStatus(200);
    }

    console.log(`📩 Mensagem recebida de: ${phone} | Conteúdo: "${mensagem}"`);

    // 1️⃣ Obter resposta do ChatGPT
    const respostaChatGPT = await obterRespostaChatGPT(mensagem);

    // 2️⃣ Gravar no banco de dados
    const insertResult = await pool.query(
      `INSERT INTO public.messages(phone, user_message, bot_response)
       VALUES($1, $2, $3)`,
      [phone, mensagem, respostaChatGPT]
    );
    console.log(`💾 Gravado no banco: ${insertResult.rowCount} linha(s)`);

    // 3️⃣ Enviar resposta pela Z‑API (com o Client‑Token)
    const payload = { phone, message: respostaChatGPT };
    console.log('📤 Enviando payload:', payload);

    const axiosConfig = {
      httpsAgent,
      headers: clientToken
        ? { 'Client-Token': clientToken }
        : undefined
    };

    const apiResp = await axios.post(url, payload, axiosConfig);
    console.log('✅ Mensagem enviada com sucesso. Resposta API:', apiResp.data);

    return res.sendStatus(200);
  } catch (err) {
    console.error('❌ Erro ao enviar resposta:', err.response?.data || err.message);
    return res.sendStatus(500);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Bot vendedor rodando na porta ${PORT}`);
});
