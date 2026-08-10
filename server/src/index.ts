import express from "express";
import cors from "cors";
import { db } from "./db.js";
import { productsRouter } from "./routes/products.js";
import { adminRouter } from "./routes/admin.js";
import { chatRouter } from "./routes/chat.js";
import { syncProducts, resolveDefaultSource } from "./services/sync.js";

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/products", productsRouter);
app.use("/api/chat", chatRouter);
app.use("/api", adminRouter);

async function seedIfEmpty() {
  const { count } = db.prepare("SELECT COUNT(*) AS count FROM products").get() as {
    count: number;
  };
  if (count > 0) return;
  try {
    const summary = await syncProducts(resolveDefaultSource());
    console.log("Seed inicial desde la hoja:", summary);
  } catch (err) {
    console.error("Seed inicial falló:", (err as Error).message);
  }
}

const port = Number(process.env.PORT ?? 3000);

seedIfEmpty().then(() => {
  app.listen(port, () => {
    console.log(`API de elrastro escuchando en http://localhost:${port}`);
  });
});
