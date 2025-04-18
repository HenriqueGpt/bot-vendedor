// Versão: 1.0.9

const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

app.post('/webhook', async (req, res) => {
  try {
    let numero = req.body.phone || req.body.key?.remoteJid?.replace('@s.whatsapp.net', '') || null;
    const mensagem = req.body?.text?.message || req.body?.message?.body || null;

    // Garante que o número esteja no formato 55xxxxxxxxxxx
    if (numero && !numero.startsWith('55')) {
      numero = `55${numero}`;
    }

    console.log("📩 Mensagem recebida de:", numero, "| Conteúdo:", mensagem);

    if (!numero || !mensagem || mensagem.trim() === '') {
      console.log("❌ Número ou mensagem ausente/inválida.");
      return res.sendStatus(200);
    }

    const instanceId = process.env.ZAPI_INSTANCE_ID;
    const token = process.env.ZAPI_TOKEN;

    const resposta = `Olá! Recebemos sua mensagem: "${mensagem}". Em breve um vendedor entrará em contato.`;

    const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

    const payload = {
      phone: numero,
      message: resposta,
    };

    console.log("📤 Enviando payload:", payload);

    await axios.post(url, payload);
    console.log("✅ Mensagem enviada com sucesso para", numero);

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
