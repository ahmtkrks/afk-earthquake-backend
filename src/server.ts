require("dotenv").config();
// -----

import { serviceAccountKey } from "./constants";
import express from "express";
import { DB } from "./services/DB";
import admin from "firebase-admin";

const app = express();
const { PORT = 4000 } = process.env;
admin.initializeApp({
  credential: admin.credential.cert(serviceAccountKey as any),
});

const logs = [];
let lastTokenSentDate = new Date();

app.use(express.json());

app.post("/save", async (req, res) => {
  const { token } = req.body;
  logs.push(`Saving token ${token}.`);

  const result = await DB.saveToken(token);
  res.send({
    result,
    logs,
  });
});

app.get("/tokens", async (req, res) => {
  // Limit requests to 1 per 30 seconds
  const now = new Date();
  const diff = now.getTime() - lastTokenSentDate.getTime();
  if (diff < 30000) {
    console.log(`Too many requests. ${diff}ms since last request.`);
    logs.push(`Too many requests. ${diff}ms since last request.`);
    return res.send({
      message: `Too many requests. ${diff}ms since last request.`,
      logs,
    });
  }

  lastTokenSentDate = now;
  console.log(`Tokens requested.`);
  logs.push(`Tokens requested. ${new Date().toISOString()}`);
  const tokens = await DB.getTokens();

  // Send notifications
  const message = {
    notification: {
      title: "Deprem Uyarısı!",
      body: "Yakınlarda deprem oluyor, dikkatli olun!",
    },
  };

  const messages = tokens.map((token) => ({
    ...message,
    token: token.token,
  }));

  for (const message of messages) {
    try {
      const result = await admin.messaging().send(message);
      console.log(result);
    } catch (error) {
      console.log(`Sending notif error: ${error.message}`);
    }
  }

  res.send({
    tokens,
    logs,
  });
});

app.get("/reset", async (req, res) => {
  console.log("Resettings logs");
  logs.length = 0;
  res.send({
    logs,
  });
});

app.listen(PORT, () => {
  console.log(`⚡ Server Started at ::${PORT} ${new Date().toISOString()}`);
});

export default app;
