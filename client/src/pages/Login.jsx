import { useState } from 'react';
import { api, saveSession } from '../api.js';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const session = await api('/auth/login', {
        method: 'POST',
        body: { username, password },
      });
      saveSession(session);
      onLogin(session);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="login-wrap">
      <form className="card" onSubmit={handleSubmit}>
        <h2>IPL Auction Login</h2>
        <input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="error">{error}</p>}
        <button type="submit">Login</button>
        <p className="hint">Try admin / admin123 or mi / team123</p>
      </form>
    </div>
  );
}
