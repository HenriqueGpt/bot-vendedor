require('dotenv').config();

const express = require('express');
const axios   = require('axios');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

// In-memory buffer of conversations per phone
const conversations = {};

// Supabase client (only used when saving final conversation)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Z-API endpoint and tokens
const zapiUrl     = `https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}` +
                    `/token/${process.env.ZAPI_TOKEN}/send-text`;
const clientToken = process.env.ZAPI_CLIENT_TOKEN;

// Your Assistant ID
const assistantId = 'asst_KNliRLfxJ8RHSqyULqDCrW45';
const openaiKey   = process.env.OPENAI_API_KEY;

// Helper to extract text from Assistants API content arrays
function extractMessageText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map(seg => {
      if (typeof seg === 'string') return seg;
      if (seg.text?.value)       return seg.text.value;
      if (typeof seg.content === 'string') return seg.content;
      return '';
    }).join('');
  }
  return '';
}

// Call your Assistant via the Threads API
async function callAssistant(question) {
  const headers = {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${openaiKey}`,
    'OpenAI-Beta':   'assistants=v2'
  };

  // create thread
  const { data: thread } = await axios.post(
    'https://api.openai.com/v1/threads', {}, { headers }
  );

  // send user message
  await axios.post(
    `https://api.openai.com/v1/threads/${thread.id}/messages`,
    { role: 'user', content: question },
    { headers }
  );

  // run assistant
  let { data: run } = await axios.post(
    `https://api.openai.com/v1/threads/${thread.id}/runs`,
    { assistant_id: assistantId },
    { headers }
  );

  while (run.status !== 'completed') {
    await new Promise(r => setTimeout(r, 1000));
    const chk = await axios.get(
      `https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`,
      { headers }
    );
    run = chk.data;
  }

  // fetch messages and return last assistant reply
  const { data: msgs } = await axios.get(
    `https://api.openai.com/v1/threads/${thread.id}/messages`,
    { headers }
  );
  const assistantMsgs = msgs.data.filter(m => m.role === 'assistant');
  const last = assistantMsgs.pop();
  return last ? extractMessageText(last.content) : '';
}

app.post('/webhook', async (req, res) => {
  try {
    const { fromMe, text, isStatusReply, phone } = req.body;
    const mensagem = text?.message?.trim();
    if (fromMe || isStatusReply || !mensagem) {
      return res.sendStatus(200);
    }

    console.log(`← ${phone}: ${mensagem}`);

    // Initialize buffer for this phone
    if (!conversations[phone]) {
      conversations[phone] = [];
    }

    if (mensagem === '099') {
      // Final marker: save conversation buffer
      const convo = conversations[phone];
      const formatted = convo
        .map(pair => `User: ${pair.user}\nBot: ${pair.bot}`)
        .join('\n\n');

      await supabase
        .from('conversations')
        .insert({
          phone,
          conversation: formatted,
          created_at: new Date().toISOString()
        });

      console.log(`→ ${phone}: Conversa salva com sucesso!`);
      await axios.post(
        zapiUrl,
        { phone, message: 'Conversa salva com sucesso!' },
        clientToken ? { headers: { 'Client-Token': clientToken } } : {}
      );

      // clear buffer
      delete conversations[phone];
      return res.sendStatus(200);
    }

    // Otherwise: call assistant and buffer
    const resposta = await callAssistant(mensagem);

    // buffer this exchange
    conversations[phone].push({ user: mensagem, bot: resposta });

    console.log(`→ ${phone}: ${resposta}`);
    await axios.post(
      zapiUrl,
      { phone, message: resposta },
      clientToken ? { headers: { 'Client-Token': clientToken } } : {}
    );

    return res.sendStatus(200);
  } catch (err) {
    console.error('Erro no webhook:', err.message);
    return res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Bot rodando na porta ${PORT}`));
