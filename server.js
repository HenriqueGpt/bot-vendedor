// Versão: 1.0.5

const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

// 🔧 DADOS FIXOS DA Z-API
const instanceId = '3DFE91CF4EC8F0C86C5932C54B267657';
const token = 'DCFE374845888657AFAC58BE';

// 🔧 URL da API de envio de mensagens
const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

app.post('/webhook', async (req, res) => {
  try {
    const numero = req.body.phone;
    const mensagem = req.body?.text?.message;

    console.log("📩 Mensagem recebida de:", numero, "| Conteúdo:", mensagem);

    if (!mensagem || mensagem.trim() === '') {
      console.log("❌ Mensagem vazia ou inválida.");
      return res.sendStatus(200);
    }

    const resposta = `Olá! Recebemos sua mensagem: "${mensagem}". Em breve um vendedor entrará em contato.`;

    const payload = {
      phone: numero,
      message: resposta,
    };

    console.log("📤 Enviando payload:", payload);

    const respostaApi = await axios.post(url, payload);
    console.log("✅ Mensagem enviada com sucesso. Resposta API:", respostaApi.data);

    res.sendStatus(200);
  } catch (erro) {
    console.error("❌ Erro ao enviar resposta:", erro.response?.data || erro.message);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Bot vendedor rodando na porta ${PORT}`);
});
