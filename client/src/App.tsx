import { useCallback, useEffect, useMemo, useState } from "react";
import type { Product } from "./types";
import { DEMO_PRODUCTS } from "./data/demoProducts";
import { fetchProducts } from "./data/apiClient";
import Hero from "./components/Hero";
import CatalogStatus from "./components/CatalogStatus";
import FilterBar from "./components/FilterBar";
import ProductGrid from "./components/ProductGrid";
import ChatWidget from "./components/ChatWidget";

interface Status {
  message: string;
  type: "" | "ok" | "err";
}

const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:3000").replace(/\/$/, "");

export default function App() {
  const [products, setProducts] = useState<Product[]>(DEMO_PRODUCTS);
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [status, setStatus] = useState<Status>({ message: "", type: "" });

  const loadFromApi = useCallback(async () => {
    setStatus({ message: "Cargando catálogo desde la API…", type: "" });
    try {
      const loaded = await fetchProducts(API_URL);
      setProducts(loaded);
      setStatus({
        message: loaded.length === 0 ? "Catálogo vacío" : "Catálogo sincronizado desde Google Sheets",
        type: loaded.length === 0 ? "err" : "ok",
      });
    } catch {
      setProducts(DEMO_PRODUCTS);
      setStatus({
        message: `No se pudo conectar con la API (${API_URL}). Mostrando datos de ejemplo.`,
        type: "err",
      });
    }
  }, []);

  useEffect(() => {
    loadFromApi();
  }, [loadFromApi]);

  const categories = useMemo(
    () => ["Todos", ...new Set(products.map((p) => p.categoria))],
    [products],
  );

  const visibleProducts = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return products.filter(
      (p) =>
        (activeCategory === "Todos" || p.categoria === activeCategory) &&
        (p.nombre.toLowerCase().includes(term) ||
          p.descripcion.toLowerCase().includes(term)),
    );
  }, [products, activeCategory, searchTerm]);

  return (
    <>
      <Hero />
      <CatalogStatus
        apiUrl={API_URL}
        message={status.message}
        type={status.type}
        productCount={products.length}
        onRefresh={loadFromApi}
      />
      <FilterBar
        categories={categories}
        activeCategory={activeCategory}
        searchTerm={searchTerm}
        onSelectCategory={setActiveCategory}
        onSearch={setSearchTerm}
      />
      <ProductGrid products={visibleProducts} />
      <footer>
        elrastro.com — proyecto de práctica · React + TypeScript + Express + SQLite + Google Sheets
      </footer>
      <ChatWidget apiUrl={API_URL} />
    </>
  );
}
