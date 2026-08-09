import { syncProducts, resolveDefaultSource } from "../services/sync.js";

const source = process.argv[2] ?? resolveDefaultSource();
console.log("Sincronizando desde:", source);

try {
  const summary = await syncProducts(source);
  console.log("Sincronización completada:", summary);
} catch (err) {
  console.error("Sincronización falló:", (err as Error).message);
  process.exit(1);
}
