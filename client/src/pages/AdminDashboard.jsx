import { useEffect, useState } from 'react';
import { api } from '../api.js';
import LiveCard, { fmt } from '../components/LiveCard.jsx';

export default function AdminDashboard({ auction }) {
  const { state, error, tick, socket } = auction;
  const [teams, setTeams] = useState([]);
  const [unsold, setUnsold] = useState([]);

  useEffect(() => {
    api('/teams').then(setTeams);
    api('/players?status=unsold').then(setUnsold);
  }, [tick]);

  return (
    <div>
      <div className="filters">
        <button
            disabled={state?.status === 'live' || state?.ended}
            onClick={() => socket.emit('admin:next')}
        >
            Start next player
        </button>
        <button disabled={state?.ended} onClick={() => socket.emit('admin:reauction')}>
            Re-auction unsold
        </button>
        <button
            className="danger"
            disabled={state?.ended}
            onClick={() => {
            if (window.confirm('End the auction? Bidding will stop for everyone.')) socket.emit('admin:end');
            }}
        >
            End auction
        </button>
        <button
            className="danger"
            onClick={() => {
            if (window.confirm('Restart? This resets all purses, squads, lineups and match results.'))
                socket.emit('admin:restart');
            }}
        >
            Restart auction
        </button>
      </div>  
{state?.ended && <p className="result">Auction ended. Press "Restart auction" to start fresh.</p>}
      {error && <p className="error">{error}</p>}
      <LiveCard state={state} />

      <h2>Teams</h2>
      <div className="grid">
        {teams.map((t) => (
          <div className="card" key={t._id}>
            <h3>{t.name}</h3>
            <p>Purse: {fmt(t.purse)} · Players: {t.squad.length}</p>
            <ul>
              {t.squad.map((p) => (
                <li key={p._id}>{p.name} ({p.role}) {fmt(p.soldPrice)}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <h2>Unsold ({unsold.length})</h2>
      <ul>
        {unsold.map((p) => (
          <li key={p._id}>{p.name} ({p.role}), base {fmt(p.basePrice)}</li>
        ))}
      </ul>
    </div>
  );
}