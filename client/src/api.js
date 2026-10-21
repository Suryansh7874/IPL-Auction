const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem('session'));
  } catch {
    return null;
  }
}

export function saveSession(session) {
  localStorage.setItem('session', JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem('session');
}

// Small helper: sends JSON and attaches the login token if we have one
export async function api(path, options = {}) {
  const session = getSession();
  const res = await fetch(API + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    clearSession();
    window.location.reload(); // back to the login page
  }
  if (!res.ok) throw new Error(data.message || 'Something went wrong');
  return data;
}
