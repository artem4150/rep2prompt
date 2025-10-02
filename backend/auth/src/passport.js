import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { config } from './config.js';

function normalizeProfile(profile, provider) {
  const primaryEmail = Array.isArray(profile.emails) && profile.emails.length > 0
    ? profile.emails.find((item) => item.verified) || profile.emails[0]
    : null;
  const primaryPhoto = Array.isArray(profile.photos) && profile.photos.length > 0
    ? profile.photos[0]
    : null;

  return {
    id: profile.id,
    email: primaryEmail?.value || null,
    name: profile.displayName || profile.username || '',
    avatar: primaryPhoto?.value || null,
    provider,
  };
}

passport.use(
  new GitHubStrategy(
    {
      clientID: config.github.clientID,
      clientSecret: config.github.clientSecret,
      callbackURL: `${config.appUrl}/auth/callback`,
      scope: ['user:email'],
      passReqToCallback: true,
    },
    (req, accessToken, refreshToken, profile, done) => {
      const user = normalizeProfile(profile, 'github');
      done(null, user);
    },
  ),
);

passport.use(
  new GoogleStrategy(
    {
      clientID: config.google.clientID,
      clientSecret: config.google.clientSecret,
      callbackURL: `${config.appUrl}/auth/callback`,
      scope: ['profile', 'email'],
      passReqToCallback: true,
    },
    (req, accessToken, refreshToken, profile, done) => {
      const user = normalizeProfile(profile, 'google');
      done(null, user);
    },
  ),
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

export default passport;
