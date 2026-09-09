const { query } = require('../database');
const { verifyAccessToken } = require('../security/token');

const authenticate = async (request, response, next) => {
  try {
    const authorization = request.headers.authorization;

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return response.status(401).json({ message: 'Missing bearer token.' });
    }

    const token = authorization.slice('Bearer '.length).trim();
    const payload = verifyAccessToken(token);
    const rows = await query(
      `SELECT id, name, email, role, assigned_clinic_id, is_active
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [payload.sub],
    );

    const user = rows[0];

    if (!user || !user.is_active) {
      return response.status(401).json({ message: 'User account is not active.' });
    }

    request.auth = {
      clinicId: user.assigned_clinic_id,
      email: user.email,
      id: user.id,
      name: user.name,
      role: user.role,
      token,
    };

    return next();
  } catch (error) {
    return response.status(401).json({ message: 'Invalid or expired token.' });
  }
};

const requireRole = (...allowedRoles) => (request, response, next) => {
  if (!request.auth) {
    return response.status(401).json({ message: 'Authentication required.' });
  }

  if (!allowedRoles.includes(request.auth.role)) {
    return response.status(403).json({ message: 'Insufficient permissions.' });
  }

  return next();
};

module.exports = {
  authenticate,
  requireRole,
};