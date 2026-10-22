// Returns an error message, or null if the password is OK
function validatePassword(pw) {
  const s = String(pw || '');
  if (s.length < 8) return 'Password must be at least 8 characters';
  if (s.length > 72) return 'Password must be at most 72 characters';
  if (!/[A-Za-z]/.test(s) || !/[0-9]/.test(s)) return 'Password must contain letters and numbers';
  return null;
}

module.exports = { validatePassword };