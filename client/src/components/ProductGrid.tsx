import type { Product } from "../types";
import ProductCard from "./ProductCard";

const ROTATIONS = [-1.4, 0.8, -0.5, 1.2, -0.9, 0.5, -1.1, 1.5];

interface ProductGridProps {
  products: Product[];
}

export default function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="grid">
        <div className="empty">
          No hay productos que coincidan. Prueba otra categoría o búsqueda.
        </div>
      </div>
    );
  }

  return (
    <div className="grid">
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          rotation={ROTATIONS[index % ROTATIONS.length]}
        />
      ))}
    </div>
  );
}
