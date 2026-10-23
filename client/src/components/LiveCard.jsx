
import { useEffect, useState } from 'react';

export const fmt = (lakh) =>
  lakh >= 100
    ? `₹${(lakh / 100).toFixed(2)} Cr`
    : `₹${lakh} L`;

function Countdown({ endsAt }) {
  const [left, setLeft] = useState(() =>
    Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
  );

  useEffect(() => {
    const update = () =>
      setLeft(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));

    update();
    const id = setInterval(update, 250);
    return () => clearInterval(id);
  }, [endsAt]);

  return (
    <span className={`timer ${left <= 5 ? 'low' : ''}`}>
      {String(left).padStart(2, '0')}
      <small> SEC</small>
    </span>
  );
}

function Stat({ label, value }) {
  return (
    <div className="auction-stat">
      <span>{label}</span>
      <strong>{value ?? '-'}</strong>
    </div>
  );
}

export default function LiveCard({ state }) {
  if (!state) {
    return (
      <section className="auction-panel auction-waiting">
        <span className="eyebrow">IPL AUCTION ARENA</span>
        <div className="auction-status-dot" />
        <h2>Connecting to auction room</h2>
        <p>Establishing a live connection. Please wait...</p>
      </section>
    );
  }

  const p = state.player;
  const r = state.lastResult;
  const leader = state.leader;

  return (
    <section className="auction-panel">
      <header className="auction-panel-header">
        <div>
          <span className="eyebrow">IPL AUCTION ARENA</span>
          <h2 className="auction-heading">The Auction Room</h2>
        </div>

        <span className={`auction-live-badge ${state.ended ? 'is-ended' : ''}`}>
          <span />
          {state.ended ? 'ENDED' : state.status === 'live' ? 'LIVE AUCTION' : 'STANDBY'}
        </span>
      </header>

      {r && r.type !== 'ended' && (
        <div className={`auction-result ${r.type === 'sold' ? 'sold' : 'unsold'}`}>
          <span className="result-symbol">
            {r.type === 'sold' ? '✓' : '!' }
          </span>
          <div>
            <strong>{r.type === 'sold' ? 'PLAYER SOLD' : 'PLAYER UNSOLD'}</strong>
            <p>
              {r.type === 'sold'
                ? `${r.player} → ${r.team} for ${fmt(r.price)}`
                : `${r.player} went unsold`}
            </p>
          </div>
        </div>
      )}

      {state.ended && (
        <div className="auction-ended-banner">
          <span>AUCTION COMPLETE</span>
          <p>The auction has ended. Thanks for participating.</p>
        </div>
      )}

      {!p ? (
        <div className="auction-waiting">
          <div className="auction-waiting-icon">🏏</div>
          <h3>{state.ended ? 'Auction complete' : 'Waiting for the next player'}</h3>
          <p>
            {state.ended
              ? 'All auction activity has stopped.'
              : 'The auction administrator will bring the next player into the room.'}
          </p>
        </div>
      ) : (
        <>
          <div className="auction-player">
            <div className="auction-player-top">
              <span className="auction-player-label">NOW ON THE BLOCK</span>
              <span className="auction-role">{p.role}</span>
            </div>

            <h1 className="auction-player-name">{p.name}</h1>

            <div className="auction-player-meta">
              <span>{p.nationality}</span>
              <span>Base price {fmt(p.basePrice)}</span>
            </div>

            <div className="auction-stats-grid">
              <Stat label="BATTING" value={p.batting} />
              <Stat label="BOWLING" value={p.bowling} />
              <Stat label="FIELDING" value={p.fielding} />
              <Stat label="EXPERIENCE" value={p.experience} />
            </div>

            <div className="auction-overall">
              <span>PLAYER OVERALL RATING</span>
              <strong>{p.overall}<small>/100</small></strong>
            </div>
          </div>

          <div className="auction-bid-board">
            <div className="auction-bid-top">
              <span className="eyebrow">CURRENT HIGHEST BID</span>
              <div className="auction-countdown">
                <span className="auction-countdown-label">TIME LEFT</span>
                <Countdown endsAt={state.endsAt} />
              </div>
            </div>

            <div className="auction-price">{fmt(state.currentBid)}</div>

            <div className="auction-leader">
              <span className="auction-leader-icon">↗</span>
              <div>
                <span>LEADING TEAM</span>
                <strong>{leader?.name || 'No bids yet'}</strong>
              </div>
            </div>
          </div>

          <div className="auction-history">
            <div className="auction-section-heading">
              <div>
                <span className="eyebrow">BID ACTIVITY</span>
                <h3>Recent bids</h3>
              </div>
              <span className="auction-history-count">
                {state.log?.length || 0} bids
              </span>
            </div>

            {state.log?.length ? (
              <ol className="auction-bid-list">
                {[...state.log].reverse().map((bid, i) => (
                  <li key={`${bid.team}-${bid.amount}-${i}`}>
                    <span className="auction-bid-rank">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="auction-bid-team">{bid.team}</span>
                    <strong>{fmt(bid.amount)}</strong>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="auction-no-bids">
                No bids yet. Who will make the opening move?
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
