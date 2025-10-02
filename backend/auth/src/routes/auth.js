import { Router } from 'express';
import passport from '../passport.js';
import { createUserToken } from '../jwt.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

function startAuth(provider, scope) {
  return (req, res, next) => {
    req.session.oauthProvider = provider;
    const authenticator = passport.authenticate(provider, {
      scope,
      session: false,
    });
    authenticator(req, res, next);
  };
}

router.get('/github', startAuth('github', ['user:email']));
router.get('/google', startAuth('google', ['profile', 'email']));

router.get('/callback', (req, res, next) => {
  const provider = req.session?.oauthProvider || req.query.state;
  if (!provider || !['github', 'google'].includes(provider)) {
    return res.status(400).json({ error: 'Unknown OAuth provider' });
  }

  passport.authenticate(provider, { session: false }, (err, user) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.status(401).json({ error: 'Authentication failed' });
    }

    if (req.session) {
      req.session.oauthProvider = undefined;
    }

    const token = createUserToken(user, provider);
    return res.status(200).json({
      ok: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        provider,
      },
    });
  })(req, res, next);
});

router.get('/failure', (req, res) => {
  res.status(401).json({ error: 'OAuth authentication failed' });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ ok: true, user: req.user });
});

export default router;
