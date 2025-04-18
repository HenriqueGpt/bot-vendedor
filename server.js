const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

app.post('/webhook', async (req, res) => {
  try {
    const numero = req.body.phone;
    const mensagem = req.body?.text?.message;

    console.log("📩 Mensagem recebida de:", numero, "| Conteúdo:", mensagem);

    if (!mensagem || mensagem.trim() === '') {
      console.log("❌ Mensagem vazia ou inválida.");
      return res.sendStatus(200);
    }

    const instanceId = process.env.ZAPI_INSTANCE_ID;
    const token = process.env.ZAPI_TOKEN;
    const openaiKey = process.env.OPENAI_API_KEY;

    const resposta = await gerarRespostaComGPT(mensagem, openaiKey);

    const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

    const payload = {
      phone: numero,
      message: resposta,
    };

    await axios.post(url, payload);
    console.log("✅ Resposta enviada para", numero);

    res.sendStatus(200);
  } catch (erro) {
    console.error("❌ Erro ao enviar resposta:", erro.response?.data || erro.message);
    res.sendStatus(500);
  }
});

async function gerarRespostaComGPT(pergunta, apiKey) {
  const resposta = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente comercial da Hydrotech Brasil. Responda de forma objetiva, clara e cordial. Fale sobre biodigestores, fossas sépticas, sistemas de saneamento e produtos da empresa.',
        },
        { role: 'user', content: pergunta },
      ],
      temperature: 0.7,
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return resposta.data.choices[0].message.content;
}

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Bot vendedor rodando na porta ${PORT}`);
});
