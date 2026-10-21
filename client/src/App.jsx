import { useState } from 'react';
import Login from './pages/Login.jsx';
import Players from './pages/Players.jsx';
import TeamDashboard from './pages/TeamDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import { useAuction } from './socket.js';
import { getSession, clearSession } from './api.js';
import Lineup from './pages/Lineup.jsx';
import Matches from './pages/Matches.jsx';

function Main({ session, logout }) {
  const auction = useAuction();
  const [tab, setTab] = useState('auction');
  const isAdmin = session.role === 'admin';

  const tabs = [
    ['auction', isAdmin ? 'Admin' : 'Auction'],
    ...(isAdmin ? [] : [['lineup', 'My XI']]),
    ['matches', 'Matches'],
    ['players', 'All players'],
  ];

  return (
    <div className="container">
      <header className="topbar">
        <h1>IPL Auction</h1>
        <div>
          <span className="badge">{session.role}</span> {session.username}{' '}
          <button onClick={logout}>Logout</button>
        </div>
      </header>
      <div className="filters">
        {tabs.map(([key, label]) => (
          <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'players' && <Players />}
      {tab === 'lineup' && <Lineup session={session} />}
      {tab === 'matches' && <Matches session={session} tick={auction.tick} />}
      {tab === 'auction' &&
        (isAdmin ? (
          <AdminDashboard auction={auction} />
        ) : (
          <TeamDashboard session={session} auction={auction} />
        ))}
    </div>
  );
}
export default function App() {
  const [session, setSession] = useState(getSession());
  if (!session) return <Login onLogin={setSession} />;
  return (
    <Main
      session={session}
      logout={() => {
        clearSession();
        setSession(null);
      }}
    />
  );
}