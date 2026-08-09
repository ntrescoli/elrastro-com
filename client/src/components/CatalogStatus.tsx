interface CatalogStatusProps {
  apiUrl: string;
  message: string;
  type: "" | "ok" | "err";
  productCount: number;
  onRefresh: () => void;
}

export default function CatalogStatus({
  apiUrl,
  message,
  type,
  productCount,
  onRefresh,
}: CatalogStatusProps) {
  return (
    <div className="connect-wrap">
      <section className="connect">
        <h2>Catálogo en vivo</h2>
        <p>
          Los productos se sincronizan desde Google Sheets a la API (
          <code>{apiUrl}</code>). Esta tienda los lee desde ahí: el cliente solo
          edita su hoja.
        </p>
        <div className="connect-row">
          <div className={`status ${type}`}>
            {message}
            {productCount > 0 ? ` (${productCount} productos)` : ""}
          </div>
          <button className="secondary" onClick={onRefresh}>
            Recargar
          </button>
        </div>
      </section>
    </div>
  );
}
