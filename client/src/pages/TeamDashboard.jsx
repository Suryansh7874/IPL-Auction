
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import LiveCard, { fmt } from '../components/LiveCard.jsx';

export default function TeamDashboard({ session, auction }) {
  const { state, error, tick, socket } = auction;
  const [team, setTeam] = useState(null);

  useEffect(() => {
    api('/teams')
      .then((teams) =>
        setTeam(teams.find((t) => t._id === session.team) || null)
      )
      .catch(() => setTeam(null));
  }, [tick, session.team]);

  const iAmLeading = state?.leader?.teamId === session.team;
  const canBid =
    state?.status === 'live' &&
    !state?.ended &&
    !iAmLeading &&
    Boolean(socket?.connected);

  const overseas = team
    ? team.squad.filter((p) => p.nationality !== 'India').length
    : 0;

  const bidLabel = state?.ended
    ? 'AUCTION ENDED'
    : state?.status !== 'live'
      ? 'WAITING FOR AUCTION'
      : iAmLeading
        ? 'YOU ARE THE HIGHEST BIDDER'
        : !socket?.connected
          ? 'RECONNECTING...'
          : state?.nextBid
            ? `BID ${fmt(state.nextBid)}`
            : 'PLACE BID';

  return (
    <div className="team-auction-page">
      <div className="team-welcome">
        <div>
          <span className="eyebrow">FRANCHISE CONTROL CENTER</span>
          <h2>{team?.name || session.username}</h2>
          <p>Track your squad and compete for the best players.</p>
        </div>
        <span className="team-member-tag">TEAM CONSOLE</span>
      </div>

      {error && (
        <div className="team-auction-error" role="status">
          {error}
        </div>
      )}

      <LiveCard state={state} />

      <section className="team-bid-action">
        <div className="team-bid-action-copy">
          <span className="eyebrow">YOUR NEXT MOVE</span>
          <h3>
            {iAmLeading
              ? 'You are leading the bid'
              : state?.ended
                ? 'Auction completed'
                : state?.status === 'live'
                  ? 'Make your move'
                  : 'Get ready'}
          </h3>
          <p>
            {iAmLeading
              ? 'You currently hold the highest bid on this player.'
              : state?.ended
                ? 'No further bids can be placed.'
                : state?.status === 'live'
                  ? 'Place your bid before the timer runs out.'
                  : 'The next bidding round will appear here.'}
          </p>
        </div>

        <button
          type="button"
          className={`arena-bid-button ${iAmLeading ? 'is-leading' : ''}`}
          disabled={!canBid}
          onClick={() => socket?.emit('place_bid')}
        >
          <span>{bidLabel}</span>
          {canBid && state?.nextBid && (
            <small>Confirm next bid: {fmt(state.nextBid)}</small>
          )}
        </button>
      </section>

      {team && (
        <section className="team-squad-panel">
          <header className="team-section-header">
            <div>
              <span className="eyebrow">FRANCHISE OVERVIEW</span>
              <h3>Your squad</h3>
            </div>
            <span className="team-squad-count">
              {team.squad.length}/25 PLAYERS
            </span>
          </header>

          <div className="team-metrics">
            <div className="team-metric">
              <span>PURSE REMAINING</span>
              <strong>{fmt(team.purse)}</strong>
            </div>
            <div className="team-metric">
              <span>SQUAD SIZE</span>
              <strong>{team.squad.length}<small> / 25</small></strong>
            </div>
            <div className="team-metric">
              <span>OVERSEAS PLAYERS</span>
              <strong>{overseas}<small> / 8</small></strong>
            </div>
          </div>

          <div className="team-roster-heading">
            <h4>Acquired players</h4>
            <span>{team.squad.length} signed</span>
          </div>

          {team.squad.length === 0 ? (
            <div className="team-empty-squad">
              No players acquired yet. Your squad starts here.
            </div>
          ) : (
            <div className="team-roster-list">
              {team.squad.map((p, i) => (
                <div className="team-roster-row" key={p._id}>
                  <span className="team-roster-number">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="team-roster-player">
                    <strong>{p.name}</strong>
                    <span>{p.role} · {p.nationality}</span>
                  </div>
                  <span className="team-roster-price">
                    {fmt(p.soldPrice)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
