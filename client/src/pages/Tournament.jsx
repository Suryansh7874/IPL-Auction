
import { useEffect, useState } from 'react';
import { api } from '../api.js';

const sc = (s) =>
  s ? `${s.runs}/${s.wkts} (${s.overs})` : 'Yet to play';

const short = (t) => (t ? t.shortName : 'TBD');

function Fixture({ f, index }) {
  return (
    <article className="tournament-fixture-card">
      <div className="tournament-fixture-top">
        <span>{f.stage === 'league' ? 'LEAGUE FIXTURE' : 'PLAYOFFS'}</span>
        <span>FIXTURE {String(index + 1).padStart(2, '0')}</span>
      </div>

      <div className="tournament-fixture-teams">
        <div>
          <span className="tournament-team-mark">
            {(short(f.teamA) || 'TBD').slice(0, 3)}
          </span>
          <strong>{short(f.teamA)}</strong>
        </div>

        <span className="tournament-fixture-vs">VS</span>

        <div>
          <span className="tournament-team-mark">
            {(short(f.teamB) || 'TBD').slice(0, 3)}
          </span>
          <strong>{short(f.teamB)}</strong>
        </div>
      </div>

      {f.match ? (
        <>
          <div className="tournament-fixture-score">
            <span>{short(f.teamA)} <b>{sc(f.match.scoreA)}</b></span>
            <span>{short(f.teamB)} <b>{sc(f.match.scoreB)}</b></span>
          </div>
          <p className="tournament-fixture-summary">
            {f.match.summary || 'Match completed.'}
          </p>
          <span className="tournament-fixture-status completed">
            ✓ COMPLETED
          </span>
        </>
      ) : (
        <div className="tournament-fixture-upcoming">
          <span className="tournament-status-dot" />
          Awaiting match
        </div>
      )}
    </article>
  );
}

export default function Tournament({ session, tick }) {
  const isAdmin = session.role === 'admin';

  const [data, setData] = useState(undefined);
  const [tName, setTName] = useState('IPL Season 1');
  const [rounds, setRounds] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [teams, setTeams] = useState([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState([]);

  async function load() {
    try {
      const result = await api('/tournaments/current');
      setData(result);
      setError('');
      return true;
    } catch (e) {
      setError(e.message || 'Could not load tournament.');
      return false;
    }
  }

  useEffect(() => {
    load();

    api('/tournaments/teams')
      .then((list) => {
        setTeams(list);
        setSelectedTeamIds((prev) =>
          prev.length ? prev : list.map((team) => team._id)
        );
      })
      .catch((e) => setError(e.message || 'Could not load teams.'));
  }, [tick]);

  async function call(path, options, successMessage) {
    setBusy(true);
    setError('');
    setMsg('');

    try {
      await api(path, options);
      const refreshed = await load();

      if (refreshed) {
        setMsg(successMessage);
      }
    } catch (e) {
      setError(e.message || 'Tournament action failed.');
    } finally {
      setBusy(false);
    }
  }

  function create() {
    if (!tName.trim()) {
      setError('Enter a tournament name.');
      return;
    }

    if (selectedTeamIds.length < 2) {
      setError('Select at least two participating teams.');
      return;
    }

    return call(
      '/tournaments',
      {
        method: 'POST',
        body: {
          name: tName.trim(),
          rounds: Number(rounds),
          teamIds: selectedTeamIds,
        },
      },
      'Tournament created successfully.'
    );
  }

  function play(mode) {
    return call(
      `/tournaments/${data.tournament._id}/play`,
      { method: 'POST', body: { mode } },
      mode === 'next'
        ? 'Next match played successfully.'
        : mode === 'league'
          ? 'League matches processed successfully.'
          : 'Tournament simulation completed.'
    );
  }

  function reset() {
    if (window.confirm('Delete this tournament and all its matches?')) {
      call(
        `/tournaments/${data.tournament._id}`,
        { method: 'DELETE' },
        'Tournament deleted successfully.'
      );
    }
  }

  if (data === undefined) {
    return (
      <div className="tournament-loading">
        {error ? (
          <>
            <h3>Could not load tournament</h3>
            <p>{error}</p>
            <button type="button" onClick={load}>
              Try again
            </button>
          </>
        ) : (
          <>
            <span className="tournament-spinner" />
            <p>Loading tournament centre...</p>
          </>
        )}
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="tournament-page">
        <section className="tournament-hero">
          <div className="tournament-hero-copy">
            <span className="tournament-eyebrow">IPL / TOURNAMENT CONTROL</span>
            <h1>The road to <span>glory.</span></h1>
            <p>
              Every champion starts somewhere. Set up your tournament
              and let the competition begin.
            </p>
          </div>
          <div className="tournament-hero-art" aria-hidden="true">
            <div className="tournament-orbit tournament-orbit-one" />
            <div className="tournament-orbit tournament-orbit-two" />
            <div className="tournament-trophy">🏆</div>
          </div>
        </section>

        {isAdmin ? (
          <section className="tournament-setup">
            <div className="tournament-section-heading">
              <div>
                <span className="tournament-kicker">ADMIN CONTROL</span>
                <h2>Create a tournament</h2>
                <p>Configure your competition before the first ball.</p>
              </div>
              <span className="tournament-admin-tag">ADMIN ONLY</span>
            </div>

            <div className="tournament-form-grid">
              <label className="tournament-field">
                <span>TOURNAMENT NAME</span>
                <input
                  value={tName}
                  onChange={(e) => setTName(e.target.value)}
                  placeholder="Enter tournament name"
                  disabled={busy}
                />
              </label>

              <label className="tournament-field">
                <span>COMPETITION FORMAT</span>
                <select
                  value={rounds}
                  onChange={(e) => setRounds(Number(e.target.value))}
                  disabled={busy}
                >
                  <option value={1}>
                    Single round-robin
                  </option>
                  <option value={2}>
                    Double round-robin
                  </option>
                </select>
              </label>
            </div>

            <div className="tournament-format-note">
              <span>ⓘ</span>
              {Number(rounds) === 1
                ? 'Each team plays every other team once.'
                : 'Each team plays every other team twice.'}
            </div>

            <div className="tournament-team-selection-header">
              <div>
                <h3>Participating teams</h3>
                <p>Select at least two teams to create the tournament.</p>
              </div>
              <strong>
                {selectedTeamIds.length}<span> / {teams.length}</span>
              </strong>
            </div>

            <div className="tournament-selection-actions">
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  setSelectedTeamIds(teams.map((team) => team._id))
                }
              >
                Select all
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setSelectedTeamIds([])}
              >
                Clear selection
              </button>
            </div>

            {teams.length === 0 ? (
              <div className="tournament-empty">
                No participating teams are available yet.
              </div>
            ) : (
              <div className="tournament-team-grid">
                {teams.map((team) => {
                  const selected = selectedTeamIds.includes(team._id);

                  return (
                    <label
                      className={`tournament-team-option ${selected ? 'selected' : ''}`}
                      key={team._id}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={busy}
                        onChange={(e) => {
                          setSelectedTeamIds((prev) =>
                            e.target.checked
                              ? prev.includes(team._id)
                                ? prev
                                : [...prev, team._id]
                              : prev.filter((id) => id !== team._id)
                          );
                        }}
                      />

                      <span className="tournament-team-check">
                        {selected ? '✓' : ''}
                      </span>

                      <span className="tournament-team-option-copy">
                        <strong>{team.shortName}</strong>
                        <small>{team.name}</small>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            <div className="tournament-setup-footer">
              <div>
                <strong>{selectedTeamIds.length} teams selected</strong>
                <small>Every team must save its Playing XI first.</small>
              </div>
              <button
                type="button"
                className="tournament-primary-button"
                disabled={busy || selectedTeamIds.length < 2 || !tName.trim()}
                onClick={create}
              >
                {busy ? 'Creating...' : 'Create tournament →'}
              </button>
            </div>
          </section>
        ) : (
          <div className="tournament-empty">
            <span>🏟️</span>
            <h3>The tournament hasn't started yet</h3>
            <p>The admin will set up the competition soon.</p>
          </div>
        )}

        {error && (
          <div className="tournament-toast tournament-toast-error" role="alert">
            <span>!</span>
            <div>{error}</div>
            <button onClick={() => setError('')} aria-label="Dismiss error">×</button>
          </div>
        )}

        {msg && (
          <div className="tournament-toast tournament-toast-success" role="status">
            <span>✓</span>
            <div>{msg}</div>
            <button onClick={() => setMsg('')} aria-label="Dismiss message">×</button>
          </div>
        )}
      </div>
    );
  }

  const t = data.tournament;
  const fixtures = t.fixtures || [];
  const league = fixtures.filter((f) => f.stage === 'league');
  const playoffs = fixtures.filter((f) => f.stage !== 'league');
  const leagueDone = league.filter((f) => f.match).length;
  const playedCount = fixtures.filter((f) => f.match).length;
  const completion = fixtures.length
    ? Math.round((playedCount / fixtures.length) * 100)
    : 0;

  return (
    <div className="tournament-page">
      <section className="tournament-hero">
        <div className="tournament-hero-copy">
          <span className="tournament-eyebrow">
            <span className="tournament-status-dot" />
            TOURNAMENT CONTROL CENTRE
          </span>
          <h1>{t.name}<span>.</span></h1>
          <p>
            Follow the standings, track every fixture and watch the
            race to the championship unfold.
          </p>
          <div className="tournament-status-row">
            <span className={`tournament-status-pill ${t.status === 'completed' ? 'finished' : ''}`}>
              {t.status === 'completed' ? '✓ COMPLETED' : `● ${String(t.status || 'ACTIVE').toUpperCase()}`}
            </span>
            <span className="tournament-status-caption">OFFICIAL TOURNAMENT</span>
          </div>
        </div>

        <div className="tournament-hero-art" aria-hidden="true">
          <div className="tournament-orbit tournament-orbit-one" />
          <div className="tournament-orbit tournament-orbit-two" />
          <div className="tournament-trophy">🏆</div>
          <span className="tournament-art-label">THE CHAMPIONSHIP</span>
        </div>
      </section>

      {error && (
        <div className="tournament-toast tournament-toast-error" role="alert">
          <span>!</span>
          <div>{error}</div>
          <button onClick={() => setError('')} aria-label="Dismiss error">×</button>
        </div>
      )}

      {msg && (
        <div className="tournament-toast tournament-toast-success" role="status">
          <span>✓</span>
          <div>{msg}</div>
          <button onClick={() => setMsg('')} aria-label="Dismiss message">×</button>
        </div>
      )}

      {t.champion && (
        <section className="tournament-champion-banner">
          <div className="tournament-champion-icon">🏆</div>
          <div>
            <span>SEASON CHAMPIONS</span>
            <h2>{t.champion.name}</h2>
            <p>Champions crowned. A season to remember.</p>
          </div>
          <div className="tournament-champion-sparkle">✦</div>
        </section>
      )}

      <section className="tournament-metrics">
        <article className="tournament-metric-card">
          <span className="tournament-metric-icon">◷</span>
          <span className="tournament-metric-label">LEAGUE MATCHES</span>
          <strong>{leagueDone}<small> / {league.length}</small></strong>
          <div className="tournament-mini-track">
            <div style={{ width: `${league.length ? (leagueDone / league.length) * 100 : 0}%` }} />
          </div>
        </article>

        <article className="tournament-metric-card">
          <span className="tournament-metric-icon">♧</span>
          <span className="tournament-metric-label">TOTAL FIXTURES</span>
          <strong>{fixtures.length}</strong>
          <span className="tournament-metric-caption">League + playoffs</span>
        </article>

        <article className="tournament-metric-card">
          <span className="tournament-metric-icon">✓</span>
          <span className="tournament-metric-label">COMPLETED</span>
          <strong>{playedCount}</strong>
          <span className="tournament-metric-caption">{completion}% tournament progress</span>
        </article>

        <article className="tournament-metric-card">
          <span className="tournament-metric-icon">♛</span>
          <span className="tournament-metric-label">PLAYOFF TEAMS</span>
          <strong>{data.standings.length >= 4 ? 4 : data.standings.length}</strong>
          <span className="tournament-metric-caption">Top four qualify</span>
        </article>
      </section>

      {isAdmin && (
        <section className="tournament-admin-controls">
          <div>
            <span className="tournament-kicker">ADMIN CONTROL</span>
            <h3>Manage tournament</h3>
            <p>Run fixtures or advance the competition.</p>
          </div>

          <div className="tournament-control-buttons">
            {t.status !== 'completed' && (
              <button
                disabled={busy}
                onClick={() => play('next')}
                className="tournament-primary-button"
              >
                {busy ? 'Processing...' : '▶ Play next match'}
              </button>
            )}

            {t.status === 'league' && (
              <button
                disabled={busy}
                onClick={() => play('league')}
                className="tournament-secondary-button"
              >
                Play all league matches
              </button>
            )}

            {t.status !== 'completed' && (
              <button
                disabled={busy}
                onClick={() => play('all')}
                className="tournament-secondary-button"
              >
                Simulate whole tournament
              </button>
            )}

            <button
              className="tournament-danger-button"
              disabled={busy}
              onClick={reset}
            >
              Delete tournament
            </button>
          </div>
        </section>
      )}

      <section className="tournament-section">
        <div className="tournament-section-heading">
          <div>
            <span className="tournament-kicker">THE RACE FOR THE TOP FOUR</span>
            <h2>Points table</h2>
            <p>Track wins, losses, points and net run rate.</p>
          </div>
          <span className="tournament-section-count">
            {data.standings.length} TEAMS
          </span>
        </div>

        <div className="tournament-table-wrap">
          <table className="tournament-table">
            <thead>
              <tr>
                <th>POS</th>
                <th>TEAM</th>
                <th>PLAYED</th>
                <th>WON</th>
                <th>LOST</th>
                <th>POINTS</th>
                <th>NRR</th>
              </tr>
            </thead>
            <tbody>
              {data.standings.map((s, i) => (
                <tr key={s.team._id} className={i < 4 ? 'qualifier-row' : ''}>
                  <td>
                    <span className={`tournament-rank ${i === 0 ? 'top-rank' : ''}`}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </td>
                  <td>
                    <div className="tournament-table-team">
                      <span className="tournament-table-team-mark">
                        {(s.team.shortName || s.team.name || '?').slice(0, 3)}
                      </span>
                      <strong>{s.team.name}</strong>
                      {i < 4 && <span className="tournament-qualifier-tag">Q</span>}
                    </div>
                  </td>
                  <td>{s.played}</td>
                  <td>{s.won}</td>
                  <td>{s.lost}</td>
                  <td><strong className="tournament-points">{s.points}</strong></td>
                  <td>
                    <span className={s.nrr >= 0 ? 'tournament-nrr-positive' : 'tournament-nrr-negative'}>
                      {s.nrr >= 0 ? '+' : ''}{Number(s.nrr).toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="tournament-table-legend">
          <span><b>Q</b> Current top-four position</span>
          <span>NRR = Net Run Rate</span>
        </div>
      </section>

      {playoffs.length > 0 && (
        <section className="tournament-section">
          <div className="tournament-section-heading">
            <div>
              <span className="tournament-kicker">THE FINAL STRETCH</span>
              <h2>Playoffs</h2>
              <p>The decisive fixtures on the road to the title.</p>
            </div>
            <span className="tournament-section-count">
              {playoffs.filter((f) => f.match).length}/{playoffs.length} PLAYED
            </span>
          </div>

          <div className="tournament-fixture-grid">
            {playoffs.map((f, i) => (
              <Fixture key={f._id} f={f} index={i} />
            ))}
          </div>
        </section>
      )}

      <section className="tournament-section">
        <div className="tournament-section-heading">
          <div>
            <span className="tournament-kicker">EVERY GAME COUNTS</span>
            <h2>League fixtures</h2>
            <p>Every matchup that shapes the points table.</p>
          </div>
          <span className="tournament-section-count">
            {leagueDone}/{league.length} PLAYED
          </span>
        </div>

        {league.length === 0 ? (
          <div className="tournament-empty">
            No league fixtures available.
          </div>
        ) : (
          <div className="tournament-fixture-grid">
            {league.map((f, i) => (
              <Fixture key={f._id} f={f} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
