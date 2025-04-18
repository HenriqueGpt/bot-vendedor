require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// Prompt do sistema: instruções para o bot
const SYSTEM_PROMPT = `
Você é um vendedor virtual da empresa HYDRO TECH BRASIL, especializada em biodigestores, ETEs compactas, tanques e sistemas de tratamento de efluentes. 
Capte leads, esclareça dúvidas e ofereça soluções com gentileza, profissionalismo e objetividade.
Caso não saiba a resposta, diga que um especialista entrará em contato.
`;

// Endpoint para receber mensagens do WhatsApp via Z-API
app.post('/webhook', async (req, res) => {
  const mensagem = req.body.message?.text?.body;
  const numero = req.body.message?.from;

  if (!mensagem || !numero) {
    return res.sendStatus(200); // Ignora se não tiver conteúdo útil
  }

  console.log(`📩 Mensagem recebida de ${numero}: ${mensagem}`);

  const resposta = await gerarResposta(mensagem);

  try {
    await axios.post(`https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_TOKEN}/send-messages`, {
      phone: numero,
      message: resposta
    });
    console.log(`✅ Resposta enviada para ${numero}`);
  } catch (erro) {
    console.error("Erro ao enviar mensagem via Z-API:", erro.response?.data || erro.message);
  }

  res.sendStatus(200);
});

// Função que chama a OpenAI para gerar resposta
async function gerarResposta(userMessage) {
  try {
    const resposta = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage }
      ]
    }, {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      }
    });

    return resposta.data.choices[0].message.content;
  } catch (e) {
    console.error("Erro com OpenAI:", e.response?.data || e.message);
    return "Desculpe, tivemos um problema. Um especialista irá te retornar em breve.";
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🤖 Bot vendedor rodando na porta ${PORT}`));
