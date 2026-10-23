
import { useState } from 'react';
import Login from './pages/Login.jsx';
import Players from './pages/Players.jsx';
import TeamDashboard from './pages/TeamDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import Lineup from './pages/Lineup.jsx';
import Matches from './pages/Matches.jsx';
import Account from './pages/Account.jsx';
import AdminUsers from './pages/AdminUsers.jsx';
import { useAuction } from './socket.js';
import { getSession, saveSession, clearSession } from './api.js';
import Tournament from './pages/Tournament.jsx';

const NAV_ICONS = {
  auction: '◈',
  lineup: '▦',
  matches: '⇄',
  tournament: '♜',
  players: '◎',
  users: '♙',
  account: '⚙',
};

function Main({ session, logout, onSession }) {
  const auction = useAuction();
  const [tab, setTab] = useState('auction');
  const isAdmin = session.role === 'admin';

  const tabs = [
    ['auction', isAdmin ? 'Control room' : 'Auction arena'],
    ...(isAdmin ? [] : [['lineup', 'My XI']]),
    ['matches', 'Matches'],
    ['tournament', 'Tournament'],
    ['players', 'Players'],
    ...(isAdmin ? [['users', 'Users']] : []),
    ['account', 'Account'],
  ];
  
  const pageTitles = {
    auction: isAdmin ? 'Auction Control Room' : 'Live Auction Arena',
    lineup: 'My Playing XI',
    matches: 'Match Center',
    tournament: 'Tournament Hub',
    players: 'Player Directory',
    users: 'User Management',
    account: 'Account Settings',
  };

  const currentLabel = tabs.find(([key]) => key === tab)?.[1] || 'Auction arena';

  
  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="brand-lockup">
          <div className="brand-mark">IPL</div>
          <div className="brand-copy">
            <strong>AUCTION</strong>
            <span>SPORTS NETWORK</span>
          </div>
        </div>

        <div className="sidebar-caption">MAIN MENU</div>

        <nav className="app-navigation" aria-label="Main navigation">
          {tabs.map(([key, label], index) => (
            <button
              key={key}
              type="button"
              className={`nav-item ${tab === key ? 'selected' : ''}`}
              onClick={() => setTab(key)}
            >
              <span className="nav-number">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span>{label}</span>
              {tab === key && <span className="nav-indicator" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="sidebar-status-dot" />
          <div>
            <strong>AUCTION NETWORK</strong>
            <small>Interactive matchday mode</small>
          </div>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div className="topbar-page">
            <span className="topbar-breadcrumb">IPL AUCTION / 2026</span>
            <h1>{pageTitles[tab] || 'IPL Auction'}</h1>
          </div>

          <div className="topbar-account">
            <div className="topbar-avatar">
              {(session.username || 'U').slice(0, 1).toUpperCase()}
            </div>
            <div className="topbar-user">
              <strong>{session.username}</strong>
              <span>{session.role}</span>
            </div>
            <button
              className="topbar-logout"
              type="button"
              onClick={logout}
            >
              Logout
            </button>
          </div>
        </header>

        <main className="page-content">
          {tab === 'players' && <Players />}
          {tab === 'lineup' && !isAdmin && <Lineup session={session} />}
          {tab === 'matches' && (
            <Matches session={session} tick={auction.tick} />
          )}
          {tab === 'tournament' && (
            <Tournament session={session} tick={auction.tick} />
          )}
          {tab === 'users' && isAdmin && <AdminUsers />}
          {tab === 'account' && (
            <Account session={session} onSession={onSession} />
          )}
          {tab === 'auction' &&
            (isAdmin ? (
              <AdminDashboard auction={auction} />
            ) : (
              <TeamDashboard session={session} auction={auction} />
            ))}
        </main>
      </div>
    </div>
  );

}

export default function App() {
  const [session, setSession] = useState(getSession());

  if (!session) {
    return <Login onLogin={setSession} />;
  }

  return (
    <Main
      session={session}
      logout={() => {
        clearSession();
        setSession(null);
      }}
      onSession={(nextSession) => {
        saveSession(nextSession);
        setSession(nextSession);
      }}
    />
  );
}
