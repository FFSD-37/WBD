# Feeds Backend (Node.js + Express + MongoDB)

This README is a contributor guide for the backend in `server/`.
It explains architecture, data flow, notification `msgSerial` values, and how to safely extend controllers/routes/models.

## Tech Stack

- Node.js
- Express
- MongoDB + Mongoose
- Apache Solr (optional search index for user discovery)
- Socket.IO (realtime chat)
- JWT + cookie-based auth

## High-Level Architecture

- Entry point: `index.js`
- HTTP routing: `routes/`
- Request handling/business logic: `controllers/`
- Data models: `models/`
- Middleware: `middleware/`
- DB connection: `Db/connection.js`
- Utility/service integrations: `services/`
- Solr integration: `services/solr.js`, `services/userSearch.js`

## Notification `msgSerial` Mapping

### Normal User Notifications (1-8)

- `1`: Normal user follows another normal user
- `2`: Normal user likes a normal post comment
- `3`: Normal user likes a normal post
- `4`: Normal user requests to follow another private normal user
- `5`: Normal user views a premium user
- `6`: Normal user gets some coins
- `7`: Normal user unfollows another normal user
- `8`: Normal user comments on a normal post

### Channel Interaction Notifications (9-16)

- `9`: Normal/Kids user follows a channel
- `10`: Normal/Kids user unfollows a channel
- `11`: Normal/Kids user likes a channel post
- `12`: Normal/Kids user unlikes a channel post
- `13`: Channel likes a channel post
- `14`: Channel unlikes a channel post
- `15`: Normal/Kids user comments on a channel post
- `16`: Channel comments on a channel post

### Channel View Notifications (17-18)

- `17`: Channel views a channel
- `18`: Normal/Kids user views a channel

## Auth and Identity Model

Authentication is cookie/JWT-based and role-aware.

- Cookie tokens: `uuid` / `cuid`
- JWT payload convention used in many controllers:
- `data[0]`: username/channelName
- `data[1]`: email
- `data[2]`: profile image/logo
- `data[3]`: account type (`Normal`, `Kids`, `Channel`)
- `data[4]`: premium flag

Middleware:

- `middleware/isAuthuser.js`: protects private routes
- `middleware/applicationMiddleware.js`: request logging
- `middleware/handlerError.js`: global error handling

## Data Models You Should Know

- `models/users_schema.js`: user accounts and social graph fields
- `models/channelSchema.js`: channel entity
- `models/postSchema.js`, `models/channelPost.js`: content
- `models/comment_schema.js`: comments
- `models/notification_schema.js`: notifications (`msgSerial`, `seen`)
- `models/chatSchema.js`: chat messages (`from/to`, types, `seen`)
- `models/activityLogSchema.js`: user activity logs

## Core Backend Feature Areas

### User and Account Flows

- Signup/login/logout
- OTP verification and password reset
- Profile edit and settings
- Account deactivation/deletion flows

### Feed/Social Graph

- Follow/unfollow/unrequest/accept-request
- Home feed and connect/discovery flows
- Post interactions (likes, comments, save/archive/report)

### Channel Flows

- Channel signup/login
- Channel settings/profile updates
- Channel posts and interactions

### Reels/Stories

- Reels feed and interaction endpoints
- Stories retrieval endpoints

### Notifications

- Notification creation across controllers
- Role-aware notification listing/filtering
- Seen/unseen handling

### Chat (Realtime + Persistence)

- Realtime message delivery via Socket.IO events
- Message persistence in MongoDB
- Conversation retrieval/deletion
- Seen/unseen chat state management

## Realtime Chat Flow

Socket wiring lives in `index.js`.

- On connect:
- socket auth from cookies
- user/channel `socketId` updated
- session tracking updated

- On `sendMessage`:
- message persisted to `Chat`
- receiver socket (if online) gets `receiveMessage`
- sender also receives `receiveMessage`

- On `deleteChat`:
- conversation deleted from DB
- both users notified with `chatDeleted`

Seen behavior:

- New chats are created with `seen: false`
- Opening/marking a conversation updates relevant incoming messages to `seen: true`

## Notification/Unseen Endpoints

Common endpoints now used by frontend:

- `GET /GetAllNotifications`: role-filtered notifications
- `POST /notifications/mark-seen`: mark current user notifications as seen
- `GET /unseen-counts`: returns unseen notification/chat counts

## Route Organization

Main router: `routes/user.js`

Also mounted:

- `routes/notification.js`
- `routes/userPost.js`
- `routes/channelPost.js`
- `routes/home.js` (under `/home`)

When adding endpoints:

- keep route naming consistent with existing style
- keep auth-protected routes behind `router.use(isAuthuser)`
- keep role checks explicit in controller logic

## Controller Organization

Large controller files exist for historical reasons (`controllers/user.js` etc.).
Prefer this pattern for new work:

- validate request early
- extract current identity from `req.userDetails.data`
- enforce role/type restrictions
- perform DB operations
- return consistent JSON (`success`, `message`, payload)
- catch and log errors with clear context

## Coding Contracts (Existing Patterns)

- Many responses return:
- `{ success: true/false, message: "...", ... }`
- Types are normalized to:
- `Normal`, `Kids`, `Channel`
- Notifications are usually created with:
- `mainUser`
- `mainUserType`
- `msgSerial`
- `userInvolved`
- (and now `seen`, default `false`)

## Environment and Run

Important env vars are defined in `.env` / `.env-example` (DB URI, JWT secret, defaults).

Optional search env vars:

- `SOLR_BASE_URL` (example: `http://localhost:8983/solr`)
- `SOLR_CORE` (example: `feeds_users`)
- `SOLR_TIMEOUT_MS` (optional request timeout override)
- `SOLR_USERNAME` and `SOLR_PASSWORD` for Basic Auth protected Solr
- `SOLR_BEARER_TOKEN` or `SOLR_API_KEY` for token-protected Solr

Typical commands:

- install: `npm install`
- reindex existing users into Solr: `npm run reindex:users`
- start (depends on scripts in `package.json`): `npm start` or `npm run dev`

## Contributor Checklist for New Features

1. Update/extend model fields only when needed and keep defaults backward-compatible.
2. Add route in correct router and enforce auth where required.
3. Add controller role checks (`Normal/Kids/Channel`) for behavior that differs by account type.
4. If your feature creates notifications:
- assign correct `msgSerial`
- ensure frontend mapping is updated
- verify seen/unseen behavior remains correct
5. If your feature affects chat/notifications counts:
- ensure `/unseen-counts` still reports correctly
6. Add defensive error handling and consistent response shape.
7. Update both `server/README.md` and `client/README.md` when contracts/UI behavior change.

## Suggested Next Refactor (Optional)

- Split `controllers/user.js` into domain files (`auth`, `profile`, `social`, `notifications`, `settings`) for easier maintenance.
- Add centralized constants for `msgSerial` IDs to avoid magic numbers in multiple controllers.
