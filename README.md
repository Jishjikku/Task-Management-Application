# Task 2 – Task Management Application (Full-Stack)

**Features:** user authentication (JWT + bcrypt) & authorization (users only see/modify their own tasks), CRUD for tasks,
real-time updates with WebSockets (Socket.IO – optional feature included), responsive design for web and mobile.

**Stack:** HTML/CSS/JS frontend · Node.js + Express · MongoDB (Mongoose) · Socket.IO

## Run locally
1. Install Node.js 18+ and MongoDB (or use a free MongoDB Atlas cluster).
2. `npm install`
3. Copy `.env.example` to `.env`; set `MONGODB_URI` and a long random `JWT_SECRET`.
4. `npm start` → http://localhost:3000
5. Register, add tasks, move them across columns. Open a second tab logged into the same account to see real-time sync.

## API
| Method | Route | Auth |
|---|---|---|
| POST | /api/auth/register | – |
| POST | /api/auth/login | – |
| GET | /api/tasks | Bearer token |
| POST | /api/tasks | Bearer token |
| PUT | /api/tasks/:id | Bearer token (owner only) |
| DELETE | /api/tasks/:id | Bearer token (owner only) |

## Deploy (Render)
Push to GitHub → Render Web Service → Build `npm install`, Start `npm start` → add env vars `MONGODB_URI`, `JWT_SECRET`.
