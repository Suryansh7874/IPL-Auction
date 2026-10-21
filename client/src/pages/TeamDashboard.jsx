import { useEffect, useState } from 'react';
import { api } from '../api.js';
import LiveCard, { fmt } from '../components/LiveCard.jsx';

export default function TeamDashboard({ session, auction }) {
  const { state, error, tick, socket } = auction;
  const [team, setTeam] = useState(null);

  useEffect(() => {
    api('/teams').then((teams) => setTeam(teams.find((t) => t._id === session.team)));
  }, [tick]);

  const iAmLeading = state?.leader?.teamId === session.team;
  const canBid = state?.status === 'live' && !iAmLeading;
  const overseas = team ? team.squad.filter((p) => p.nationality !== 'India').length : 0;

  const bidLabel = state?.ended
    ? 'AUCTION ENDED'
    : iAmLeading
    ? 'You are leading'
    : state?.nextBid
    ? `BID ${fmt(state.nextBid)}`
    : 'BID';

  return (
    <div>
      <LiveCard state={state} />
      {error && <p className="error">{error}</p>}
      <button
        className="bid-btn"
        disabled={!canBid}
        onClick={() => socket.emit('place_bid')}
      >
        {bidLabel}
      </button>

      {team && (
        <div className="card wide">
          <h2>{team.name}</h2>
          <p>
            Purse left: <b>{fmt(team.purse)}</b> · Squad {team.squad.length}/25 · Overseas {overseas}/8
          </p>
          <ul>
            {team.squad.map((p) => (
              <li key={p._id}>{p.name} ({p.role}) {fmt(p.soldPrice)}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}