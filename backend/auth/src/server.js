import express from 'express';
import session from 'express-session';
import passport from './passport.js';
import { config } from './config.js';
import authRouter from './routes/auth.js';

const app = express();

app.use(express.json());
app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      sameSite: 'lax',
    },
  }),
);
app.use(passport.initialize());

app.get('/healthz', (req, res) => {
  res.json({ ok: true });
});

app.use('/auth', authRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(config.port, () => {
  console.log(`Auth server is running on port ${config.port}`);
});
