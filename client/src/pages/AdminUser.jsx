import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api('/users').then(setUsers).catch((e) => setError(e.message));
  }, []);

  async function reset(u) {
    const pw = window.prompt(`New password for ${u.username} (min 8, letters + numbers):`);
    if (!pw) return;
    try {
      const data = await api(`/users/${u._id}/reset-password`, { method: 'POST', body: { newPassword: pw } });
      setMsg(data.message);
      setError('');
    } catch (e) {
      setError(e.message);
      setMsg('');
    }
  }

  return (
    <div className="card wide">
      <h2>Users</h2>
      {error && <p className="error">{error}</p>}
      {msg && <p className="result">{msg}</p>}
      <div className="table-scroll">
        <table className="xi-table">
          <thead>
            <tr><th>Username</th><th>Role</th><th>Team</th><th></th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id}>
                <td>{u.username}</td>
                <td>{u.role}</td>
                <td>{u.team?.name || '-'}</td>
                <td><button className="ghost" onClick={() => reset(u)}>Reset password</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}