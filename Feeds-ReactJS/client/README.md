# Feeds Frontend (React)

This README is a contributor guide for the frontend in `client/`.
It explains notification `msgSerial` values, key features, component responsibilities, and how frontend state/data flows through the app.

## Tech Stack

- React (Vite)
- React Router
- Context provider pattern (`useUserData`)
- Fetch API for backend communication
- Socket.IO client for realtime chat

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

## Core Frontend Features

- Authentication-aware routing and UI behavior
- Different UX by account type:
- `Normal`
- `Kids`
- `Channel`
- Feed browsing and content interactions (like/comment/save/report)
- Channel discovery and follow flows
- Reels and stories experiences
- Realtime chat (Socket.IO)
- Notification center with follow-request actions
- Sidebar unseen badges for notifications/chat
- Profile and settings management (user + channel variants)

## Important App-Level Concepts

### User Context (`useUserData`)

`useUserData` is the main client-side identity source. It is used across components for:

- `username` / `channelName`
- `type` (`Normal`, `Kids`, `Channel`)
- profile image
- premium status

Most role-based rendering and API behavior branches from this provider state.

### API Base URL

Frontend calls backend through:

- `import.meta.env.VITE_SERVER_URL`

Make sure `.env` is configured correctly for local/stage/prod.

### Role-Based UI Gating

Multiple components restrict behavior by `userData.type`:

- Kids users are blocked from chat
- Channel users have channel-specific pages/settings
- Premium/user-specific actions are conditionally rendered

## Realtime Chat Architecture

Main component: `src/components/chat.jsx`

Responsibilities:

- Load chat friend list
- Load conversation history
- Send/receive messages via socket events
- Delete conversation
- Mark chat seen
- Maintain local active conversation state

Socket event patterns used:

- outgoing: `sendMessage`, `deleteChat`
- incoming: `receiveMessage`, `chatDeleted`

Seen/Unseen behavior:

- New incoming chats are unseen in backend
- Opening a conversation marks its incoming messages as seen
- Sidebar reads unseen chat count from backend and displays badge

## Notifications Architecture

Main component: `src/components/Notifications.jsx`

Responsibilities:

- Fetch all notifications
- Render notification message by `msgSerial`
- Filter by type (all/follow/like/comment/request)
- Accept follow requests from notification entries
- Mark notifications as seen on page load

Seen/Unseen behavior:

- New notifications are created unseen in backend
- Notifications page marks them seen
- Sidebar reads unseen notification count and shows badge

## Sidebar Behavior

Main component: `src/components/sidebar.jsx`

Responsibilities:

- Primary navigation
- Role-specific nav item filtering
- Profile shortcuts/menu
- Logout and kids-parent-password protected actions
- Unseen badge rendering for:
- Notifications
- Chat

Unseen counts are refreshed:

- on initial mount
- on periodic polling
- when tab/window regains focus

## Key Component Groups

### Navigation and Layout

- `sidebar.jsx`: right/bottom nav with role-based items and unseen badges
- page-level layouts inside individual components (home, profile, etc.)

### Social and Feed

- `Landing.jsx`: feed/home experience
- `Profile.jsx`: profile actions and state transitions
- `connect`-related components: user/channel discovery and follow graph actions

### Content Creation

- `create_post.jsx`, `create_post_2.jsx`: post creation flow
- channel post creation uses similar backend-driven flow

### Media Experiences

- `reels.jsx`: reels feed, playback, interactions
- `stories.jsx`: story listing and viewing

### Account Management

- `settings.jsx`, `KidsSettings.jsx`: role-specific settings
- `editProfile.jsx`, `editChannel.jsx`: profile editing UIs
- `DeleteAccount.jsx`: account/channel deletion UX

### Messaging and Alerts

- `chat.jsx`: realtime chat
- `Notifications.jsx`: notifications list and actions

## Common Hook Usage Patterns

- `useState`: local UI and request state
- `useEffect`: data fetch, socket listeners, lifecycle cleanup
- `useRef`: UI popovers, scroll containers, click-outside logic
- `useCallback`: stable handlers for expensive or reused callbacks
- `useNavigate` / router hooks: navigation and URL-driven behavior

## Contributor Notes

- Prefer role-safe checks when adding new features (`Normal` / `Kids` / `Channel`).
- Reuse existing API and notification patterns instead of creating parallel flows.
- If adding new notification types:
- define new backend `msgSerial`
- map it in frontend notification rendering
- ensure filter/type bucket is updated if needed
- ensure seen/unseen behavior still works
- Keep sidebar badge logic compatible with unseen-count endpoint shape.
- For realtime features, always clean up socket listeners in `useEffect` cleanup.

## Suggested README Maintenance Rule

When a new feature lands, update these sections:

- `Core Frontend Features`
- `Key Component Groups`
- `Notification msgSerial Mapping` (if changed)
- any new env vars or API contracts
