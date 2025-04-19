// server.js — Versão: v1.3.2 (corrigido)
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

 const httpsAgent = new https.Agent({ keepAlive: true, rejectUnauthorized: false });

 const pool = new Pool({
   connectionString: DATABASE_URL,
   ssl: { rejectUnauthorized: false },
   lookup: (host, opts, cb) => dns.lookup(host, { family: 4 }, cb),
   channelBinding: 'disable'
 });

-// URL da Z‑API  
-const zapiUrl = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;  
+// URL da Z‑API (endpoint correto)  
+const zapiUrl = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/sendText`;

 async function obterRespostaChatGPT(pergunta) {
   // … (mesmo que antes) …
 }

 app.post('/webhook', async (req, res) => {
   try {
     // … (mesmo que antes) …

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
-    console.error('❌ Erro ao enviar resposta:', err.response?.data || err.message);
+    console.error('❌ Erro ao enviar resposta:', err.response?.data ?? err.message);
     res.sendStatus(err.response?.status || 500);
   }
 });

 app.listen(PORT, () => {
   console.log(`🚀 Bot rodando na porta ${PORT}`);
 });
