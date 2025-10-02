import jwt from 'jsonwebtoken';
import { config } from './config.js';

export function createUserToken(user, provider) {
  const payload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    provider,
  };

  return jwt.sign(payload, config.jwtSecret, { expiresIn: '1h' });
}

export function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}
