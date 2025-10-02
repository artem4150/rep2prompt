# OAuth Auth Server

This service exposes GitHub and Google OAuth login endpoints backed by Passport.js. After successful authentication the service issues a JWT that contains the user's id, email, name and avatar, and can be used to authorize subsequent requests.

## Available endpoints

- `GET /auth/github` – redirect the user to GitHub to start the OAuth flow.
- `GET /auth/google` – redirect the user to Google to start the OAuth flow.
- `GET /auth/callback` – the common OAuth callback URL for both providers. Returns `{ ok, token, user }` on success.
- `GET /auth/me` – example protected endpoint that returns the decoded JWT payload when a valid `Authorization: Bearer <token>` header is provided.
- `GET /auth/failure` – returned when the OAuth handshake fails.
- `GET /healthz` – basic health check.

## Environment variables

Copy `.env.example` into `.env` and provide the required credentials:

```bash
cp .env.example .env
```

| Variable | Description |
| --- | --- |
| `PORT` | Port to run the auth server on (default `4000`). |
| `APP_URL` | Public URL that the OAuth providers should redirect back to (defaults to `http://localhost:<PORT>`). |
| `SESSION_SECRET` | Secret used to encrypt the temporary OAuth session. |
| `JWT_SECRET` | Secret for signing issued JWTs. |
| `GITHUB_CLIENT_ID` | GitHub OAuth application client id. |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth application client secret. |
| `GOOGLE_CLIENT_ID` | Google OAuth application client id. |
| `GOOGLE_CLIENT_SECRET` | Google OAuth application client secret. |

## Running locally

```bash
cd backend/auth
npm install
npm run start
```

Then configure your GitHub and Google OAuth applications to use `http://localhost:4000/auth/callback` as the callback URL.

## Using the JWT

Include the issued token in the `Authorization` header when calling protected endpoints:

```http
Authorization: Bearer <token>
```

The provided `requireAuth` middleware verifies the token and populates `req.user` with the decoded payload for downstream handlers.
