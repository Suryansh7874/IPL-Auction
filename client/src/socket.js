import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { getSession } from './api.js';

const URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');

export function useAuction() {
  const [state, setState] = useState(null);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0); // bumps when data should be re-fetched
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const s = io(URL, { auth: { token: getSession()?.token } });
    setSocket(s);
    s.on('state', setState);
    s.on('refresh', () => setTick((t) => t + 1));
    s.on('error_msg', (m) => {
      setError(m);
      setTimeout(() => setError(''), 3000);
    });
    s.on('connect_error', (e) => setError(e.message));
    return () => s.disconnect();
  }, []);

  return { state, error, tick, socket };
}