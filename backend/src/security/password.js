const crypto = require('crypto');

const DEFAULT_ITERATIONS = 100000;
const DEFAULT_KEY_LENGTH = 64;
const DEFAULT_DIGEST = 'sha512';

const pbkdf2Hash = (password, salt, iterations = DEFAULT_ITERATIONS) => {
  const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, DEFAULT_KEY_LENGTH, DEFAULT_DIGEST).toString('hex');
  return `pbkdf2_${DEFAULT_DIGEST}$${iterations}$${salt}$${derivedKey}`;
};

const verifyPassword = (password, storedHash) => {
  if (typeof storedHash !== 'string' || storedHash.length === 0) {
    return false;
  }

  if (!storedHash.startsWith('pbkdf2_')) {
    return false;
  }

  const [scheme, iterationValue, salt, expectedHash] = storedHash.split('$');

  if (!scheme || !iterationValue || !salt || !expectedHash) {
    return false;
  }

  const digest = scheme.replace('pbkdf2_', '');
  const iterations = Number(iterationValue);

  if (!Number.isFinite(iterations) || iterations <= 0) {
    return false;
  }

  const actualHash = crypto.pbkdf2Sync(password, salt, iterations, DEFAULT_KEY_LENGTH, digest).toString('hex');

  return crypto.timingSafeEqual(Buffer.from(actualHash, 'hex'), Buffer.from(expectedHash, 'hex'));
};

module.exports = {
  pbkdf2Hash,
  verifyPassword,
};