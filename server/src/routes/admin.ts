import { Router } from "express";
import { db } from "../db.js";
import { requireAdmin } from "../middleware/auth.js";
import { syncProducts, resolveDefaultSource } from "../services/sync.js";
import type { Estado, ProductInput, ProductRow } from "../types.js";

export const adminRouter = Router();

adminRouter.use(requireAdmin);

function parseProductInput(body: unknown): ProductInput | null {
  const b = (body ?? {}) as Record<string, unknown>;
  const sku = typeof b.sku === "string" ? b.sku.trim() : "";
  const nombre = typeof b.nombre === "string" ? b.nombre.trim() : "";
  if (!sku || !nombre) return null;

  const rawEstado = typeof b.estado === "string" ? b.estado.toLowerCase() : "bueno";
  const precio = Number(b.precio);
  const stock = Number(b.stock);

  return {
    sku,
    nombre,
    categoria:
      typeof b.categoria === "string" && b.categoria.trim()
        ? b.categoria.trim()
        : "Otros",
    precio: Number.isFinite(precio) ? precio : 0,
    estado: (rawEstado === "como nuevo" || rawEstado === "regular"
      ? rawEstado
      : "bueno") as Estado,
    descripcion:
      typeof b.descripcion === "string" ? b.descripcion.trim() : "",
    stock: Number.isInteger(stock) && stock >= 0 ? stock : 0,
  };
}

adminRouter.post("/products", (req, res) => {
  const input = parseProductInput(req.body);
  if (!input) {
    res.status(400).json({ error: "Se requieren 'sku' y 'nombre' válidos" });
    return;
  }
  const exists = db.prepare("SELECT id FROM products WHERE sku = ?").get(input.sku);
  if (exists) {
    res.status(409).json({ error: `Ya existe un producto con el SKU '${input.sku}'` });
    return;
  }
  const result = db
    .prepare(
      `INSERT INTO products (sku, nombre, categoria, precio, estado, descripcion, stock, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    )
    .run(input.sku, input.nombre, input.categoria, input.precio, input.estado, input.descripcion, input.stock);
  const created = db
    .prepare("SELECT id, sku, nombre, categoria, precio, estado, descripcion, stock FROM products WHERE id = ?")
    .get(result.lastInsertRowid) as unknown as ProductRow;
  res.status(201).json(created);
});

adminRouter.put("/products/:id", (req, res) => {
  const input = parseProductInput(req.body);
  if (!input) {
    res.status(400).json({ error: "Se requieren 'sku' y 'nombre' válidos" });
    return;
  }
  const exists = db
    .prepare("SELECT id FROM products WHERE id = ? AND active = 1")
    .get(req.params.id);
  if (!exists) {
    res.status(404).json({ error: "Producto no encontrado" });
    return;
  }
  const dup = db
    .prepare("SELECT id FROM products WHERE sku = ? AND id != ?")
    .get(input.sku, req.params.id);
  if (dup) {
    res.status(409).json({ error: `Ya existe otro producto con el SKU '${input.sku}'` });
    return;
  }
  db.prepare(
    `UPDATE products
     SET sku = ?, nombre = ?, categoria = ?, precio = ?, estado = ?, descripcion = ?, stock = ?,
         updated_at = datetime('now')
     WHERE id = ?`,
  ).run(input.sku, input.nombre, input.categoria, input.precio, input.estado, input.descripcion, input.stock, req.params.id);
  const updated = db
    .prepare("SELECT id, sku, nombre, categoria, precio, estado, descripcion, stock FROM products WHERE id = ?")
    .get(req.params.id) as unknown as ProductRow;
  res.json(updated);
});

adminRouter.delete("/products/:id", (req, res) => {
  const result = db
    .prepare("UPDATE products SET active = 0, updated_at = datetime('now') WHERE id = ? AND active = 1")
    .run(req.params.id);
  if (result.changes === 0) {
    res.status(404).json({ error: "Producto no encontrado" });
    return;
  }
  res.status(204).end();
});

adminRouter.post("/sync", async (req, res) => {
  const source =
    typeof (req.body as Record<string, unknown> | undefined)?.source === "string"
      ? (req.body as { source: string }).source.trim()
      : resolveDefaultSource();
  try {
    const summary = await syncProducts(source);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
