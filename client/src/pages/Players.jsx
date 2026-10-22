import { useEffect, useState } from 'react';
import { api } from '../api.js';

const ROLES = ['ALL', 'BAT', 'BOWL', 'AR', 'WK'];

export default function Players() {
  const [players, setPlayers] = useState([]);
  const [role, setRole] = useState('ALL');
  const [error, setError] = useState('');

  useEffect(() => {
    const query = role === 'ALL' ? '' : `?role=${role}`;
    api('/players' + query)
      .then(setPlayers)
      .catch((err) => setError(err.message));
  }, [role]);

  return (
    <div>
      <h2>Players ({players.length})</h2>
      <div className="filters">
        {ROLES.map((r) => (
          <button
            key={r}
            className={r === role ? 'active' : ''}
            onClick={() => setRole(r)}
          >
            {r}
          </button>
        ))}
      </div>
      {error && <p className="error">{error}</p>}
      <table className="responsive-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th>Country</th>
            <th>Base (lakh)</th>
            <th>Bat</th>
            <th>Bowl</th>
            <th>Field</th>
            <th>Exp</th>
            <th>Overall</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p) => (
            <tr key={p._id}>
              <td data-label="Name" className="primary">{p.name}</td>
              <td data-label="Role">{p.role}</td>
              <td data-label="Country">{p.nationality}</td>
              <td data-label="Base (lakh)">{p.basePrice}</td>
              <td data-label="Bat">{p.batting}</td>
              <td data-label="Bowl">{p.bowling}</td>
              <td data-label="Field">{p.fielding}</td>
              <td data-label="Exp">{p.experience}</td>
              <td data-label="Overall"><b>{p.overall}</b></td>
              <td data-label="Status">{p.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}