'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { UserLocationFlag } from '@/components/users/UserLocationFlag';
import type { LeaderboardRow } from '@/lib/types';

const STORAGE_KEY = 'quiniela:custom-leaderboard-users';

type CustomLeaderboardProps = {
  leaderboard: LeaderboardRow[];
  activeUserId: string;
};

export function CustomLeaderboard({ leaderboard, activeUserId }: CustomLeaderboardProps) {
  const [search, setSearch] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<string[]>(getStoredSelectedKeys);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedKeys));
  }, [selectedKeys]);

  const rowsWithRank = useMemo(
    () => leaderboard.map((row, index) => ({ row, rank: index + 1, key: getLeaderboardRowKey(row) })),
    [leaderboard]
  );

  const selectedRows = useMemo(
    () =>
      rowsWithRank
        .filter(({ key }) => selectedKeys.includes(key))
        .sort((a, b) => b.row.points - a.row.points || a.rank - b.rank),
    [rowsWithRank, selectedKeys]
  );

  const selectableRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return rowsWithRank
      .filter(({ key }) => !selectedKeys.includes(key))
      .filter(({ row }) => {
        if (!normalizedSearch) {
          return true;
        }

        return (
          String(row.name || '').toLowerCase().includes(normalizedSearch) ||
          row.email.toLowerCase().includes(normalizedSearch)
        );
      })
      .slice(0, 8);
  }, [rowsWithRank, search, selectedKeys]);

  function addParticipant(key: string) {
    setSelectedKeys((currentKeys) => currentKeys.includes(key) ? currentKeys : [...currentKeys, key]);
    setSearch('');
  }

  function removeParticipant(key: string) {
    setSelectedKeys((currentKeys) => currentKeys.filter((currentKey) => currentKey !== key));
  }

  function clearSelection() {
    setSelectedKeys([]);
  }

  return (
    <section className="custom-leaderboard-section">
      <div className="section-heading">
        <div>
          <h2>Leaderboard personalizado</h2>
          <p className="section-copy">Compara tu posición con compañeros específicos.</p>
        </div>
        <div className="section-actions">
          <Link className="button subtle" href="/leaderboard">
            Volver
          </Link>
          <button className="button subtle" type="button" disabled={selectedKeys.length === 0} onClick={clearSelection}>
            Limpiar selección
          </button>
        </div>
      </div>

      <div className="custom-leaderboard-controls">
        <label htmlFor="custom-leaderboard-search">Buscar participante</label>
        <input
          id="custom-leaderboard-search"
          type="search"
          placeholder="Nombre o correo"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        {search.trim() ? (
          <div className="custom-leaderboard-options">
            {selectableRows.length === 0 ? (
              <div className="notice">No hay participantes disponibles para esa búsqueda.</div>
            ) : (
              selectableRows.map(({ row, key }) => (
                <button
                  key={key}
                  className="custom-leaderboard-option"
                  type="button"
                  onClick={() => addParticipant(key)}
                >
                  <UserLocationFlag timezone={row.timezone} />
                  <span>{row.name || row.email}</span>
                  <small>{row.email}</small>
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>

      {selectedRows.length > 0 ? (
        <div className="custom-leaderboard-chips" aria-label="Participantes seleccionados">
          {selectedRows.map(({ row, key }) => (
            <button key={key} className="custom-leaderboard-chip" type="button" onClick={() => removeParticipant(key)}>
              {row.name || row.email}
              <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="leaderboard">
        {selectedRows.length === 0 ? (
          <div className="notice">Selecciona participantes para crear tu leaderboard personalizado.</div>
        ) : (
          <div className="table-scroll">
            <table className="ranking-table leaderboard-table">
              <thead>
                <tr>
                  <th>Posición</th>
                  <th>Participante</th>
                  <th className="points-cell">Puntos</th>
                </tr>
              </thead>
              <tbody>
                {selectedRows.map(({ row, rank, key }) => (
                  <tr
                    key={key}
                    className={row.user_id === activeUserId ? 'ranking-table-current-user' : undefined}
                  >
                    <td>#{rank}</td>
                    <td>
                      <div className="ranking-participant">
                        <div>
                          <div className="ranking-participant-name">
                            <UserLocationFlag timezone={row.timezone} />
                            <strong>{row.name || row.email}</strong>
                          </div>
                          <br />
                          <small>{row.email}</small>
                        </div>
                        {row.user_id === activeUserId ? <span className="current-user-chip">Tú</span> : null}
                      </div>
                    </td>
                    <td className="points-cell">{row.points || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function getLeaderboardRowKey(row: LeaderboardRow) {
  return row.user_id || row.email;
}

function getStoredSelectedKeys() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    const parsedValue = storedValue ? JSON.parse(storedValue) : [];

    return Array.isArray(parsedValue)
      ? parsedValue.filter((value) => typeof value === 'string')
      : [];
  } catch {
    return [];
  }
}
