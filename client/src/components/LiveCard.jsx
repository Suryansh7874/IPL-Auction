import { useEffect, useState } from 'react';

export const fmt = (lakh) => (lakh >= 100 ? `₹${(lakh / 100).toFixed(2)} Cr` : `₹${lakh} L`);

function Countdown({ endsAt }) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    const id = setInterval(
      () => setLeft(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))),
      250
    );
    return () => clearInterval(id);
  }, [endsAt]);
  return <b>{left}s</b>;
}

export default function LiveCard({ state }) {
  if (!state) return <div className="card wide">Connecting…</div>;
  const p = state.player;
  const r = state.lastResult;

  return (
    <div className="card wide">
      {state.ended && <p className="result">AUCTION ENDED</p>}
      {r && r.type !== 'ended' && (
        <p className="result">
          {r.type === 'sold'
            ? `SOLD: ${r.player} to ${r.team} for ${fmt(r.price)}`
            : `UNSOLD: ${r.player}`}
        </p>
      )}
      {!p ? (
        <p>{state.ended ? 'The auction is over.' : 'Waiting for the admin to start the next player…'}</p>
      ) : (
        <>
          <h2>
            {p.name} <small>{p.role} · {p.nationality}</small>
          </h2>
          <p>
            Bat {p.batting} · Bowl {p.bowling} · Field {p.fielding} · Exp {p.experience} ·{' '}
            <b>Overall {p.overall}</b>
          </p>
          <p>Base price: {fmt(p.basePrice)}</p>
          <h1>
            {fmt(state.currentBid)}{' '}
            <small>{state.leader ? `by ${state.leader.name}` : 'no bids yet'}</small>
          </h1>
          <p>Time left: <Countdown endsAt={state.endsAt} /></p>
          <ul className="log">
            {[...state.log].reverse().map((b, i) => (
              <li key={i}>{b.team} bid {fmt(b.amount)}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}