const jwt = require('jsonwebtoken');

const getJwtSecret = () => process.env.JWT_SECRET || 'change-this-super-secret-key';
const getJwtExpiresIn = () => process.env.JWT_EXPIRES_IN || '12h';

const signAccessToken = (user) =>
  jwt.sign(
    {
      clinicId: user.assigned_clinic_id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    getJwtSecret(),
    {
      expiresIn: getJwtExpiresIn(),
      subject: String(user.id),
    },
  );

const verifyAccessToken = (token) => jwt.verify(token, getJwtSecret());

module.exports = {
  signAccessToken,
  verifyAccessToken,
};