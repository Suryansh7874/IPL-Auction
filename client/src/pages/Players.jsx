
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { fmt } from '../components/LiveCard.jsx';

const ROLES = ['All', 'Batsman', 'Bowler', 'All-rounder', 'Wicket-keeper'];

export default function Players() {
  const [players, setPlayers] = useState([]);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('All');
  const [status, setStatus] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    api('/players')
      .then((data) => {
        if (!active) return;
        setPlayers(Array.isArray(data) ? data : []);
        setError('');
      })
      .catch(() => {
        if (active) setError('Could not load players. Please try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filteredPlayers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return players.filter((player) => {
      const matchesSearch = [
        player.name,
        player.nationality,
        player.role,
      ].some((value) => String(value || '').toLowerCase().includes(query));

      const matchesRole =
        role === 'All' ||
        String(player.role || '').toLowerCase() === role.toLowerCase();

      const playerStatus = String(player.status || 'unsold').toLowerCase();
      const matchesStatus =
        status === 'All' || playerStatus === status.toLowerCase();

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [players, search, role, status]);

  const soldCount = players.filter(
    (p) => String(p.status || '').toLowerCase() === 'sold'
  ).length;

  const rolesCount = new Set(players.map((p) => p.role).filter(Boolean)).size;

  return (
    <div className="scouting-page">
      <header className="scouting-hero">
        <div>
          <span className="eyebrow">PLAYER INTELLIGENCE / SCOUTING</span>
          <h2>Player Directory</h2>
          <p>Explore player profiles, compare ratings, and track auction availability.</p>
        </div>

        <div className="scouting-total">
          <strong>{players.length}</strong>
          <span>REGISTERED PLAYERS</span>
        </div>
      </header>

      <section className="scouting-stats">
        <div className="scouting-stat">
          <span>TOTAL PLAYERS</span>
          <strong>{players.length}</strong>
        </div>
        <div className="scouting-stat">
          <span>SOLD</span>
          <strong>{soldCount}</strong>
        </div>
        <div className="scouting-stat">
          <span>OTHER STATUS</span>
          <strong>{players.length - soldCount}</strong>
        </div>
        <div className="scouting-stat">
          <span>PLAYER ROLES</span>
          <strong>{rolesCount}</strong>
        </div>
      </section>

      <section className="scouting-panel">
        <div className="scouting-toolbar">
          <label className="scouting-search">
            <span aria-hidden="true">⌕</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, role, nationality..."
              aria-label="Search players"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </label>

          <label className="scouting-filter">
            <span>ROLE</span>
            <select value={role} onChange={(event) => setRole(event.target.value)}>
              {ROLES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <label className="scouting-filter">
            <span>STATUS</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              {['All', 'Unsold', 'Sold'].map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="scouting-results-bar">
          <span>SCOUTING RESULTS</span>
          <strong>{filteredPlayers.length} players</strong>
        </div>

        {loading ? (
          <div className="scouting-empty">Loading player database...</div>
        ) : error ? (
          <div className="scouting-empty">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        ) : filteredPlayers.length === 0 ? (
          <div className="scouting-empty">
            <span>⌕</span>
            <h3>No matching players</h3>
            <p>Try a different search term or adjust your filters.</p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setRole('All');
                setStatus('All');
              }}
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="scouting-table-wrap">
            <table className="scouting-table">
              <thead>
                <tr>
                  <th>PLAYER</th>
                  <th>ROLE</th>
                  <th>NATIONALITY</th>
                  <th>RATING</th>
                  <th>BASE PRICE</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.map((player) => {
                  const playerStatus = String(
                    player.status || 'unsold'
                  ).toLowerCase();

                  return (
                    <tr key={player._id}>
                      <td>
                        <div className="scouting-player-cell">
                          <span className="scouting-player-avatar">
                            {(player.name || 'P').slice(0, 1).toUpperCase()}
                          </span>
                          <div>
                            <strong>{player.name}</strong>
                            <small>
                              {player.experience != null
                                ? `${player.experience} experience`
                                : 'Player profile'}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="scouting-role">
                          {player.role || 'Other'}
                        </span>
                      </td>
                      <td>{player.nationality || 'Not specified'}</td>
                      <td>
                        <span className="scouting-rating">
                          {player.overall ?? 'N/A'}
                          {player.overall != null && <small>/100</small>}
                        </span>
                      </td>
                      <td className="scouting-price">
                        {player.basePrice != null
                          ? fmt(player.basePrice)
                          : 'N/A'}
                      </td>
                      <td>
                        <span className={`scouting-status ${playerStatus}`}>
                          {playerStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
