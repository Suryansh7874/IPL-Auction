import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { getSession, clearSession } from './api.js';

const SOCKET_URL = new URL(import.meta.env.VITE_API_URL || 'http://localhost:5000/api').origin;

export function useAuction() {
  const [state, setState] = useState(null);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0); // data dobara fetch karne ke liye
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const s = io(SOCKET_URL, {
      // Function hone se reconnect par hamesha latest token jata hai
      auth: (cb) => cb({ token: getSession()?.token }),
      transports: ['websocket', 'polling'],
    });
    setSocket(s);

    s.on('state', setState);
    s.on('refresh', () => setTick((t) => t + 1));
    s.on('connect', () => setError(''));
    s.on('error_msg', (m) => {
      setError(m);
      setTimeout(() => setError(''), 3000);
    });
    s.on('connect_error', (e) => {
      if (e.message === 'Not logged in' || e.message === 'Session expired') {
        clearSession();
        window.location.reload();
      } else {
        setError('Reconnecting…');
      }
    });
    return () => s.disconnect();
  }, []);

  return { state, error, tick, socket };
}