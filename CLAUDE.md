# elrastro.com — proyecto de práctica freelance

## Sobre el proyecto
Tienda ficticia de productos de segunda mano/rastro. Es un proyecto personal para
practicar, de forma integrada, los servicios que quiero ofrecer como freelance
(perfil DAW) a pymes: web, chatbot con IA, automatización, integraciones y dashboard.

## Objetivos de aprendizaje (recordar en todas las sesiones)
- Quiero aprender a trabajar con **WordPress/WooCommerce** (temas, hooks en PHP,
  plugins habituales, su REST API) — no para construir todo desde cero, sino para
  poder personalizar e integrar cosas sobre tiendas que los clientes ya tienen.
- Quiero aprender a trabajar con **Shopify** (temas en Liquid, Shopify API, apps
  embebidas) por el mismo motivo.
- La mayoría de mis futuros clientes freelance ya tendrán una tienda en alguna de
  estas plataformas, así que el enfoque real será "integrar sobre lo que ya tienen",
  no "construir desde cero" — quiero que el proyecto refleje eso cuando tenga sentido.

## Estado actual

Monorepo npm (workspaces) con dos paquetes:

- `client/`: tienda **Vite + React + TypeScript** (hero, filtros por categoría,
  búsqueda, grid de productos con la estética "de rastro"). Lee el catálogo de
  la API del backend (`src/data/apiClient.ts`). Si la API no está disponible,
  usa productos de ejemplo (`src/data/demoProducts.ts`).
- `server/`: **Node + Express + TypeScript + SQLite** (`node:sqlite`, módulo
  nativo de Node 24, sin dependencias de compilación). Mantiene el catálogo en
  `server/data/elrastro.db` y expone:
  - `GET /api/products` (público) y `GET /api/products/:id`.
  - Endpoints admin protegidos por `ADMIN_TOKEN` (Bearer): CRUD de productos y
    `POST /api/sync`.
  - Sincronización desde Google Sheets publicado como CSV: `npm run sync`
    (CLI) o `POST /api/sync`; hace upsert por **SKU** (idempotente) y desactiva
    los SKU que ya no están en la hoja.
  - En el arranque, si la BD está vacía, hace un seed desde la hoja.
- `docs/sample-products.csv`: hoja de ejemplo (7 columnas: `sku, nombre,
  categoria, precio, estado, descripcion, stock`; los campos con comas van
  entrecomillados).
- `archive/elrastro.html`: primer prototipo vanilla, conservado como referencia.

Configuración: copiar `.env.example` → `.env` en `client/` (variable
`VITE_API_URL`) y en `server/` (`PORT`, `CLIENT_ORIGIN`, `ADMIN_TOKEN`,
`SHEET_CSV_URL`). Arranque con `npm run dev` (levanta server en :3000 y client
en :5173).

Flujo pensado para el cliente real: edita su inventario en Google Sheets →
la API se sincroniza (cron/CLI/endpoint) → la tienda lee de la API. El cliente
nunca usa formularios CRUD.

### Pendiente
- Chatbot con RAG sobre el catálogo (consumiendo la API real).
- Dashboard de pedidos (la tabla de pedidos aún no existe).
- Automatización de confirmaciones y sync periódico (cron).

## Cómo trabajar conmigo en este proyecto
- Explicar los conceptos nuevos a medida que aparecen (no dar por hecho que los conozco).
- Cuando una pieza del proyecto tenga un equivalente real en WordPress o Shopify,
  mencionarlo (ej. "esto en WooCommerce se haría con tal hook/plugin").
- Priorizar buenas prácticas de cara a portfolio: código limpio, git con commits
  claros, estructura de carpetas ordenada.
