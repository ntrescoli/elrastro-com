/**
 * Sincronización Google Sheets → WooCommerce (Google Apps Script)
 *
 * CÓMO USARLO:
 * 1. En tu hoja de Google: Extensiones → Apps Script.
 * 2. Pega este archivo y edita el objeto CONFIG con tus datos.
 * 3. Ejecuta la función `syncProducts()` una vez para dar permisos.
 * 4. Para automatizar: instala un disparador con `installTrigger()`
 *    o hazlo manual en el editor (reloj → cada X horas/días).
 *
 * Es la versión "low-code" del mismo patrón que
 * integrations/woocommerce/src/sync.ts (Node): upsert por SKU e
 * idempotente, y pasa a draft los SKU que desaparecen de la hoja.
 */

const CONFIG = {
  wooUrl: "https://tu-tienda.com",
  consumerKey: "ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  consumerSecret: "cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  sheetCsvUrl:
    "https://docs.google.com/spreadsheets/d/e/XXXX/pub?output=csv",
};

function api(method, path, body) {
  const options = {
    method,
    headers: {
      Authorization:
        "Basic " +
        Utilities.base64Encode(CONFIG.consumerKey + ":" + CONFIG.consumerSecret),
      "Content-Type": "application/json",
    },
    muteHttpExceptions: false,
  };
  if (body !== undefined) options.payload = JSON.stringify(body);

  const res = UrlFetchApp.fetch(CONFIG.wooUrl + "/wp-json/wc/v3" + path, options);
  if (res.getResponseCode() >= 400) {
    throw new Error(
      path + " → HTTP " + res.getResponseCode() + ": " + res.getContentText().slice(0, 300),
    );
  }
  const text = res.getContentText();
  return text ? JSON.parse(text) : null;
}

function slugify(text) {
  const accents = "áàäâéèëêíìïîóòöôúùüûñ";
  const plain = "aaaaeeeeiiiioooouuuun";
  let out = "";
  for (const ch of String(text).toLowerCase()) {
    const idx = accents.indexOf(ch);
    out += idx >= 0 ? plain[idx] : ch;
  }
  return out.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function readSheet() {
  const csv = UrlFetchApp.fetch(CONFIG.sheetCsvUrl).getContentText();
  const rows = Utilities.parseCsv(csv);
  if (rows.length === 0) return [];

  const header = rows[0].map((h) => String(h).trim().toLowerCase());
  const col = (row, names) => {
    for (const name of names) {
      const idx = header.indexOf(name);
      if (idx >= 0 && String(row[idx] ?? "").trim() !== "") {
        return String(row[idx]).trim();
      }
    }
    return "";
  };

  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.join("").trim() === "") continue;

    const nombre = col(row, ["nombre"]);
    const estado = col(row, ["estado"]).toLowerCase();
    const precio = parseFloat(col(row, ["precio"])) || 0;
    if (nombre === "" && precio === 0) continue;

    out.push({
      sku: col(row, ["sku"]) || slugify(nombre),
      nombre: nombre || "Producto sin nombre",
      categoria: col(row, ["categoria"]) || "Otros",
      precio,
      estado: estado === "como nuevo" || estado === "regular" ? estado : "bueno",
      descripcion: col(row, ["descripcion"]),
      stock: parseInt(col(row, ["stock"])) || 0,
    });
  }
  return out;
}

function toPayload(p, categoryId) {
  return {
    name: p.nombre,
    sku: p.sku,
    regular_price: p.precio.toFixed(2),
    description: p.descripcion,
    manage_stock: true,
    stock_quantity: p.stock,
    categories: [{ id: categoryId }],
    attributes: [{ name: "Estado", visible: true, options: [p.estado] }],
  };
}

const categoryCache = {};

function ensureCategory(name) {
  if (categoryCache[name]) return categoryCache[name];
  const matches = api("GET", "/products/categories?search=" + encodeURIComponent(name));
  const found = (matches || []).find(
    (c) => c.name.toLowerCase() === name.toLowerCase(),
  );
  if (found) {
    categoryCache[name] = found.id;
    return found.id;
  }
  const created = api("POST", "/products/categories", { name });
  categoryCache[name] = created.id;
  return created.id;
}

function findProductBySku(sku) {
  const list = api("GET", "/products?sku=" + encodeURIComponent(sku));
  return list && list.length > 0 ? list[0] : null;
}

function syncProducts() {
  const products = readSheet();
  const seenSkus = {};
  const summary = { created: 0, updated: 0, deactivated: 0, failed: 0 };

  for (const p of products) {
    seenSkus[p.sku] = true;
    try {
      const categoryId = ensureCategory(p.categoria);
      const payload = toPayload(p, categoryId);
      const existing = findProductBySku(p.sku);
      if (existing) {
        api("PUT", "/products/" + existing.id, payload);
        summary.updated++;
      } else {
        api("POST", "/products", payload);
        summary.created++;
      }
    } catch (e) {
      summary.failed++;
      Logger.log("Error con SKU '" + p.sku + "': " + e);
    }
  }

  let page = 1;
  for (;;) {
    const list = api("GET", "/products?per_page=100&page=" + page + "&status=publish");
    for (const prod of list) {
      if (prod.sku && !seenSkus[prod.sku]) {
        try {
          api("PUT", "/products/" + prod.id, { status: "draft" });
          summary.deactivated++;
        } catch (e) {
          summary.failed++;
          Logger.log("Error desactivando '" + prod.name + "': " + e);
        }
      }
    }
    if (list.length < 100) break;
    page++;
  }

  Logger.log("Sincronización completada: " + JSON.stringify(summary));
}

function installTrigger() {
  ScriptApp.newTrigger("syncProducts").timeBased().everyHours(6).create();
}
