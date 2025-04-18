// Versão 1.0.5 - Correção definitiva no envio via Z-API Web + melhorias de log
const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 10000;

// Middleware essencial para o parser do JSON
app.use(express.json());

app.post('/webhook', async (req, res) => {
  try {
    const body = req.body;

    // Verifica se o corpo tem a estrutura correta
    if (!body || !body.phone || !body.text || !body.text.message) {
      console.log('❌ Mensagem inválida recebida:', JSON.stringify(body, null, 2));
      return res.status(400).send('Formato de mensagem inválido.');
    }

    const numero = body.phone;
    const msg = body.text.message;

    console.log(`📥 Mensagem recebida de: ${numero} | Conteúdo: ${msg}`);

    // Carrega as variáveis de ambiente
    const instanceId = process.env.ZAPI_INSTANCE_ID;
    const token = process.env.ZAPI_TOKEN;

    // Monta resposta automática
    const resposta = `Olá! Recebemos sua mensagem: "${msg}". Em breve um vendedor entrará em contato.`;

    // Monta a URL da Z-API (web)
    const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

    // Faz o envio da resposta via POST
    await axios.post(url, {
      phone: numero,
      message: resposta
    });

    console.log(`📤 Mensagem enviada para ${numero}`);
    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Erro ao enviar resposta:', err.response?.data || err.message);
    res.sendStatus(500);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Bot vendedor rodando na porta ${PORT}`);
});
