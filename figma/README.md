
  # Repo2Prompt Web Application Design

  This is a code bundle for Repo2Prompt Web Application Design. The original project is available at https://www.figma.com/design/biMDcU8aAA455YBrAHiY2w/Repo2Prompt-Web-Application-Design.

  ## Running the code

  1. Install dependencies with `npm i`.
  2. Start the Go backend from `../backend` (for example with `go run ./cmd/api`). It listens on port `8080` by default.
  3. Start the frontend dev server with `npm run dev`.

  The Vite dev server proxies any `/api/*` calls to `http://localhost:8080`, so the UI uses real backend data without extra configuration. You can point the proxy to another backend URL by exporting `VITE_DEV_API_PROXY` (or `API_PROXY_TARGET`) before starting `npm run dev`.

  For production builds where the frontend is hosted separately from the backend, set `VITE_API_BASE_URL` to the backend origin before running `npm run build`.
  