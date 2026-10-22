const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export function getSession() {
  try {
    return JSON.parse(sessionStorage.getItem('session'));
  } catch {
    return null;
  }
}

export function saveSession(session) {
  sessionStorage.setItem('session', JSON.stringify(session));
}

export function clearSession() {
  sessionStorage.removeItem('session');
}

// JSON bhejta hai aur login token jodta hai
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
    // Token expire ya password badla: wapas login par
    clearSession();
    window.location.reload();
  }
  if (!res.ok) throw new Error(data.message || 'Something went wrong');
  return data;
}