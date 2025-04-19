require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const express           = require('express');
const axios             = require('axios');

const app = express();
app.use(express.json());

// Inicializa Supabase (server-side)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Variáveis de ambiente Z-API e OpenAI
const instanceId   = process.env.ZAPI_INSTANCE_ID;
const token        = process.env.ZAPI_TOKEN;
const clientToken  = process.env.ZAPI_CLIENT_TOKEN;
const openaiApiKey = process.env.OPENAI_API_KEY;
const zapiUrl      = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

// Função com memória em tempo real e correção na captura da resposta
async function obterRespostaAssistenteComMemoria(pergunta, phone) {
  const assistantId = 'asst_KNliRLfxJ8RHSqyULqDCrW45';
  const headers    = {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${openaiApiKey}`,
    'OpenAI‑Beta':   'assistants=v2'
  };

  // 1) Busca thread existente no Supabase
  const { data, error } = await supabase
    .from('user_threads')
    .select('thread_id')
    .eq('phone', phone)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  let threadId = data?.thread_id;

  // 2) Se não existir, cria thread nova e persiste
  if (!threadId) {
    const threadResp = await axios.post(
      'https://api.openai.com/v1/threads',
      {}, { headers }
    );
    threadId = threadResp.data.id;
    const { error: errInsert } = await supabase
      .from('user_threads')
      .insert({ phone, thread_id: threadId });
    if (errInsert) throw errInsert;
  }

  // 3) Envia a pergunta do usuário na mesma thread
  await axios.post(
    `https://api.openai.com/v1/threads/${threadId}/messages`,
    { role: 'user', content: pergunta },
    { headers }
  );

  // 4) Dispara o run do assistente
  const runResp = await axios.post(
    `https://api.openai.com/v1/threads/${threadId}/runs`,
    { assistant_id: assistantId },
    { headers }
  );
  let { id: runId, status } = runResp.data;

  // 5) Aguarda a execução completar
  while (status === 'queued' || status === 'in_progress') {
    await new Promise(r => setTimeout(r, 2000));
    const chk = await axios.get(
      `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
      { headers }
    );
    status = chk.data.status;
  }
  if (status !== 'completed') throw new Error('Erro ao executar o assistente.');

  // 6) Recupera todas as mensagens da thread
  const msgsResp = await axios.get(
    `https://api.openai.com/v1/threads/${threadId}/messages`,
    { headers }
  );
  console.log("🔖 messagesResp.data.data:", msgsResp.data.data);

  const msgs = msgsResp.data.data;
  // 7) Filtra apenas mensagens de 'assistant' e pega a última
  const assistantMsgs = msgs.filter(m => m.role === 'assistant');
  const last = assistantMsgs[assistantMsgs.length - 1];
  let resposta = '';

  if (last) {
    if (typeof last.content === 'string') {
      resposta = last.content;
    } else if (Array.isArray(last.content) && last.content[0]?.text?.value) {
      resposta = last.content[0].text.value;
    } else if (last.content?.text?.value) {
      resposta = last.content.text.value;
    }
  }

  return resposta;
}

app.post('/webhook', async (req, res) => {
  try {
    const { fromMe, text, isStatusReply, phone } = req.body;
    const mensagem = text?.message;
    if (isStatusReply || fromMe || !mensagem || !mensagem.trim()) {
      return res.sendStatus(200);
    }

    console.log("📩 Mensagem recebida de:", phone, "| Conteúdo:", mensagem);
    const resposta = await obterRespostaAssistenteComMemoria(mensagem, phone);

    const payload = { phone, message: resposta };
    const config  = clientToken
      ? { headers: { 'Client-Token': clientToken } }
      : {};

    console.log("📤 Enviando payload:", payload);
    const respApi = await axios.post(zapiUrl, payload, config);
    console.log("✅ Mensagem enviada:", respApi.data);

    return res.sendStatus(200);
  } catch (erro) {
    console.error("❌ Erro no webhook:", erro.response?.data || erro.message);
    return res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Bot vendedor rodando na porta ${PORT}`);
});
