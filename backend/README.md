# Backend API

Node.js + Express + TypeScript backend for Talent Hub.

## Setup

1. Create a `.env` file (see security section below) and fill in your values
2. Install dependencies: `npm install`
3. Run development server: `npm run dev`

## Environment Variables

| Variable                       | Description                                                            |
| ------------------------------ | ---------------------------------------------------------------------- |
| `NODE_ENV`                     | Environment (`development`, `production`, etc.)                        |
| `PORT`                         | Server port (default: `3000`)                                          |
| `API_PREFIX`                   | API version prefix (default: `/api/v1`)                                |
| `MONGODB_URI`                  | MongoDB connection string                                              |
| `CORS_ORIGIN`                  | Allowed origin for cross-origin requests                               |
| `JWT_ACCESS_SECRET`            | **Required.** At least 32 characters secret for signing access tokens  |
| `JWT_ACCESS_EXPIRE`            | Access token TTL (e.g. `15m`)                                          |
| `REFRESH_TOKEN_DAYS`           | Refresh token lifetime (days)                                          |
| `EMAIL_VERIFICATION_DAYS`      | Email verification token lifetime (days)                               |
| `PASSWORD_RESET_HOURS`         | Password reset token lifetime (hours)                                  |
| `CLIENT_URL` / `APP_URL`       | Base URL used in outbound emails                                       |
| `ENFORCE_HTTPS`                | Set to `true` in production to require HTTPS                           |
| `TRUST_PROXY`                  | Express `trust proxy` configuration (e.g. `loopback`, `true`, `1`)     |
| `AI_SERVICE_URL`               | Base URL for the Python AI microservice                                |
| `AI_SERVICE_TIMEOUT_MS`        | Timeout for outbound AI requests (default `5000`)                      |
| `AI_SERVICE_MAX_RETRIES`       | Retries before surfacing an AI failure (default `2`)                   |
| `AI_SERVICE_RETRY_DELAY_MS`    | Initial retry backoff in milliseconds (default `200`)                  |
| `AI_SERVICE_RETRY_MULTIPLIER`  | Backoff multiplier applied per retry (default `2`)                     |
| `AI_SERVICE_MAX_BACKOFF_MS`    | Maximum retry delay (default `2000`)                                   |
| `AI_SERVICE_CACHE_TTL_MS`      | TTL for in-memory AI response cache (default `900000`)                 |
| `AI_SERVICE_CACHE_MAX_ENTRIES` | Max entries kept in AI cache (default `500`)                           |
| `AI_MATCH_BATCH_SIZE`          | Number of AI tasks processed per batch (default `10`)                  |
| `AI_MATCH_MAX_JOBS`            | Maximum jobs evaluated per graduate matching run (default `50`)        |
| `AI_MATCH_MAX_GRADUATES`       | Maximum graduates evaluated per job matching run (default `50`)        |
| `CSRF_COOKIE_NAME`             | Name of the CSRF cookie (default `talenthub.csrf`)                     |
| `CSRF_HEADER_NAME`             | Header used by clients to send the CSRF token (default `X-CSRF-Token`) |
| `CSRF_COOKIE_SECURE`           | Set to `true` when serving over HTTPS                                  |
| `CSRF_COOKIE_SAME_SITE`        | SameSite policy (`lax`, `strict`, `none`)                              |
| `CSRF_COOKIE_MAX_AGE_SECONDS`  | CSRF token cookie lifetime                                             |

### Security Utilities

- Input sanitisation and NoSQL injection protection via `express-mongo-sanitize`
- XSS mitigation through `xss-clean`
- HTTP parameter pollution prevention with `hpp`
- Security headers enforced by `helmet`
- CSRF protection backed by signed cookies and the `X-CSRF-Token` header
- Rate limiting per IP/user session using `express-rate-limit`
- Obtain a CSRF token for client usage via `GET ${API_PREFIX}/csrf-token`
- AI operations are queued and processed asynchronously to avoid blocking HTTP requests
- Profile/job embeddings and feedback responses are cached in-memory to minimise duplicate AI calls

### AI Service Integration

- Dedicated AI client with exponential backoff + retry handling for transient failures
- Graduate assessment submissions trigger background job matching against active roles
- Job creation/updates refresh embeddings and queue candidate matching
- Matched results are persisted to the `Match` collection and reused for subsequent requests

### Vulnerability Scanning

Run dependency vulnerability scanning regularly:

```bash
npm run security:scan
```

### Testing

- Run full test suite: `npm test`
- Run in watch mode: `npm run test:watch`
- Generate coverage report: `npm run test:coverage`

Tests use Jest with `ts-jest`, Supertest, and an in-memory MongoDB instance (`mongodb-memory-server`) to cover unit tests for controllers, services, models, middleware, utilities, and end-to-end API/auth flows.
