// … código de import, dotenv, supabase, etc. permanecem iguais

async function obterRespostaAssistenteComMemoria(pergunta, phone) {
  const assistantId = 'asst_KNliRLfxJ8RHSqyULqDCrW45';
  const headers    = {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    'OpenAI-Beta':   'assistants=v2'
  };

  // (1) busca/cria o threadId no Supabase — igual a antes…
  // … código de lookup e insert de user_threads …

  // (2) envia a mensagem do usuário
  await axios.post(
    `https://api.openai.com/v1/threads/${threadId}/messages`,
    { role: 'user', content: pergunta },
    { headers }
  );

  // (3) dispara o run do assistente
  const runResp = await axios.post(
    `https://api.openai.com/v1/threads/${threadId}/runs`,
    { assistant_id: assistantId },
    { headers }
  );
  let { id: runId, status } = runResp.data;

  // (4) espera terminar
  while (status === 'queued' || status === 'in_progress') {
    await new Promise(r => setTimeout(r, 2000));
    const chk = await axios.get(
      `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
      { headers }
    );
    status = chk.data.status;
  }
  if (status !== 'completed') throw new Error('Erro ao executar o assistente.');

  // **(5) pega a resposta certa** nos outputs do run, não em messages
  const runFinal = await axios.get(
    `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
    { headers }
  );
  const outputs = runFinal.data.outputs;
  // outputs é um array; o primeiro item tem a resposta do assistant
  const respostaAssistente = outputs[0].message.content;

  return respostaAssistente;
}
