interface BrandProps {
  compact?: boolean;
}

/** Cabeçalho da marca, reproduzindo o layout: eyebrow cobre / nome cursivo / tagline. */
export function Brand({ compact = false }: BrandProps) {
  return (
    <header className={compact ? 'brand brand--compact' : 'brand'}>
      <div className="brand__eyebrow">sous-chef</div>
      <div className="brand__name">Le Repertoire</div>
      <div className="brand__tagline">seu repertório infinito de receitas</div>
    </header>
  );
}
