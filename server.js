app.post('/webhook', async (req, res) => {
  const msg = req.body.body;
  const numero = req.body.from;

  console.log("📩 Mensagem recebida de:", numero, "| Conteúdo:", msg);

  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;

  console.log("🧠 INSTÂNCIA:", instanceId);
  console.log("🔐 TOKEN:", token);

  const resposta = `Olá! Recebemos sua mensagem: "${msg}". Em breve um vendedor entrará em contato.`;

  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-message`;

  try {
    await axios.post(url, {
      phone: numero,
      message: resposta,
    });
    console.log("✅ Resposta enviada com sucesso!");
  } catch (err) {
    console.error("❌ Erro ao enviar mensagem via Z-API:", err.response?.data || err.message);
  }

  res.sendStatus(200);
});
