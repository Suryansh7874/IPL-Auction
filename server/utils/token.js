const jwt = require('jsonwebtoken');

// Token mein role/team nahi hota: wo hamesha database se aate hain
function signToken(user) {
  return jwt.sign(
    { id: String(user._id), v: user.tokenVersion || 0 },
    process.env.JWT_SECRET,
    { expiresIn: '12h', algorithm: 'HS256' }
  );
}

function readToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
}

module.exports = { signToken, readToken };