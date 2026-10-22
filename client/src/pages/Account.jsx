import { useState } from 'react';
import { api } from '../api.js';

export default function Account({ session, onSession }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setMsg('');
    setError('');
    if (next !== confirm) return setError('New passwords do not match');
    try {
      const data = await api('/auth/change-password', {
        method: 'POST',
        body: { currentPassword: current, newPassword: next },
      });
      onSession({ ...session, token: data.token }); // naya token save
      setMsg('Password changed!');
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form className="card" onSubmit={submit} style={{ maxWidth: 360 }}>
      <h2>Change password</h2>
      <p><small>Logged in as <b>{session.username}</b>. Min 8 characters, letters and numbers.</small></p>
      <input type="password" placeholder="Current password" value={current} onChange={(e) => setCurrent(e.target.value)} />
      <input type="password" placeholder="New password" value={next} onChange={(e) => setNext(e.target.value)} />
      <input type="password" placeholder="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      {error && <p className="error">{error}</p>}
      {msg && <p className="result">{msg}</p>}
      <button type="submit">Change password</button>
    </form>
  );
}