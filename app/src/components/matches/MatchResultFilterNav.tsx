import type { MatchResultFilter } from '@/lib/types';

type MatchResultFilterNavProps = {
  activeFilter: MatchResultFilter;
  onFilterChange: (filter: MatchResultFilter) => void;
};

const resultFilters: Array<{ value: MatchResultFilter; label: string }> = [
  { value: 'pending', label: 'Upcoming Matches' },
  { value: 'final', label: 'Completed Matches' }
];

export function MatchResultFilterNav({ activeFilter, onFilterChange }: MatchResultFilterNavProps) {
  return (
    <nav className="secondary-tabs" aria-label="Result filter">
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
