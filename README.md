# Secure Notes - Backend

Express + MongoDB (Mongoose) REST API with JWT auth, bcryptjs password hashing and role based access (user / admin).

## Run locally
```bash
npm install
cp .env.example .env     # fill MONGODB_URI and JWT_SECRET
npm run dev              # http://localhost:5000
```
If `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set, the first admin is created automatically on startup (only when no admin exists).

## Environment variables
| Name | Purpose |
|------|---------|
| MONGODB_URI | MongoDB Atlas connection string |
| JWT_SECRET | long random string used to sign tokens |
| JWT_EXPIRES_IN | token lifetime (default 7d) |
| CLIENT_URL | allowed frontend origin(s), comma separated, no trailing slash |
| ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD | first admin account |

## Roles
- **user**: create / update / delete / list own notes, write own posts, edit own profile.
- **admin**: everything a user can do + manage users (add, update, delete, list) + view everyone's notes.
- Registration always creates a `user`; only an admin can create another admin.

## API
Lists accept `?page=1&limit=10` (limit max 50) and return `{ data, pagination }`.

| Method | Path | Access | Notes |
|--------|------|--------|-------|
| POST | /api/auth/register | public | |
| POST | /api/auth/login | public | returns `{ token, user }` |
| GET / PUT | /api/auth/me | auth | own profile |
| GET | /api/notes | auth | my notes (paginated) |
| POST | /api/notes | auth | |
| GET | /api/notes/:id | owner / admin | |
| PUT / DELETE | /api/notes/:id | owner | |
| GET | /api/notes/all?owner= | admin | everyone's notes (paginated) |
| GET | /api/posts, /api/posts/:id | public | |
| POST / PUT / DELETE | /api/posts(/:id) | auth | edit = author; delete = author or admin |
| GET | /api/users/:id/posts | public | **Scenario 2**: one pipeline with `$lookup` |
| GET | /api/users/interests/grouped?interest= | admin | **Scenario 1**: one `aggregate()` call |
| GET / POST | /api/users | admin | list (paginated) / add |
| GET / PUT / DELETE | /api/users/:id | admin | delete also removes the user's notes and posts |

## Indexing strategy (only 4 custom indexes, all declared with `schema.index`)
| Collection | Index | Supports |
|-----------|-------|----------|
| users | `{ email: 1 }` unique | login, GET by email, duplicate protection |
| users | `{ interests: 1 }` | `$match` stage of the group-by-interests aggregation |
| notes | `{ owner: 1, _id: -1 }` | my notes list (filter + newest-first sort + pagination), admin filter by owner, cascade delete |
| posts | `{ author: 1, _id: -1 }` | `$lookup` join + sort in "posts of a user", cascade delete |

Everything else relies on the default `_id` index, so no extra index is created:
- GET user / note / post by id
- admin user list, admin all-notes list, public posts feed (all sorted by `_id` descending, since ObjectId is time ordered)
- `$match: { _id }` in the posts-of-user pipeline

Verify in Atlas / mongosh with `.explain('executionStats')` (look for `IXSCAN`, no `COLLSCAN`, no in-memory `SORT`).

## Postman
Import `postman_collection.json`. Run **Login** first, it stores the token in a collection variable automatically. Set `baseUrl` to your local or Render URL.
