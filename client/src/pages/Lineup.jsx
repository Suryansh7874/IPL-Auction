
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';

export default function Lineup({ session }) {
  const [squad, setSquad] = useState([]);
  const [xi, setXi] = useState([]);
  const [bowlers, setBowlers] = useState([]);
  const [captain, setCaptain] = useState('');
  const [vc, setVc] = useState('');
  const [wk, setWk] = useState('');
  const [search, setSearch] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadLineup() {
      try {
        const [teams, lineup] = await Promise.all([
          api('/teams'),
          api('/lineups/me'),
        ]);

        if (!active) return;

        const myTeam = teams.find((t) => t._id === session.team);
        setSquad(myTeam?.squad || []);

        if (lineup) {
          setXi(lineup.players || []);
          setBowlers(lineup.bowlers || []);
          setCaptain(lineup.captain || '');
          setVc(lineup.viceCaptain || '');
          setWk(lineup.wicketkeeper || '');
        }
      } catch (e) {
        if (active) setError(e.message || 'Could not load your lineup.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadLineup();

    return () => {
      active = false;
    };
  }, [session.team]);

  const byId = Object.fromEntries(squad.map((p) => [p._id, p]));
  const xiPlayers = xi.map((id) => byId[id]).filter(Boolean);
  const overseas = xiPlayers.filter((p) => p.nationality !== 'India').length;
  const filteredSquad = useMemo(() => {
    const query = search.trim().toLowerCase();

    return squad.filter((p) =>
      [p.name, p.role, p.nationality].some((v) =>
        String(v || '').toLowerCase().includes(query)
      )
    );
  }, [squad, search]);

  const isComplete =
    xiPlayers.length === 11 &&
    overseas <= 4 &&
    bowlers.length >= 5 &&
    bowlers.length <= 6 &&
    Boolean(captain) &&
    Boolean(vc) &&
    captain !== vc &&
    Boolean(wk) &&
    xi.includes(captain) &&
    xi.includes(vc) &&
    xi.includes(wk);

  function toggleXi(id) {
    setMsg('');
    setError('');

    if (xi.includes(id)) {
      setXi((current) => current.filter((x) => x !== id));
      setBowlers((current) => current.filter((x) => x !== id));
      if (captain === id) setCaptain('');
      if (vc === id) setVc('');
      if (wk === id) setWk('');
      return;
    }

    if (xi.length >= 11) {
      setError('Your Playing XI is full. Remove a player before adding another.');
      return;
    }

    const player = byId[id];
    if (player?.nationality !== 'India' && overseas >= 4) {
      setError('You can select a maximum of 4 overseas players.');
      return;
    }

    setXi((current) => [...current, id]);
  }

  function move(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= xi.length) return;

    setXi((current) => {
      const copy = [...current];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  function toggleBowler(id) {
    setMsg('');
    setError('');

    if (bowlers.includes(id)) {
      setBowlers((current) => current.filter((x) => x !== id));
    } else if (bowlers.length < 6) {
      setBowlers((current) => [...current, id]);
    } else {
      setError('You can designate a maximum of 6 bowlers.');
    }
  }

  function pickCaptain(id) {
    setCaptain(id);
    if (vc === id) setVc('');
    setMsg('');
    setError('');
  }

  function pickVc(id) {
    setVc(id);
    if (captain === id) setCaptain('');
    setMsg('');
    setError('');
  }

  async function save() {
    setMsg('');
    setError('');

    if (xiPlayers.length !== 11) {
      setError('Select exactly 11 players before saving.');
      return;
    }
    if (overseas > 4) {
      setError('A Playing XI can have a maximum of 4 overseas players.');
      return;
    }
    if (bowlers.length < 5 || bowlers.length > 6) {
      setError('Select 5 or 6 designated bowlers.');
      return;
    }
    if (!captain || !vc || captain === vc) {
      setError('Choose different players as captain and vice-captain.');
      return;
    }
    if (!wk || !xi.includes(wk) || byId[wk]?.role !== 'WK') {
      setError('Choose a selected wicketkeeper.');
      return;
    }

    setSaving(true);

    try {
      await api('/lineups/me', {
        method: 'PUT',
        body: {
          players: xi,
          bowlers,
          captain,
          viceCaptain: vc,
          wicketkeeper: wk,
        },
      });

      setMsg('Playing XI saved successfully.');
    } catch (e) {
      setError(e.message || 'Could not save your lineup.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="lineup-loading">
        <span className="lineup-loader" />
        Loading your squad and saved lineup...
      </div>
    );
  }

  return (
    <div className="lineup-page">
      <header className="lineup-hero">
        <div>
          <span className="eyebrow">FRANCHISE STRATEGY / TEAM SELECTION</span>
          <h2>Build Your Playing XI</h2>
          <p>Select your starters, arrange the batting order, and assign match roles.</p>
        </div>
        <div className="lineup-hero-count">
          <strong>{xiPlayers.length}<small>/11</small></strong>
          <span>PLAYERS SELECTED</span>
        </div>
      </header>

      <section className="lineup-progress-panel">
        <div className="lineup-progress-copy">
          <div>
            <span className="eyebrow">SQUAD READINESS</span>
            <h3>{xiPlayers.length === 11 ? 'Starting XI selected' : 'Build your starting XI'}</h3>
          </div>
          <strong>{Math.round((xiPlayers.length / 11) * 100)}%</strong>
        </div>

        <div className="lineup-progress-track">
          <div style={{ width: `${Math.min(100, (xiPlayers.length / 11) * 100)}%` }} />
        </div>

        <div className="lineup-rule-summary">
          <span className={xiPlayers.length === 11 ? 'rule-ok' : ''}>
            <b>{xiPlayers.length}/11</b> Players
          </span>
          <span className={overseas <= 4 ? 'rule-ok' : 'rule-warning'}>
            <b>{overseas}/4</b> Overseas
          </span>
          <span className={bowlers.length >= 5 && bowlers.length <= 6 ? 'rule-ok' : ''}>
            <b>{bowlers.length}/6</b> Bowlers
          </span>
        </div>
      </section>

      
{error && (
  <div className="lineup-error-toast" role="alert">
    <span className="lineup-error-icon">!</span>
    <span className="lineup-error-text">{error}</span>
    <button
      type="button"
      onClick={() => setError('')}
      aria-label="Dismiss error"
    >
      ×
    </button>
  </div>
)}


{msg && (
  <div className="lineup-success-toast" role="status">
    <span className="lineup-success-icon">✓</span>
    <span className="lineup-success-text">{msg}</span>
    <button
      type="button"
      onClick={() => setMsg('')}
      aria-label="Dismiss success message"
    >
      ×
    </button>
  </div>
)}



      <section className="lineup-section">
        <header className="lineup-section-header">
          <div>
            <span className="eyebrow">01 / PLAYER POOL</span>
            <h3>Your squad</h3>
            <p>Select players to add them to your starting XI.</p>
          </div>

          <label className="lineup-search">
            <span aria-hidden="true">⌕</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search squad..."
              aria-label="Search squad"
            />
          </label>
        </header>

        {squad.length === 0 ? (
          <div className="lineup-empty">
            Your squad is empty. Acquire players in the auction first.
          </div>
        ) : (
          <div className="lineup-player-grid">
            {filteredSquad.map((p) => {
              const selected = xi.includes(p._id);

              return (
                <article className={`lineup-player-card ${selected ? 'selected' : ''}`} key={p._id}>
                  <div className="lineup-player-card-top">
                    <span className="lineup-player-avatar">
                      {(p.name || 'P').slice(0, 1).toUpperCase()}
                    </span>
                    <span className={`lineup-selection-mark ${selected ? 'checked' : ''}`}>
                      {selected ? '✓' : '+'}
                    </span>
                  </div>

                  <h4>{p.name}</h4>
                  <div className="lineup-player-meta">
                    <span>{p.role}</span>
                    <span>{p.nationality}</span>
                  </div>

                  <div className="lineup-player-rating">
                    <span>OVERALL RATING</span>
                    <strong>{p.overall ?? 'N/A'}<small>{p.overall != null ? '/100' : ''}</small></strong>
                  </div>

                  <div className="lineup-player-mini-stats">
                    <span>BAT <b>{p.batting ?? '-'}</b></span>
                    <span>BOWL <b>{p.bowling ?? '-'}</b></span>
                    <span>FIELD <b>{p.fielding ?? '-'}</b></span>
                  </div>

                  <button
                    type="button"
                    className={`lineup-select-button ${selected ? 'remove' : ''}`}
                    onClick={() => toggleXi(p._id)}
                    disabled={!selected && xi.length >= 11}
                  >
                    {selected ? 'Remove from XI' : xi.length >= 11 ? 'XI Full' : 'Add to XI'}
                  </button>
                </article>
              );
            })}
          </div>
        )}

        {filteredSquad.length === 0 && squad.length > 0 && (
          <div className="lineup-empty">No players match your search.</div>
        )}
      </section>

      <section className="lineup-section">
        <header className="lineup-section-header">
          <div>
            <span className="eyebrow">02 / MATCH FORMATION</span>
            <h3>Playing XI & batting order</h3>
            <p>Move players up or down to arrange the batting order.</p>
          </div>
          <span className="lineup-count-pill">{xiPlayers.length} / 11 selected</span>
        </header>

        <div className="lineup-pitch">
          <div className="lineup-pitch-heading">
            <span>STARTING LINEUP</span>
            <span>BAT FIRST, PLAY SMART</span>
          </div>

          {xiPlayers.length === 0 ? (
            <div className="lineup-pitch-empty">
              <span>🏏</span>
              <h4>Your pitch is waiting</h4>
              <p>Add players from your squad to build your XI.</p>
            </div>
          ) : (
            <div className="lineup-order-list">
              {xiPlayers.map((p, i) => (
                <div className="lineup-order-row" key={p._id}>
                  <span className="lineup-order-number">
                    {String(i + 1).padStart(2, '0')}
                  </span>

                  <div className="lineup-order-avatar">
                    {(p.name || 'P').slice(0, 1).toUpperCase()}
                  </div>

                  <div className="lineup-order-player">
                    <strong>{p.name}</strong>
                    <span>{p.role} · {p.nationality}</span>
                  </div>

                  <div className="lineup-order-badges">
                    {captain === p._id && <span className="role-badge captain">C</span>}
                    {vc === p._id && <span className="role-badge vice-captain">VC</span>}
                    {wk === p._id && <span className="role-badge keeper">WK</span>}
                    {bowlers.includes(p._id) && <span className="role-badge bowler">BOWL</span>}
                  </div>

                  <div className="lineup-order-actions">
                    <button type="button" className="lineup-move-button" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${p.name} up`}>↑</button>
                    <button type="button" className="lineup-move-button" disabled={i === xiPlayers.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${p.name} down`}>↓</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="lineup-section">
        <header className="lineup-section-header">
          <div>
            <span className="eyebrow">03 / LEADERSHIP & ROLES</span>
            <h3>Match strategy</h3>
            <p>Assign leadership, wicketkeeping, and designated bowlers.</p>
          </div>
        </header>

        <div className="lineup-strategy-grid">
          <div className="lineup-strategy-card">
            <span className="lineup-strategy-icon">C</span>
            <h4>Captain</h4>
            <p>Lead the team on the field.</p>
            <select value={captain} onChange={(e) => pickCaptain(e.target.value)}>
              <option value="">Select captain</option>
              {xiPlayers.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>

          <div className="lineup-strategy-card">
            <span className="lineup-strategy-icon">VC</span>
            <h4>Vice-captain</h4>
            <p>Second-in-command.</p>
            <select value={vc} onChange={(e) => pickVc(e.target.value)}>
              <option value="">Select vice-captain</option>
              {xiPlayers.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>

          <div className="lineup-strategy-card">
            <span className="lineup-strategy-icon">WK</span>
            <h4>Wicketkeeper</h4>
            <p>Choose a player with the WK role.</p>
            <select value={wk} onChange={(e) => { setWk(e.target.value); setMsg(''); }}>
              <option value="">Select wicketkeeper</option>
              {xiPlayers.filter((p) => p.role === 'WK').map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="lineup-bowler-panel">
          <div className="lineup-bowler-header">
            <div>
              <h4>Bowling unit</h4>
              <p>Designate 5 or 6 bowlers from your Playing XI.</p>
            </div>
            <strong className={bowlers.length >= 5 && bowlers.length <= 6 ? 'rule-ok' : ''}>
              {bowlers.length}/6
            </strong>
          </div>

          {xiPlayers.length === 0 ? (
            <p className="lineup-empty-inline">Select players for your XI first.</p>
          ) : (
            <div className="lineup-bowler-list">
              {xiPlayers.map((p) => (
                <label className={`lineup-bowler-option ${bowlers.includes(p._id) ? 'selected' : ''}`} key={p._id}>
                  <input
                    type="checkbox"
                    checked={bowlers.includes(p._id)}
                    onChange={() => toggleBowler(p._id)}
                  />
                  <span className="lineup-custom-check">{bowlers.includes(p._id) ? '✓' : ''}</span>
                  <span className="lineup-bowler-name">
                    <strong>{p.name}</strong>
                    <small>{p.role} · Bowling {p.bowling ?? '-'}</small>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      </section>

      <footer className="lineup-save-panel">
        <div>
          <span className="eyebrow">FINAL CHECK</span>
          <h3>{isComplete ? 'Your lineup is ready to save' : 'Complete your lineup'}</h3>
          <p>
            {xiPlayers.length}/11 players · {overseas}/4 overseas ·
            {' '}{bowlers.length} designated bowlers
          </p>
        </div>

        <button
          type="button"
          className="lineup-save-button"
          onClick={save}
          disabled={saving}
        >
          {saving ? 'Saving lineup...' : 'Save Playing XI'}
        </button>
      </footer>
    </div>
  );
}
