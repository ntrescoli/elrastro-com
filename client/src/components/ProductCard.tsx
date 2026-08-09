import { CATEGORY_EMOJI, ESTADO_COLOR } from "../types";
import type { Product } from "../types";

interface ProductCardProps {
  product: Product;
  rotation: number;
}

export default function ProductCard({ product, rotation }: ProductCardProps) {
  const emoji = CATEGORY_EMOJI[product.categoria] || "🔍";
  const color = ESTADO_COLOR[product.estado] || "var(--brass)";

  return (
    <article className="card" style={{ transform: `rotate(${rotation}deg)` }}>
      <div className="hole" />
      <div className="card-top">
        <span className="emoji">{emoji}</span>
        <span className="estado" style={{ background: color }}>
          {product.estado}
        </span>
      </div>
      <div className="card-name">{product.nombre}</div>
      <div className="card-desc">{product.descripcion}</div>
      <div className="card-bottom">
        <span className="price">{product.precio.toFixed(2)}€</span>
        <span className="stock">
          {product.stock > 0 ? `${product.stock} disp.` : "agotado"}
        </span>
      </div>
    </article>
  );
}
