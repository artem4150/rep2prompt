import dotenv from 'dotenv';

dotenv.config();

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value;
}

export const config = {
  port: process.env.PORT || '4000',
  appUrl: process.env.APP_URL || `http://localhost:${process.env.PORT || 4000}`,
  sessionSecret: requireEnv('SESSION_SECRET'),
  jwtSecret: requireEnv('JWT_SECRET'),
  github: {
    clientID: requireEnv('GITHUB_CLIENT_ID'),
    clientSecret: requireEnv('GITHUB_CLIENT_SECRET'),
  },
  google: {
    clientID: requireEnv('GOOGLE_CLIENT_ID'),
    clientSecret: requireEnv('GOOGLE_CLIENT_SECRET'),
  },
};
