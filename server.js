// Versão 1.0.6 - Diagnóstico de token + melhorias

const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json()); // Habilita leitura de JSON

app.post('/webhook', async (req, res) => {
  try {
    const numero = req.body.phone;
    const msg = req.body.text?.message;

    console.log(`✅ Mensagem recebida de: ${numero} | Conteúdo: ${msg}`);

    // Captura variáveis de ambiente
    const instanceId = process.env.ZAPI_INSTANCE_ID;
    const token = process.env.ZAPI_TOKEN;

    // 🔍 Diagnóstico para garantir que os valores estão sendo lidos
    console.log(`🔍 Verificando variáveis de ambiente:`);
    console.log(`- ID: ${instanceId}`);
    console.log(`- TOKEN: ${token}`);

    if (!instanceId || !token) {
      console.error('❌ Erro: Variáveis de ambiente ZAPI_INSTANCE_ID ou ZAPI_TOKEN não definidas.');
      return res.sendStatus(500);
    }

    // Monta a resposta
    const resposta = `Olá! Recebemos sua mensagem: "${msg}". Em breve um vendedor entrará em contato.`;

    // Monta o endpoint da Z-API
    const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

    // Envia a resposta
    await axios.post(url, {
      phone: numero,
      message: resposta,
    });

    console.log(`✅ Resposta enviada com sucesso para ${numero}`);
    res.sendStatus(200);

  } catch (err) {
    console.error('❌ Erro ao enviar resposta:', err.response?.data || err.message || err);
    res.sendStatus(500);
  }
});

const PORT = 10000;
app.listen(PORT, () => {
  console.log(`🚀 Bot vendedor rodando na porta ${PORT}`);
});
