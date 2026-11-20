import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function checkPassword(password, hash) {
  try { const [salt, value] = hash.split(':'); return timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(value, 'hex')); } catch { return false; }
}
export function tokenFor(user, secret) { return jwt.sign({}, secret, { subject: user.id, issuer: 'verimark', audience: 'verimark-api', expiresIn: '1h', algorithm: 'HS256' }); }
export function auth(db, secret, roles) {
  return async (req, res, next) => {
    let claims;
    try {
      const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
      claims = jwt.verify(token, secret, { algorithms: ['HS256'], issuer: 'verimark', audience: 'verimark-api' });
      if (typeof claims.sub !== 'string') throw new Error('Missing subject');
    } catch { return res.status(401).json({ error: 'UNAUTHORIZED' }); }
    try {
      const user = await db.user.findUnique({ where: { id: claims.sub }, include: { student: true } });
      if (!user || !roles.includes(user.role)) return res.status(403).json({ error: 'FORBIDDEN' });
      req.user = user; next();
    } catch (error) { next(error); }
  };
}
