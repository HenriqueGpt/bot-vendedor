require('dotenv').config();

const express = require('express');
const axios   = require('axios');

const app = express();
app.use(express.json());

// In-memory buffer de conversas
const conversations = {};

// Z-API endpoint e tokens
const zapiUrl     = `https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}` +
                    `/token/${process.env.ZAPI_TOKEN}/send-text`;
const clientToken = process.env.ZAPI_CLIENT_TOKEN;

// Assistente OpenAI
const assistantId = 'asst_KNliRLfxJ8RHSqyULqDCrW45';
const openaiKey   = process.env.OPENAI_API_KEY;

// Extrai texto da resposta do assistente
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

// Chama o Assistente OpenAI
async function callAssistant(question) {
  const headers = {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${openaiKey}`,
    'OpenAI-Beta':   'assistants=v2'
  };

  const { data: thread } = await axios.post(
    'https://api.openai.com/v1/threads', {}, { headers }
  );

  await axios.post(
    `https://api.openai.com/v1/threads/${thread.id}/messages`,
    { role: 'user', content: question },
    { headers }
  );

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

    // Inicializa buffer (apenas em memória)
    if (!conversations[phone]) {
      conversations[phone] = [];
    }

    if (mensagem === '099') {
      // Mensagem de finalização (não salva mais)
      await axios.post(
        zapiUrl,
        { phone, message: 'Conversa encerrada.' },
        clientToken ? { headers: { 'Client-Token': clientToken } } : {}
      );

      delete conversations[phone];
      return res.sendStatus(200);
    }

    // Gera resposta com assistente
    const resposta = await callAssistant(mensagem);

    // Salva no buffer
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
