interface FilterBarProps {
  categories: string[];
  activeCategory: string;
  searchTerm: string;
  onSelectCategory: (category: string) => void;
  onSearch: (term: string) => void;
}

export default function FilterBar({
  categories,
  activeCategory,
  searchTerm,
  onSelectCategory,
  onSearch,
}: FilterBarProps) {
  return (
    <div className="filters">
      {categories.map((category) => (
        <button
          key={category}
          className={`chip ${category === activeCategory ? "active" : ""}`}
          onClick={() => onSelectCategory(category)}
        >
          {category}
        </button>
      ))}
      <input
        className="search"
        placeholder="Buscar…"
        value={searchTerm}
        onChange={(e) => onSearch(e.target.value)}
      />
    </div>
  );
}
