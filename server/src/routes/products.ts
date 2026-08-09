import { Router } from "express";
import { db } from "../db.js";
import type { ProductRow } from "../types.js";

export const productsRouter = Router();

const SELECT_PUBLIC = `
  SELECT id, sku, nombre, categoria, precio, estado, descripcion, stock
  FROM products
  WHERE active = 1
`;

productsRouter.get("/", (_req, res) => {
  const rows = db
    .prepare(`${SELECT_PUBLIC} ORDER BY categoria, nombre`)
    .all() as unknown as ProductRow[];
  res.json(rows);
});

productsRouter.get("/:id", (req, res) => {
  const row = db
    .prepare(`${SELECT_PUBLIC} AND id = ?`)
    .get(req.params.id) as unknown as ProductRow | undefined;
  if (!row) {
    res.status(404).json({ error: "Producto no encontrado" });
    return;
  }
  res.json(row);
});
