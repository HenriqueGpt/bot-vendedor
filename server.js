// server.js v1.6.2 - Com seu Assistente OpenAI (asst_KNliRLfxJ8RHSqyULqDCrW45)
const express = require("express");
const axios = require("axios");
const { OpenAI } = require("openai");
require("dotenv").config();

const app = express();
const PORT = 10000;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configuração Z-API
const ZAPI_INSTANCE_ID = process.env.ZAPI_INSTANCE_ID;
const ZAPI_TOKEN = process.env.ZAPI_TOKEN;
const ZAPI_CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN;

const zapiUrl = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;

// ID do seu assistente fixado
const ASSISTANT_ID = "asst_KNliRLfxJ8RHSqyULqDCrW45";

app.use(express.json());

app.post("/webhook", async (req, res) => {
  try {
    const phone = req.body.phone || req.body.sender?.phone;
    const message = req.body.message?.trim();

    if (!phone || !message) {
      console.log("❌ Dados incompletos recebidos:", req.body);
      return res.sendStatus(400);
    }

    console.log(`📩 Mensagem recebida de: ${phone} | Conteúdo: ${message}`);

    // Criar thread no Assistente
    const thread = await openai.beta.threads.create();

    // Adicionar mensagem do usuário
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: message,
    });

    // Executar o Assistente
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID,
    });

    // Esperar resposta
    let status = run.status;
    while (status !== "completed" && status !== "failed") {
      await new Promise((r) => setTimeout(r, 1500));
      const updatedRun = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      status = updatedRun.status;
    }

    if (status === "failed") {
      console.error("❌ O assistente falhou ao processar.");
      return res.sendStatus(500);
    }

    // Pegar resposta
    const messages = await openai.beta.threads.messages.list(thread.id);
    const resposta = messages.data.find((msg) => msg.role === "assistant")?.content?.[0]?.text?.value?.trim();

    if (!resposta) {
      console.error("❌ Resposta do assistente vazia.");
      return res.sendStatus(500);
    }

    console.log(`📤 Enviando resposta: ${resposta}`);

    // Enviar via Z-API
    await axios.post(
      zapiUrl,
      {
        phone,
        message: resposta,
      },
      {
        headers: {
          "Client-Token": ZAPI_CLIENT_TOKEN,
        },
      }
    );

    return res.sendStatus(200);
  } catch (err) {
    console.error("❌ Erro ao processar mensagem:", err.response?.data || err.message);
    return res.sendStatus(500);
  }
});

app.listen(PORT, () => {
  console.log("🤖 Bot rodando com seu assistente personalizado na porta 10000");
});
