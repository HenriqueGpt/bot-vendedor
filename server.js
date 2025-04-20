require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const express           = require('express');
const axios             = require('axios');

const app = express();
app.use(express.json());

// Inicializa Supabase (server‑side)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Variáveis Z‑API e OpenAI
const instanceId   = process.env.ZAPI_INSTANCE_ID;
const token        = process.env.ZAPI_TOKEN;
const clientToken  = process.env.ZAPI_CLIENT_TOKEN;
const openaiApiKey = process.env.OPENAI_API_KEY;
const zapiUrl      = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

// Extrai texto simples de content
function extractMessageText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map(seg => seg.text?.value || seg.content || '').join('');
  }
  return '';
}

// Gera resposta via Assistants API mantendo apenas threadId
async function obterResposta(pergunta, phone) {
  const assistantId = 'asst_KNliRLfxJ8RHSqyULqDCrW45';
  const headers     = {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${openaiApiKey}`,
    'OpenAI-Beta':   'assistants=v2'
  };

  // Recupera ou cria threadId para este telefone
  let { data, error } = await supabase
    .from('user_threads')
    .select('thread_id')
    .eq('phone', phone)
    .single();
  if (error && error.code !== 'PGRST116') throw error;

  let threadId = data?.thread_id;
  if (!threadId) {
    const threadResp = await axios.post(
      'https://api.openai.com/v1/threads',
      {}, { headers }
    );
    threadId = threadResp.data.id;
    await supabase
      .from('user_threads')
      .insert({ phone, thread_id: threadId });
  }

  // Envia a pergunta e executa o run
  await axios.post(
    `https://api.openai.com/v1/threads/${threadId}/messages`,
    { role: 'user', content: pergunta },
    { headers }
  );
  let run = await axios.post(
    `https://api.openai.com/v1/threads/${threadId}/runs`,
    { assistant_id: assistantId },
    { headers }
  );

  // Aguarda conclusão
  let { id: runId, status } = run.data;
  while (status !== 'completed') {
    await new Promise(r => setTimeout(r, 1000));
    run = await axios.get(
      `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
      { headers }
    );
    status = run.data.status;
  }

  // Busca última mensagem do assistant
  const msgs = (await axios.get(
    `https://api.openai.com/v1/threads/${threadId}/messages`,
    { headers }
  )).data.data;
  const last = msgs.filter(m => m.role === 'assistant').pop();
  return last ? extractMessageText(last.content) : '';
}

app.post('/webhook', async (req, res) => {
  try {
    const { fromMe, text, isStatusReply, phone } = req.body;
    const mensagem = text?.message?.trim();
    if (fromMe || isStatusReply || !mensagem) return res.sendStatus(200);

    console.log(`← ${phone}: ${mensagem}`);
    const resposta = await obterResposta(mensagem, phone);
    console.log(`→ ${phone}: ${resposta}`);

    await axios.post(
      zapiUrl,
      { phone, message: resposta },
      clientToken ? { headers: { 'Client-Token': clientToken } } : {}
    );

    res.sendStatus(200);
  } catch (err) {
    console.error('Erro no webhook:', err.message);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Bot rodando na porta ${PORT}`));
