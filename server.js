require('dotenv').config();
const express = require('express');
const axios   = require('axios');

const app = express();
app.use(express.json());

// Variáveis de ambiente
const instanceId   = process.env.ZAPI_INSTANCE_ID;
const token        = process.env.ZAPI_TOKEN;
const clientToken  = process.env.ZAPI_CLIENT_TOKEN;
const openaiApiKey = process.env.OPENAI_API_KEY;
const url          = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

// Função para usar o Assistente personalizado
async function obterRespostaAssistente(pergunta) {
  const assistantId = 'asst_KNliRLfxJ8RHSqyULqDCrW45';
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${openaiApiKey}`,
    'OpenAI-Beta': 'assistants=v2'
  };

  // 1) Cria uma thread nova
  const threadResp = await axios.post('https://api.openai.com/v1/threads', {}, { headers });
  const threadId = threadResp.data.id;

  // 2) Envia a mensagem do usuário
  await axios.post(
    `https://api.openai.com/v1/threads/${threadId}/messages`,
    { role: 'user', content: pergunta },
    { headers }
  );

  // 3) Executa o Assistente
  const runResp = await axios.post(
    `https://api.openai.com/v1/threads/${threadId}/runs`,
    { assistant_id: assistantId },
    { headers }
  );

  let { id: runId, status } = runResp.data;
  // 4) Aguarda resposta ficar pronta
  while (status === 'queued' || status === 'in_progress') {
    await new Promise(r => setTimeout(r, 2000));
    const check = await axios.get(
      `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
      { headers }
    );
    status = check.data.status;
  }
  if (status !== 'completed') throw new Error('Erro ao executar o assistente.');

  // 5) Lê a resposta final
  const messagesResp = await axios.get(
    `https://api.openai.com/v1/threads/${threadId}/messages`,
    { headers }
  );
  return messagesResp.data.data[0].content[0].text.value;
}

app.post('/webhook', async (req, res) => {
  try {
    const { fromMe, text, isStatusReply, phone } = req.body;
    const mensagem = text?.message;
    if (isStatusReply || fromMe || !mensagem || !mensagem.trim()) {
      return res.sendStatus(200);
    }

    console.log("📩 Mensagem recebida de:", phone, "| Conteúdo:", mensagem);
    // Chama agora o Assistente em vez do GPT-3.5 direto
    const resposta = await obterRespostaAssistente(mensagem);

    const payload = { phone, message: resposta };
    const config  = clientToken
      ? { headers: { 'Client-Token': clientToken } }
      : {};

    console.log("📤 Enviando payload:", payload);
    const respApi = await axios.post(url, payload, config);
    console.log("✅ Mensagem enviada:", respApi.data);

    return res.sendStatus(200);
  } catch (erro) {
    console.error("❌ Erro ao processar webhook:", erro.response?.data || erro.message);
    return res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Bot vendedor rodando na porta ${PORT}`);
});
