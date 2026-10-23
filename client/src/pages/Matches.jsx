
import { useEffect, useState } from 'react';
import { api } from '../api.js';

const sc = (s) =>
  s ? `${s.runs}/${s.wkts} (${s.overs})` : 'Yet to play';

export default function Matches({ session, tick }) {
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);

  const load = async () => {
    try {
      const data = await api('/matches');
      setMatches(data);
    } catch (e) {
      setError(e.message || 'Could not load match results.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    api('/teams')
      .then(setTeams)
      .catch((e) => setError(e.message || 'Could not load teams.'));
  }, [tick]);

  async function simulate() {
    if (!a || !b) {
      setError('Please select both teams.');
      return;
    }

    if (a === b) {
      setError('A team cannot play against itself.');
      return;
    }

    setError('');
    setPlaying(true);

    try {
      await api('/matches', {
        method: 'POST',
        body: { teamA: a, teamB: b },
      });

      await load();
      setA('');
      setB('');
    } catch (e) {
      setError(e.message || 'Match simulation failed.');
    } finally {
      setPlaying(false);
    }
  }

  const playedMatches = matches.filter(
    (m) => m.teamA && m.teamB
  );

  const teamSelect = (value, setValue, excluded) => (
    <select
      className="match-team-select"
      value={value}
      onChange={(e) => setValue(e.target.value)}
    >
      <option value="">Select a team</option>
      {teams
        .filter((t) => t._id !== excluded)
        .map((t) => (
          <option key={t._id} value={t._id}>
            {t.name}
          </option>
        ))}
    </select>
  );

  return (
    <div className="match-centre">
      <section className="match-hero">
        <div className="match-hero-content">
          <span className="match-eyebrow">
            <span className="match-live-dot" />
            CRICKET OPERATIONS CENTRE
          </span>

          <h1>Match Centre<span>.</span></h1>

          <p>
            Every fixture has a story. Track the scores,
            discover match heroes and see which team comes out on top.
          </p>

          <div className="match-hero-stats">
            <div>
              <strong>{playedMatches.length}</strong>
              <span>Matches played</span>
            </div>
            <div>
              <strong>{teams.length}</strong>
              <span>Teams competing</span>
            </div>
          </div>
        </div>

        <div className="match-hero-graphic" aria-hidden="true">
          <div className="match-orbit orbit-one" />
          <div className="match-orbit orbit-two" />
          <div className="match-ball">🏏</div>
          <span className="graphic-label">MATCH DAY</span>
        </div>
      </section>

      {session.role === 'admin' && (
        <section className="match-simulator">
          <div className="match-section-heading">
            <div>
              <span className="match-kicker">ADMIN CONTROL</span>
              <h2>Simulate a fixture</h2>
              <p>Choose two different teams to generate a match result.</p>
            </div>
            <span className="match-admin-tag">ADMIN ONLY</span>
          </div>

          <div className="match-selection-grid">
            <div className="match-team-field">
              <label htmlFor="match-team-a">HOME TEAM</label>
              {teamSelect(a, setA, b)}
            </div>

            <div className="match-vs">VS</div>

            <div className="match-team-field">
              <label htmlFor="match-team-b">AWAY TEAM</label>
              {teamSelect(b, setB, a)}
            </div>
          </div>

          {error && (
            <p className="match-error" role="alert">
              {error}
            </p>
          )}

          <div className="match-simulator-footer">
            <span>
              <span className="match-status-dot" />
              {playing ? 'Generating match result...' : 'Ready for simulation'}
            </span>

            <button
              className="match-play-button"
              onClick={simulate}
              disabled={playing || !a || !b}
            >
              {playing ? 'Simulating...' : '▶  Play Match'}
            </button>
          </div>
        </section>
      )}

      <section className="match-results-section">
        <div className="match-section-heading">
          <div>
            <span className="match-kicker">THE SCOREBOARD</span>
            <h2>Match results</h2>
            <p>Scores, match summaries and standout performances.</p>
          </div>

          <span className="match-count">
            {playedMatches.length} {playedMatches.length === 1 ? 'MATCH' : 'MATCHES'}
          </span>
        </div>

        {loading ? (
          <div className="match-empty">
            <div className="match-loading-spinner" />
            <h3>Loading scoreboard</h3>
            <p>Fetching the latest match results...</p>
          </div>
        ) : playedMatches.length === 0 ? (
          <div className="match-empty">
            <span className="match-empty-icon">🏟️</span>
            <h3>The stadium awaits</h3>
            <p>No matches have been played yet. Results will appear here.</p>
          </div>
        ) : (
          <div className="match-results-grid">
            {playedMatches.map((m, index) => (
              <article className="match-result-card" key={m._id}>
                <div className="match-card-top">
                  <span className="match-result-label">
                    <span className="match-status-dot" />
                    FULL TIME
                  </span>
                  <span className="match-number">
                    MATCH {String(playedMatches.length - index).padStart(2, '0')}
                  </span>
                </div>

                <div className="match-scoreboard">
                  <div className="match-side">
                    <span className="match-team-monogram">
                      {(m.teamA.shortName || m.teamA.name || 'A').slice(0, 3)}
                    </span>
                    <strong>{m.teamA.shortName}</strong>
                    <span className="match-team-caption">TEAM A</span>
                  </div>

                  <div className="match-score-centre">
                    <strong>{sc(m.scoreA)}</strong>
                    <span>VS</span>
                    <strong>{sc(m.scoreB)}</strong>
                  </div>

                  <div className="match-side">
                    <span className="match-team-monogram">
                      {(m.teamB.shortName || m.teamB.name || 'B').slice(0, 3)}
                    </span>
                    <strong>{m.teamB.shortName}</strong>
                    <span className="match-team-caption">TEAM B</span>
                  </div>
                </div>

                <div className="match-result-summary">
                  <span className="match-summary-icon">✦</span>
                  <p>{m.summary || 'Match completed.'}</p>
                </div>

                <div className="match-potm">
                  <div className="match-potm-icon">🏆</div>
                  <div className="match-potm-info">
                    <span>PLAYER OF THE MATCH</span>
                    <strong>{m.potm || 'Not available'}</strong>
                  </div>
                </div>

                <details className="match-strength-details">
                  <summary>View team strength <span>＋</span></summary>
                  <div className="match-strength-grid">
                    <div>
                      <strong>{m.teamA.shortName}</strong>
                      <p>Batting <b>{m.ratings?.A?.bat ?? 'N/A'}</b></p>
                      <p>Bowling <b>{m.ratings?.A?.bowl ?? 'N/A'}</b></p>
                    </div>
                    <div>
                      <strong>{m.teamB.shortName}</strong>
                      <p>Batting <b>{m.ratings?.B?.bat ?? 'N/A'}</b></p>
                      <p>Bowling <b>{m.ratings?.B?.bowl ?? 'N/A'}</b></p>
                    </div>
                  </div>
                </details>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
