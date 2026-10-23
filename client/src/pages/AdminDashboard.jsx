
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import LiveCard, { fmt } from '../components/LiveCard.jsx';

export default function AdminDashboard({ auction }) {
  const { state, error, tick, socket } = auction;
  const [teams, setTeams] = useState([]);
  const [unsold, setUnsold] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        const [teamData, playerData] = await Promise.all([
          api('/teams'),
          api('/players?status=unsold'),
        ]);

        if (active) {
          setTeams(Array.isArray(teamData) ? teamData : []);
          setUnsold(Array.isArray(playerData) ? playerData : []);
        }
      } catch {
        if (active) {
          setTeams([]);
          setUnsold([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      active = false;
    };
  }, [tick]);

  const emitAction = (event, message) => {
    if (!socket?.connected) {
      window.alert('Auction server is reconnecting. Please try again.');
      return;
    }

    if (message && !window.confirm(message)) return;
    socket.emit(event);
  };

  const totalPlayers = teams.reduce(
    (total, team) => total + (team.squad?.length || 0),
    0
  );

  const totalSpent = teams.reduce(
    (total, team) =>
      total +
      (team.squad || []).reduce(
        (sum, player) => sum + (player.soldPrice || 0),
        0
      ),
    0
  );

  return (
    <div className="admin-auction-page">
      <header className="admin-welcome">
        <div>
          <span className="eyebrow">COMMAND CENTER / ADMINISTRATOR</span>
          <h2>Auction Control Room</h2>
          <p>Manage the auction, monitor franchises, and track player availability.</p>
        </div>

        <span className="admin-mode-tag">
          <span />
          ADMIN MODE
        </span>
      </header>

      {error && (
        <div className="admin-alert" role="status">
          {error}
        </div>
      )}

      <section className="admin-quick-stats">
        <div className="admin-quick-stat">
          <span>FRANCHISES</span>
          <strong>{teams.length}</strong>
        </div>

        <div className="admin-quick-stat">
          <span>PLAYERS ACQUIRED</span>
          <strong>{totalPlayers}</strong>
        </div>

        <div className="admin-quick-stat">
          <span>PLAYERS UNSOLD</span>
          <strong>{unsold.length}</strong>
        </div>

        <div className="admin-quick-stat">
          <span>TOTAL SPENT</span>
          <strong>{fmt(totalSpent)}</strong>
        </div>
      </section>

      <section className="admin-control-panel">
        <header className="admin-section-heading">
          <div>
            <span className="eyebrow">LIVE OPERATIONS</span>
            <h3>Auction controls</h3>
          </div>

          <span className={`admin-connection ${socket?.connected ? 'online' : ''}`}>
            {socket?.connected ? 'CONNECTED' : 'RECONNECTING'}
          </span>
        </header>

        <div className="admin-control-grid">
          <button
            className="admin-action-button primary"
            disabled={!socket?.connected || state?.ended}
            onClick={() => emitAction('admin:next')}
          >
            <span className="admin-action-icon">▶</span>
            <span>
              <strong>Next player</strong>
              <small>Advance the auction</small>
            </span>
          </button>

          <button
            className="admin-action-button"
            disabled={!socket?.connected || state?.ended}
            onClick={() =>
              emitAction(
                'admin:reauction',
                'Start a reauction for the available unsold player?'
              )
            }
          >
            <span className="admin-action-icon">↻</span>
            <span>
              <strong>Reauction</strong>
              <small>Revisit an unsold player</small>
            </span>
          </button>

          <button
            className="admin-action-button danger"
            disabled={!socket?.connected || state?.ended}
            onClick={() =>
              emitAction(
                'admin:end',
                'Are you sure you want to end the auction?'
              )
            }
          >
            <span className="admin-action-icon">■</span>
            <span>
              <strong>End auction</strong>
              <small>Stop auction activity</small>
            </span>
          </button>

          <button
            className="admin-action-button reset"
            disabled={!socket?.connected}
            onClick={() =>
              emitAction(
                'admin:restart',
                'Restart the auction? Confirm only if you intend to reset the current auction.'
              )
            }
          >
            <span className="admin-action-icon">⟳</span>
            <span>
              <strong>Restart auction</strong>
              <small>Reset auction state</small>
            </span>
          </button>
        </div>

        <p className="admin-control-note">
          Restarting may reset auction progress. Use it only when you intend to begin again.
        </p>
      </section>

      <section className="admin-live-section">
        <div className="admin-section-heading">
          <div>
            <span className="eyebrow">REAL-TIME MONITOR</span>
            <h3>Live auction feed</h3>
          </div>
        </div>

        <LiveCard state={state} />
      </section>

      <section className="admin-teams-section">
        <header className="admin-section-heading">
          <div>
            <span className="eyebrow">FRANCHISE INTELLIGENCE</span>
            <h3>Team overview</h3>
          </div>
          <span className="admin-section-count">{teams.length} teams</span>
        </header>

        {loading ? (
          <p className="admin-empty-state">Loading franchise data...</p>
        ) : teams.length === 0 ? (
          <p className="admin-empty-state">No team data available.</p>
        ) : (
          <div className="admin-team-grid">
            {teams.map((team) => {
              const squad = team.squad || [];
              const overseas = squad.filter(
                (player) => player.nationality !== 'India'
              ).length;

              return (
                <article className="admin-team-card" key={team._id}>
                  <div className="admin-team-card-top">
                    <div className="admin-team-avatar">
                      {(team.name || 'T').slice(0, 1).toUpperCase()}
                    </div>
                    <div className="admin-team-title">
                      <h4>{team.name}</h4>
                      <span>{squad.length} players acquired</span>
                    </div>
                  </div>

                  <div className="admin-team-purse">
                    <span>PURSE REMAINING</span>
                    <strong>{fmt(team.purse)}</strong>
                  </div>

                  <div className="admin-team-progress">
                    <span>Squad completion</span>
                    <span>{squad.length}/25</span>
                  </div>

                  <div className="admin-progress-track">
                    <div
                      style={{
                        width: `${Math.min(100, (squad.length / 25) * 100)}%`,
                      }}
                    />
                  </div>

                  <div className="admin-team-footer">
                    <span>Overseas players</span>
                    <strong>{overseas}/8</strong>
                  </div>

                  {squad.length > 0 && (
                    <details className="admin-roster-details">
                      <summary>View acquired players</summary>
                      <ul>
                        {squad.map((player) => (
                          <li key={player._id}>
                            <span>
                              <strong>{player.name}</strong>
                              <small>{player.role}</small>
                            </span>
                            <strong>{fmt(player.soldPrice)}</strong>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="admin-unsold-section">
        <header className="admin-section-heading">
          <div>
            <span className="eyebrow">PLAYER MARKET</span>
            <h3>Unsold players</h3>
          </div>
          <span className="admin-section-count">{unsold.length} available</span>
        </header>

        {loading ? (
          <p className="admin-empty-state">Loading player list...</p>
        ) : unsold.length === 0 ? (
          <p className="admin-empty-state">
            No unsold players found. The available-player list is clear.
          </p>
        ) : (
          <div className="admin-unsold-list">
            {unsold.map((player) => (
              <div className="admin-unsold-row" key={player._id}>
                <div className="admin-unsold-avatar">
                  {(player.name || 'P').slice(0, 1).toUpperCase()}
                </div>

                <div className="admin-unsold-player">
                  <strong>{player.name}</strong>
                  <span>{player.role} · {player.nationality}</span>
                </div>

                <div className="admin-unsold-price">
                  <span>BASE PRICE</span>
                  <strong>{fmt(player.basePrice)}</strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
