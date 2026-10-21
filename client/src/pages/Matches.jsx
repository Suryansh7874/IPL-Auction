import { useEffect, useState } from 'react';
import { api } from '../api.js';

const sc = (s) => `${s.runs}/${s.wkts} (${s.overs})`;

export default function Matches({ session, tick }) {
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [error, setError] = useState('');

  const load = () => api('/matches').then(setMatches);
  useEffect(() => {
    load();
    api('/teams').then(setTeams);
  }, [tick]);

  async function simulate() {
    setError('');
    try {
      await api('/matches', { method: 'POST', body: { teamA: a, teamB: b } });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  const teamSelect = (value, setValue) => (
    <select value={value} onChange={(e) => setValue(e.target.value)}>
      <option value="">-- team --</option>
      {teams.map((t) => (
        <option key={t._id} value={t._id}>{t.name}</option>
      ))}
    </select>
  );

  return (
    <div>
      {session.role === 'admin' && (
        <div className="card wide">
          <h3>Simulate a match</h3>
          {teamSelect(a, setA)} vs {teamSelect(b, setB)}{' '}
          <button onClick={simulate}>Play match</button>
          {error && <p className="error">{error}</p>}
        </div>
      )}

      <h2>Results</h2>
      {matches.length === 0 && <p>No matches played yet.</p>}
      {matches.filter((m) => m.teamA && m.teamB).map((m) => (
        <div className="card wide" key={m._id}>
          <p>
            <b>{m.teamA.shortName}</b> {sc(m.scoreA)} vs <b>{m.teamB.shortName}</b> {sc(m.scoreB)}
          </p>
          <p className="result">{m.summary}</p>
          <p>
            Player of the match: {m.potm}{' '}
            <small>
              Team strength → {m.teamA.shortName}: bat {m.ratings?.A.bat}, bowl {m.ratings?.A.bowl} |{' '}
              {m.teamB.shortName}: bat {m.ratings?.B.bat}, bowl {m.ratings?.B.bowl}
            </small>
          </p>
        </div>
      ))}
    </div>
  );
}