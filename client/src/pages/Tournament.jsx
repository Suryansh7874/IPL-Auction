import { useEffect, useState } from 'react';
import { api } from '../api.js';

const sc = (s) => `${s.runs}/${s.wkts} (${s.overs})`;
const short = (t) => (t ? t.shortName : 'TBD');

function Fixture({ f }) {
  return (
    <div className="card wide">
      <p><small>{f.label}</small></p>
      <p><b>{short(f.teamA)}</b> vs <b>{short(f.teamB)}</b></p>
      {f.match ? (
        <>
          <p>
            {short(f.teamA)} {sc(f.match.scoreA)} · {short(f.teamB)} {sc(f.match.scoreB)}
          </p>
          <p className="result">{f.match.summary}</p>
        </>
      ) : (
        <p><small>Upcoming</small></p>
      )}
    </div>
  );
}

export default function Tournament({ session, tick }) {
  const isAdmin = session.role === 'admin';
  const [data, setData] = useState(undefined); // undefined = loading, null = no tournament
  const [tName, setTName] = useState('IPL Season 1');
  const [rounds, setRounds] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = () =>
    api('/tournaments/current')
      .then(setData)
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, [tick]);

  async function call(path, options) {
    setBusy(true);
    setError('');
    try {
      await api(path, options);
      await load();
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  }

  const create = () =>
    call('/tournaments', { method: 'POST', body: { name: tName, rounds: Number(rounds) } });
  const play = (mode) =>
    call(`/tournaments/${data.tournament._id}/play`, { method: 'POST', body: { mode } });
  const reset = () => {
    if (window.confirm('Delete this tournament and all its matches?')) {
      call(`/tournaments/${data.tournament._id}`, { method: 'DELETE' });
    }
  };

  if (data === undefined) return <p>{error || 'Loading…'}</p>;

  // Abhi koi tournament nahi
  if (data === null) {
    return isAdmin ? (
      <div className="card wide">
        <h2>Start a tournament</h2>
        <p><small>Every team must save its lineup (My XI) first.</small></p>
        <input value={tName} onChange={(e) => setTName(e.target.value)} placeholder="Tournament name" />
        <select value={rounds} onChange={(e) => setRounds(e.target.value)}>
          <option value={1}>Single round-robin (each pair plays once)</option>
          <option value={2}>Double round-robin (each pair plays twice)</option>
        </select>
        {error && <p className="error">{error}</p>}
        <button disabled={busy} onClick={create}>Create tournament</button>
      </div>
    ) : (
      <p>No tournament has started yet. The admin will start one soon.</p>
    );
  }

  const t = data.tournament;
  const league = t.fixtures.filter((f) => f.stage === 'league');
  const playoffs = t.fixtures.filter((f) => f.stage !== 'league');
  const leagueDone = league.filter((f) => f.match).length;

  return (
    <div>
      <h2>
        {t.name} <small>{t.status}</small>
      </h2>
      {t.champion && <p className="result">🏆 Champions: {t.champion.name}</p>}
      <p><small>League: {leagueDone}/{league.length} matches played. Top 4 go to the playoffs.</small></p>

      {isAdmin && (
        <div className="filters">
          {t.status !== 'completed' && (
            <button disabled={busy} onClick={() => play('next')}>Play next match</button>
          )}
          {t.status === 'league' && (
            <button disabled={busy} onClick={() => play('league')}>Play all league matches</button>
          )}
          {t.status !== 'completed' && (
            <button disabled={busy} onClick={() => play('all')}>Play whole tournament</button>
          )}
          <button className="danger" disabled={busy} onClick={reset}>Delete tournament</button>
        </div>
      )}
      {error && <p className="error">{error}</p>}

      <h3>Points table</h3>
      <table className="responsive-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Team</th>
            <th>P</th>
            <th>W</th>
            <th>L</th>
            <th>Pts</th>
            <th>NRR</th>
          </tr>
        </thead>
        <tbody>
          {data.standings.map((s, i) => (
            <tr key={s.team._id}>
              <td data-label="#" className="hide-mobile">{i + 1}</td>
              <td data-label="Team" className="primary">{i + 1}. {s.team.name}</td>
              <td data-label="Played">{s.played}</td>
              <td data-label="Won">{s.won}</td>
              <td data-label="Lost">{s.lost}</td>
              <td data-label="Points"><b>{s.points}</b></td>
              <td data-label="NRR">{s.nrr >= 0 ? '+' : ''}{s.nrr.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {playoffs.length > 0 && (
        <>
          <h3>Playoffs</h3>
          <div className="grid">
            {playoffs.map((f) => <Fixture key={f._id} f={f} />)}
          </div>
        </>
      )}

      <h3>League matches</h3>
      <div className="grid">
        {league.map((f) => <Fixture key={f._id} f={f} />)}
      </div>
    </div>
  );
}