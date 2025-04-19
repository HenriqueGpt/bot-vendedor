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

// Variáveis Z-API e OpenAI
const instanceId   = process.env.ZAPI_INSTANCE_ID;
const token        = process.env.ZAPI_TOKEN;
const clientToken  = process.env.ZAPI_CLIENT_TOKEN;
const openaiApiKey = process.env.OPENAI_API_KEY;
const zapiUrl      = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

// Extrai texto de estruturas de content
function extractMessageText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map(seg => {
      if (typeof seg === 'string') return seg;
      if (seg.text && typeof seg.text.value === 'string') return seg.text.value;
      if (typeof seg.content === 'string') return seg.content;
      return '';
    }).join('');
  }
  return '';
}

// Função principal: gerencia histórico, nome, data e avaliação
async function obterResposta(pergunta, phone) {
  const assistantId = 'asst_KNliRLfxJ8RHSqyULqDCrW45';
  const headers     = {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${openaiApiKey}`,
    'OpenAI-Beta':   'assistants=v2'
  };

  // 1) Recupera registro do usuário
  let { data: user, error } = await supabase
    .from('user_threads')
    .select('*')
    .eq('phone', phone)
    .single();
  if (error && error.code !== 'PGRST116') throw error;

  // 2) Primeiro contato: grava nome e responde saudação
  if (!user || !user.name) {
    if (user) {
      await supabase
        .from('user_threads')
        .update({ name: pergunta })
        .eq('phone', phone);
    } else {
      await supabase
        .from('user_threads')
        .insert({ phone, name: pergunta });
    }
    return `Prazer em conhecê-lo, ${pergunta}! Como posso ajudar você hoje?`;
  }

  // 3) Captura avaliação final: “AVALIACAO: X”
  if (/^AVALIACAO:\s*\d+/.test(pergunta.toUpperCase())) {
    const nota = parseInt(pergunta.split(':')[1], 10);
    await supabase
      .from('user_threads')
      .update({ rating: nota })
      .eq('phone', phone);
    return `Obrigado pela avaliação de ${nota} estrelas!`;
  }

  // 4) Atualiza data da última conversa
  await supabase
    .from('user_threads')
    .update({ last_conversation: new Date().toISOString() })
    .eq('phone', phone);

  // 5) Thread per user: cria ou recupera threadId
  let threadId = user.thread_id;
  if (!threadId) {
    const threadResp = await axios.post(
      'https://api.openai.com/v1/threads',
      {}, { headers }
    );
    threadId = threadResp.data.id;
    await supabase
      .from('user_threads')
      .update({ thread_id: threadId })
      .eq('phone', phone);
  }

  // 6) Envia pergunta ao Assistente
  await axios.post(
    `https://api.openai.com/v1/threads/${threadId}/messages`,
    { role: 'user', content: pergunta },
    { headers }
  );

  // 7) Executa o run
  let run = await axios.post(
    `https://api.openai.com/v1/threads/${threadId}/runs`,
    { assistant_id: assistantId },
    { headers }
  );
  let { id: runId, status } = run.data;
  while (status !== 'completed') {
    await new Promise(r => setTimeout(r, 1000));
    run = await axios.get(
      `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
      { headers }
    );
    status = run.data.status;
  }

  // 8) Recupera mensagens e extrai última do assistant
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

    // Logs simplificados
    console.log(`← ${phone}: ${mensagem}`);

    const resposta = await obterResposta(mensagem, phone);

    console.log(`→ ${phone}: ${resposta}`);

    // Envia via Z-API
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
