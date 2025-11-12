# Backend API Test Checklist

1. **Prepare the environment**
   - Ensure required services (database, cache, queues) are running.
   - Export or copy the latest `.env` values; confirm secrets such as `JWT_ACCESS_SECRET`.
   - From `/Users/ameer/Documents/Developments/talent-hub/backend`, install deps (`npm install`) and start the server (`npm run dev` or `npm run start`).
   - Verify the server health endpoint (e.g., `GET /api/health`) returns `200`.

2. **Set up Postman**
   - Import the OpenAPI/collection (`backend/openapi.yml` if available) or build requests manually.
   - Create a Postman environment with variables:
     - `baseUrl` → `http://localhost:<PORT>`
     - `adminEmail`, `adminPassword`, `companyEmail`, `graduateEmail`, etc.
     - `accessToken`, `refreshToken`, and any resource IDs you will chain.
   - Configure default headers (`Content-Type: application/json`) and enable `pretty` JSON responses.

3. **Authenticate**
   - Run `POST {{baseUrl}}/auth/login` (or signup) to obtain tokens; store them with a test script (`pm.environment.set('accessToken', pm.response.json().accessToken)`).
   - For refresh, test `POST /auth/refresh`; confirm tokens rotate and `accessToken` updates.
   - Validate logout (`POST /auth/logout`) revokes the session.

4. **User management**
   - `GET /admin/users` (requires admin role) → expect paginated list.
   - `GET /admin/users/:userId`, `PUT /admin/users/:userId`, `DELETE /admin/users/:userId`.
   - Exercise search (`GET /admin/users/search?query=...`) and confirm filters work.

5. **Company flow**
   - `POST /company/profile` create a profile; store `companyId`.
   - `GET /company/profile` verify retrieval.
   - `PUT /company/profile` update fields and confirm changes.
   - `POST /company/jobs` create a job; capture `jobId`.
   - `GET /company/jobs`, `GET /company/jobs/:jobId`, `PUT /company/jobs/:jobId`, `DELETE /company/jobs/:jobId`.
   - `GET /company/jobs/:jobId/matches`, `PATCH /company/matches/:matchId` for match status.

6. **Graduate flow**
   - `POST /graduates/profile` create; `GET`/`PUT` to verify edits.
   - `POST /graduates/applications` apply to job; capture `applicationId`.
   - `GET /graduates/applications`, `GET /graduates/applications/:applicationId`.
   - Test withdrawal or status updates if available.

7. **AI / matching endpoints**
   - `POST /ai/match/jobs` or similar AI endpoints; confirm response structure and latency within expectations.
   - Verify retry or error handling by simulating AI service downtime (optional).

8. **Security & CSRF**
   - Confirm protected routes return `401` without `Authorization` header.
   - For CSRF-protected routes, fetch CSRF token (`GET /auth/csrf` or cookie flow) and attempt modification without it to ensure rejection.

9. **Rate limiting & error cases**
   - Trigger known limiters (e.g., multiple login attempts) and confirm `429` responses.
   - Send malformed payloads to verify validation errors surface with helpful messages.
   - Test access from non-admin roles to admin routes → expect `403`.

10. **Automated runs**
    - Use Postman Collection Runner or Newman (`npx newman run collection.json -e env.json`) to execute the full suite.
    - Capture run report, note failures, and file bugs for regressions.

11. **Cleanup**
    - Remove test data (delete created users/jobs) via API or database.
    - Stop background services if no longer needed.


