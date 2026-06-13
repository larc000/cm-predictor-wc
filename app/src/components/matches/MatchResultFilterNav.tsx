import type { MatchResultFilter } from '@/lib/types';

type MatchResultFilterNavProps = {
  activeFilter: MatchResultFilter;
  onFilterChange: (filter: MatchResultFilter) => void;
};

const resultFilters: Array<{ value: MatchResultFilter; label: string }> = [
  { value: 'pending', label: 'Resultados pendientes' },
  { value: 'final', label: 'Resultados finales' }
];

export function MatchResultFilterNav({ activeFilter, onFilterChange }: MatchResultFilterNavProps) {
  return (
    <nav className="secondary-tabs" aria-label="Filtro de resultados">
      {resultFilters.map((filter) => {
        const isActive = activeFilter === filter.value;

        return (
          <button
            key={filter.value}
            className={`secondary-tab-button ${isActive ? 'active' : ''}`}
            type="button"
            aria-pressed={isActive}
            onClick={() => onFilterChange(filter.value)}
          >
            {filter.label}
          </button>
        );
      })}
    </nav>
  );
}
