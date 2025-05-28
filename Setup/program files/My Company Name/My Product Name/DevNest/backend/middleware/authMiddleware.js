const jwt = require('jsonwebtoken');
const SECRET = 'devnest-secret';

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).send('No token provided');

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).send('Token missing');

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).send('Invalid token');
  }
}

module.exports = verifyToken;
