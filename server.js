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

// Variáveis de ambiente para Z-API e OpenAI  
const instanceId   = process.env.ZAPI_INSTANCE_ID;
const token        = process.env.ZAPI_TOKEN;
const clientToken  = process.env.ZAPI_CLIENT_TOKEN;
const openaiApiKey = process.env.OPENAI_API_KEY;
const zapiUrl      = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

// Função com memória em tempo real via Assistants API + Supabase  
async function obterRespostaAssistenteComMemoria(pergunta, phone) {
  const assistantId = 'asst_KNliRLfxJ8RHSqyULqDCrW45';
  const headers = {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${openaiApiKey}`,
    'OpenAI-Beta':   'assistants=v2'
  };

  // 1) Tenta recuperar thread_id do Supabase  
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

  // 3) Envia a mensagem do usuário na mesma thread  
  await axios.post(
    `https://api.openai.com/v1/threads/${threadId}/messages`,
    { role: 'user', content: pergunta },
    { headers }
  );

  // 4) Executa o Assistente nessa thread  
  const runResp = await axios.post(
    `https://api.openai.com/v1/threads/${threadId}/runs`,
    { assistant_id: assistantId },
    { headers }
  );
  let { id: runId, status } = runResp.data;

  while (status === 'queued' || status === 'in_progress') {
    await new Promise(r => setTimeout(r, 2000));
    const check = await axios.get(
      `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
      { headers }
    );
    status = check.data.status;
  }
  if (status !== 'completed') throw new Error('Erro ao executar o assistente.');

  // 5) Lê e retorna a resposta final  
  const messagesResp = await axios.get(
    `https://api.openai.com/v1/threads/${threadId}/messages`,
    { headers }
  );
  return messagesResp.data.data.slice(-1)[0].content[0].text.value;
}

app.post('/webhook', async (req, res) => {
  try {
    const { fromMe, text, isStatusReply, phone } = req.body;
    const mensagem = text?.message;

    // Filtra mensagens inválidas  
    if (isStatusReply || fromMe || !mensagem || !mensagem.trim()) {
      return res.sendStatus(200);
    }

    console.log("📩 Mensagem recebida de:", phone, "| Conteúdo:", mensagem);

    // Obtém resposta mantendo histórico por usuário  
    const resposta = await obterRespostaAssistenteComMemoria(mensagem, phone);

    // Envia via Z-API  
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
