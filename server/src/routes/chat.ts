import { Router } from "express";
import { answerChat } from "../services/chat.js";

export const chatRouter = Router();

chatRouter.post("/", (req, res) => {
  const body = req.body as Record<string, unknown> | undefined;
  const message = typeof body?.message === "string" ? body.message.trim() : "";

  if (!message) {
    res.status(400).json({ error: "El mensaje no puede estar vacío" });
    return;
  }

  res.json(answerChat(message));
});
