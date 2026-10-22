import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Lineup({ session }) {
  const [squad, setSquad] = useState([]);
  const [xi, setXi] = useState([]); // player ids, in batting order
  const [bowlers, setBowlers] = useState([]);
  const [captain, setCaptain] = useState('');
  const [vc, setVc] = useState('');
  const [wk, setWk] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api('/teams').then((teams) =>
      setSquad(teams.find((t) => t._id === session.team)?.squad || [])
    );
    api('/lineups/me').then((l) => {
      if (!l) return;
      setXi(l.players);
      setBowlers(l.bowlers);
      setCaptain(l.captain);
      setVc(l.viceCaptain);
      setWk(l.wicketkeeper);
    });
  }, []);

  const byId = Object.fromEntries(squad.map((p) => [p._id, p]));
  const xiPlayers = xi.map((id) => byId[id]).filter(Boolean);
  const overseas = xiPlayers.filter((p) => p.nationality !== 'India').length;

  function toggleXi(id) {
    if (xi.includes(id)) {
      setXi(xi.filter((x) => x !== id));
      setBowlers(bowlers.filter((x) => x !== id));
      if (captain === id) setCaptain('');
      if (vc === id) setVc('');
      if (wk === id) setWk('');
    } else if (xi.length < 11) {
      setXi([...xi, id]);
    }
  }

  function move(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= xi.length) return;
    const copy = [...xi];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    setXi(copy);
  }

  function toggleBowler(id) {
    if (bowlers.includes(id)) setBowlers(bowlers.filter((x) => x !== id));
    else if (bowlers.length < 6) setBowlers([...bowlers, id]);
  }

  function pickCaptain(id) {
    setCaptain(id);
    if (vc === id) setVc('');
  }

  function pickVc(id) {
    setVc(id);
    if (captain === id) setCaptain('');
  }

  async function save() {
    setMsg('');
    setError('');
    try {
      await api('/lineups/me', {
        method: 'PUT',
        body: { players: xi, bowlers, captain, viceCaptain: vc, wicketkeeper: wk },
      });
      setMsg('Lineup saved!');
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      <div className="card wide">
        <h3>Squad ({squad.length}): tap to add or remove</h3>
        {squad.length < 11 && <p className="error">You need at least 11 players.</p>}
        <ul className="plain">
          {squad.map((p) => (
            <li key={p._id}>
              <button
                className={xi.includes(p._id) ? 'active' : 'ghost'}
                onClick={() => toggleXi(p._id)}
              >
                {xi.includes(p._id) ? '✓' : '+'}
              </button>{' '}
              {p.name}{' '}
              <small>
                {p.role} · {p.nationality} · Bat {p.batting} Bowl {p.bowling} · OVR {p.overall}
              </small>
            </li>
          ))}
        </ul>
      </div>

      <div className="card wide">
        <h3>
          Playing XI ({xi.length}/11) · Overseas {overseas}/4 · Bowlers {bowlers.length} (need 5–6)
        </h3>
        <p><small>Row order = batting order. Use ▲ ▼ to change it.</small></p>

        {xiPlayers.length === 0 ? (
          <p><small>Add players from your squad above.</small></p>
        ) : (
          <div className="table-scroll">
            <table className="xi-table responsive-table">
  <thead>
    <tr>
      <th>#</th>
      <th>Player</th>
      <th>Role</th>
      <th>Bat</th>
      <th>Bowl</th>
      <th>Field</th>
      <th>Bowls</th>
      <th>C</th>
      <th>VC</th>
      <th>WK</th>
      <th>Order</th>
    </tr>
  </thead>
  <tbody>
    {xiPlayers.map((p, i) => (
      <tr key={p._id}>
        <td data-label="#" className="hide-mobile">{i + 1}</td>
        <td data-label="Player" className="primary">{i + 1}. {p.name}</td>
        <td data-label="Role">{p.role}</td>
        <td data-label="Bat">{p.batting}</td>
        <td data-label="Bowl">{p.bowling}</td>
        <td data-label="Field">{p.fielding}</td>
        <td data-label="Bowls">
          <input
            type="checkbox"
            checked={bowlers.includes(p._id)}
            onChange={() => toggleBowler(p._id)}
          />
        </td>
        <td data-label="Captain">
          <input
            type="radio"
            name="captain"
            checked={captain === p._id}
            onChange={() => pickCaptain(p._id)}
          />
        </td>
        <td data-label="Vice-captain">
          <input
            type="radio"
            name="vc"
            checked={vc === p._id}
            onChange={() => pickVc(p._id)}
          />
        </td>
        <td data-label="Keeper">
          <input
            type="radio"
            name="wk"
            disabled={p.role !== 'WK'}
            checked={wk === p._id}
            onChange={() => setWk(p._id)}
          />
        </td>
        <td data-label="Order">
          <span>
            <button className="ghost" onClick={() => move(i, -1)}>▲</button>{' '}
            <button className="ghost" onClick={() => move(i, 1)}>▼</button>
          </span>
        </td>
      </tr>
    ))}
  </tbody>
</table>
          </div>
        )}

        {error && <p className="error">{error}</p>}
        {msg && <p className="result">{msg}</p>}
        <button onClick={save}>Save lineup</button>
      </div>
    </div>
  );
}