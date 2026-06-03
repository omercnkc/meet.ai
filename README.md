# Meet.AI

> AI-powered meeting platform with real-time video, automated transcription, intelligent Q&A, and task management.

Meet.AI is a full-stack monorepo application that lets teams host video meetings, automatically transcribe recordings using Google Gemini, ask AI questions about what was discussed, assign tasks to participants, and receive email notifications — all in one place. Available as both a web app and a React Native mobile app.

---

## Table of Contents

- [Features](#features)
- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup & Installation](#setup--installation)
  - [1. Clone the repository](#1-clone-the-repository)
  - [2. Install dependencies](#2-install-dependencies)
  - [3. Configure environment variables](#3-configure-environment-variables)
  - [4. Run the services](#4-run-the-services)
- [Environment Variables Reference](#environment-variables-reference)
- [API Reference](#api-reference)
- [Meeting Join Flow](#meeting-join-flow)
- [External Services](#external-services)
- [Mobile Setup](#mobile-setup)
- [Contributing](#contributing)

---

## Features

### Video Meetings
- Real-time multi-participant video and audio via LiveKit WebRTC
- Camera/microphone toggle, screen sharing
- In-meeting chat and data channel messaging
- Picture-in-Picture (PiP) mode on web

### Guest Admission Control
- Guests request to join via invite link — they do **not** enter directly
- Host receives real-time join request notification
- Host accepts or rejects; guest only receives a LiveKit token upon acceptance
- Restricted waiting-room token while the guest is pending (data channel only, no media)

### Transcription
- Client-side audio recording during the meeting
- Upload recording to backend after meeting ends
- Automatic transcription via Google Gemini API (Turkish language support)
- Transcript displayed in post-meeting summary page

### AI Q&A
- Ask natural language questions about meeting content
- Gemini responds strictly based on the meeting transcript
- Full conversation history preserved per meeting
- Available on both web and mobile

### Task Management
- Create and assign tasks to meeting participants during or after the meeting
- Tasks saved to Firestore in real time
- Automatic email notifications to assignees via n8n automation

### Invite & Join
- Share meeting invite link from dashboard or active meeting
- Join any meeting by entering its ID (web and mobile)
- Deep link support on mobile

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Clients                              │
│                                                             │
│   ┌──────────────────┐        ┌──────────────────────┐     │
│   │   Web App        │        │   Mobile App         │     │
│   │  React + Vite    │        │ React Native + Expo  │     │
│   │  localhost:5173  │        │   Expo Dev Client    │     │
│   └────────┬─────────┘        └──────────┬───────────┘     │
└────────────┼──────────────────────────────┼─────────────────┘
             │                              │
             ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Backend Services                        │
│                                                             │
│  ┌─────────────────────┐   ┌──────────────────────────┐    │
│  │  FastAPI Backend    │   │  Node.js Express API     │    │
│  │  Python · Port 8000 │   │  JavaScript · Port 3001  │    │
│  │                     │   │                          │    │
│  │  - LiveKit tokens   │   │  - Guest admission flow  │    │
│  │  - Recording upload │   │  - Join request handling │    │
│  │  - Transcription    │   │  - n8n meeting end hook  │    │
│  │  - AI Q&A (Gemini)  │   │  - In-memory state       │    │
│  │  - Task creation    │   └──────────────────────────┘    │
│  └──────────┬──────────┘                                    │
└─────────────┼───────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│                    External Services                        │
│                                                             │
│  LiveKit Cloud    Firebase (Auth + Firestore)               │
│  Supabase         Google Gemini API    n8n Automation       │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Web Frontend** | React 19, Vite, TypeScript | Web application |
| **Mobile Frontend** | React Native 0.81, Expo 54 | iOS & Android app |
| **UI Components** | Radix UI, Tailwind CSS 4, shadcn/ui | Accessible component system |
| **Animations** | Framer Motion | UI transitions |
| **Node API** | Express 4, ES Modules | Admission control microservice |
| **Python Backend** | FastAPI 0.115, Uvicorn | Core API for media, AI, tasks |
| **Real-time Video** | LiveKit Cloud (WebRTC) | Video/audio/data channels |
| **Authentication** | Firebase Auth | User identity & ID tokens |
| **Database** | Firestore | Meetings, tasks, users |
| **Storage + DB** | Supabase (PostgreSQL + S3) | Recordings, transcripts, AI history |
| **AI Transcription** | Google Gemini API | Audio-to-text, meeting Q&A |
| **Automation** | n8n | Task assignment email notifications |
| **Package Manager** | pnpm workspaces | Monorepo management |

---

## Project Structure

```
meet.ai/
├── apps/
│   ├── web/                        # React + Vite web application
│   │   └── src/
│   │       ├── app/router/         # Client-side routing
│   │       ├── pages/
│   │       │   ├── landing/        # Marketing landing page
│   │       │   ├── login/          # Authentication
│   │       │   ├── register/
│   │       │   ├── dashboard/      # Meeting list & management
│   │       │   ├── meeting-room/   # Live video meeting
│   │       │   ├── meeting-summary/# Post-meeting AI & transcript
│   │       │   └── tasks/          # Task management
│   │       └── shared/
│   │           ├── lib/
│   │           │   ├── firebase/   # Firebase SDK config & services
│   │           │   ├── livekit/    # Token fetching & room management
│   │           │   └── api/        # REST API client functions
│   │           └── components/     # Shared UI components
│   │
│   ├── mobile/                     # React Native + Expo app
│   │   └── src/
│   │       ├── navigation/         # Stack navigator (auth/app flows)
│   │       ├── screens/
│   │       │   ├── LoginScreen
│   │       │   ├── RegisterScreen
│   │       │   ├── DashboardScreen
│   │       │   ├── ActiveMeetingScreen
│   │       │   └── MeetingSummaryScreen
│   │       ├── components/         # Reusable components
│   │       ├── services/           # API and Firebase services
│   │       ├── config/env.ts       # Environment configuration
│   │       └── theme/              # Colors, typography, spacing
│   │
│   ├── node-api/                   # Express admission microservice
│   │   └── src/
│   │       ├── index.js            # Entry point (port 3001)
│   │       ├── routes/
│   │       │   ├── admission.js    # Join request flow endpoints
│   │       │   └── meetings.js     # Meeting end / n8n webhook
│   │       └── services/
│   │           ├── admission-store.js  # In-memory join request state
│   │           ├── db.js               # Database queries
│   │           └── n8n.js              # Webhook notifications
│   │
│   └── backend/                    # FastAPI Python backend
│       └── app/
│           ├── main.py             # FastAPI app entry
│           ├── api/v1/
│           │   ├── livekit.py      # Token generation
│           │   ├── recordings.py   # Audio upload & storage
│           │   ├── transcripts.py  # Transcription pipeline
│           │   ├── ai.py           # Gemini Q&A
│           │   └── tasks.py        # Task creation & notifications
│           ├── services/
│           │   ├── livekit_service.py
│           │   ├── transcription_service.py
│           │   ├── ai_service.py
│           │   └── supabase_service.py
│           ├── integrations/
│           │   ├── firebase_admin.py
│           │   └── n8n/
│           └── core/config.py      # Settings from environment
│
├── docs/
│   └── meeting-join-flow.md        # Guest admission flow spec
├── pnpm-workspace.yaml
└── package.json                    # Root workspace scripts
```

---

## Prerequisites

Make sure the following are installed on your machine:

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 20+ | Required for web and node-api |
| pnpm | 9+ | `npm install -g pnpm` |
| Python | 3.11+ | Required for backend |
| Expo CLI | latest | `npm install -g expo-cli` (for mobile) |
| Android Studio / Xcode | latest | For running the mobile emulator |

You also need accounts and credentials for:

- **[LiveKit Cloud](https://livekit.io)** — free tier available; create a project and copy your API key, secret, and WebSocket URL
- **[Firebase](https://console.firebase.google.com)** — create a project, enable Authentication (email/password) and Firestore, download a service account JSON
- **[Supabase](https://supabase.com)** — create a project, enable Storage (bucket: `meet-recordings`), copy the project URL and service role key
- **[Google AI Studio](https://aistudio.google.com)** — generate a Gemini API key
- **[n8n](https://n8n.io)** *(optional)* — set up a workflow for task email notifications

---

## Setup & Installation

### 1. Clone the repository

```bash
git clone https://github.com/omercnkc/meet.ai.git
cd meet.ai
```

### 2. Install dependencies

```bash
# Install all workspace dependencies (web, mobile, node-api)
pnpm install

# Install Python backend dependencies
cd apps/backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
cd ../..
```

### 3. Configure environment variables

Each app has its own `.env` file. Copy the examples below and fill in your credentials.

#### Web — `apps/web/.env`

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

VITE_LIVEKIT_URL=wss://your-livekit-project.livekit.cloud
VITE_LIVEKIT_TOKEN_ENDPOINT=http://localhost:8000/api/livekit/token
```

#### Node API — `apps/node-api/.env`

```env
PORT=3001

LIVEKIT_URL=wss://your-livekit-project.livekit.cloud
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret

# Optional: n8n webhook for meeting-end notifications
N8N_URL=http://localhost:5678/webhook/meet-ai-task-email
N8N_SECRET=your_n8n_secret_token
```

#### Python Backend — `apps/backend/.env`

```env
# LiveKit
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_URL=wss://your-livekit-project.livekit.cloud

# Firebase — download service account JSON from Firebase Console
FIREBASE_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json

# Server
HOST=0.0.0.0
PORT=8000
CORS_ORIGINS=http://localhost:5173

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_RECORDINGS_BUCKET=meet-recordings

# Google Gemini
GEMINI_API_KEY=your_gemini_api_key
GEMINI_TRANSCRIPTION_MODEL=gemini-2.5-flash

# Optional: n8n
N8N_TASK_WEBHOOK_URL=https://your-n8n-instance.cloud/webhook/task-assigned
N8N_WEBHOOK_SECRET=your_webhook_secret
```

#### Mobile — `apps/mobile/src/config/env.ts`

The mobile app reads its config from `apps/mobile/src/config/env.ts`. Update the values there directly:

```ts
export const ENV = {
  FIREBASE_API_KEY: "your_firebase_api_key",
  FIREBASE_AUTH_DOMAIN: "your-project.firebaseapp.com",
  FIREBASE_PROJECT_ID: "your-project-id",
  LIVEKIT_URL: "wss://your-livekit-project.livekit.cloud",
  API_BASE_URL: "http://<your-local-ip>:8000",   // use LAN IP, not localhost
  NODE_API_BASE_URL: "http://<your-local-ip>:3001",
};
```

> **Note for mobile**: Use your machine's local IP address (e.g., `192.168.1.x`) instead of `localhost` — mobile devices cannot reach `localhost` on the host machine.

#### Firebase Service Account

Place your Firebase service account JSON file at:

```
apps/backend/firebase-service-account.json
```

Download it from: Firebase Console → Project Settings → Service Accounts → Generate new private key.

### 4. Run the services

Open four terminal windows and start each service:

#### Terminal 1 — Web Frontend

```bash
pnpm dev
# Starts at http://localhost:5173
```

#### Terminal 2 — Python Backend (FastAPI)

```bash
cd apps/backend
# Activate virtual environment first
.venv\Scripts\activate    # Windows
source .venv/bin/activate  # macOS/Linux

python run.py
# Starts at http://localhost:8000
# API docs at http://localhost:8000/docs
```

#### Terminal 3 — Node API (Admission Service)

```bash
cd apps/node-api
pnpm dev
# Starts at http://localhost:3001
# Health check: http://localhost:3001/health
```

#### Terminal 4 — Mobile App *(optional)*

```bash
pnpm mobile
# Opens Expo Go QR code
# Scan with Expo Go app on your device
# Or press 'a' for Android emulator, 'i' for iOS simulator
```

---

## Environment Variables Reference

### Web Frontend (`apps/web`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Yes | Firebase project API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Yes | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Yes | Firebase app ID |
| `VITE_LIVEKIT_URL` | Yes | LiveKit WebSocket URL |
| `VITE_LIVEKIT_TOKEN_ENDPOINT` | Yes | URL of `POST /api/livekit/token` |

### Node API (`apps/node-api`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Port number (default: `3001`) |
| `LIVEKIT_URL` | Yes | LiveKit WebSocket URL |
| `LIVEKIT_API_KEY` | Yes | LiveKit API key |
| `LIVEKIT_API_SECRET` | Yes | LiveKit API secret |
| `N8N_URL` | No | n8n webhook URL for meeting end |
| `N8N_SECRET` | No | Bearer token for n8n auth |

### Python Backend (`apps/backend`)

| Variable | Required | Description |
|----------|----------|-------------|
| `LIVEKIT_API_KEY` | Yes | LiveKit API key |
| `LIVEKIT_API_SECRET` | Yes | LiveKit API secret |
| `LIVEKIT_URL` | Yes | LiveKit WebSocket URL |
| `FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `GOOGLE_APPLICATION_CREDENTIALS` | Yes | Path to service account JSON |
| `HOST` | No | Server host (default: `0.0.0.0`) |
| `PORT` | No | Server port (default: `8000`) |
| `CORS_ORIGINS` | No | Allowed origins (default: `*`) |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `SUPABASE_RECORDINGS_BUCKET` | No | Storage bucket name (default: `meet-recordings`) |
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `GEMINI_TRANSCRIPTION_MODEL` | No | Gemini model for transcription |
| `N8N_TASK_WEBHOOK_URL` | No | n8n webhook for task notifications |
| `N8N_WEBHOOK_SECRET` | No | Auth secret for n8n webhook |

---

## API Reference

### FastAPI Backend — `http://localhost:8000`

Interactive API documentation is available at `http://localhost:8000/docs` when running locally.

All endpoints require a Firebase ID token:
```
Authorization: Bearer <firebase_id_token>
```

#### LiveKit

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/livekit/token` | Generate a LiveKit room access token |

**Request body:**
```json
{
  "roomName": "meeting-id-123",
  "identity": "user-uid",
  "name": "John Doe"
}
```

**Response:**
```json
{ "token": "eyJ..." }
```

#### Recordings

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/recordings/upload` | Upload a meeting audio recording (multipart/form-data) |
| `GET` | `/api/recordings/{meetingId}` | Get recording metadata for a meeting |

**Upload fields:** `meetingId`, `file` (audio blob), `durationSeconds` *(optional)*, `mimeType` *(optional)*

#### Transcripts

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/transcripts/generate` | Trigger Gemini transcription for the latest recording |
| `GET` | `/api/transcripts/{meetingId}` | Fetch transcripts for a meeting |

**Generate request body:**
```json
{ "meetingId": "meeting-id-123" }
```

#### AI Q&A

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/ai/ask` | Ask a question about the meeting transcript |
| `GET` | `/api/ai/messages/{meetingId}` | Fetch Q&A conversation history |

**Ask request body:**
```json
{
  "meetingId": "meeting-id-123",
  "question": "What action items were discussed?"
}
```

#### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/tasks` | Create a task and notify assignees |

**Request body:**
```json
{
  "meetingId": "meeting-id-123",
  "title": "Follow up with design team",
  "assignees": [
    { "userId": "uid1", "name": "Alice", "email": "alice@example.com" }
  ]
}
```

---

### Node API — `http://localhost:3001`

No authentication required — requests originate from authenticated frontends.

#### Admission

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/admission/request` | Guest requests to join a meeting |
| `POST` | `/api/admission/approve` | Host approves a guest join request |
| `POST` | `/api/admission/reject` | Host rejects a guest join request |

**`/request` body:**
```json
{
  "meetingId": "meeting-id-123",
  "userId": "guest-uid",
  "userName": "Bob"
}
```

**`/request` response:**
```json
{
  "success": true,
  "waitingToken": "eyJ..."
}
```

**`/approve` and `/reject` body:**
```json
{
  "meetingId": "meeting-id-123",
  "userId": "guest-uid",
  "callerId": "host-uid",
  "hostId": "host-uid"
}
```

> Rate limiting: max 5 requests per user per minute on `/request`.

#### Meetings

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/meetings/end` | End meeting and trigger n8n summary webhook |
| `GET` | `/health` | Health check — returns `{ "status": "ok" }` |

---

## Meeting Join Flow

Meet.AI uses a controlled admission flow to prevent uninvited users from joining directly:

```
Guest clicks invite link
        │
        ▼
POST /api/admission/request
  → Node API stores request in memory
  → Generates restricted waiting token
    (DataChannel only — cannot publish or subscribe to media)
  → Broadcasts JOIN_REQUEST via LiveKit DataChannel to room
        │
        ▼
Guest connects to LiveKit with restricted token
  → Listens for admission decision on "admission" DataChannel topic
        │
        │               ┌────────────────────────────────────┐
        │               │  Host sees real-time popup         │
        │               │  with Accept / Reject buttons      │
        │               └────────────┬───────────────────────┘
        │                            │
        │            ┌───────────────┴──────────────────┐
        │            │                                  │
        │         APPROVE                           REJECT
        │            │                                  │
        │   POST /api/admission/approve     POST /api/admission/reject
        │     → Sends JOIN_APPROVED           → Sends JOIN_REJECTED
        │       via DataChannel                 via DataChannel
        │            │                                  │
        ▼            ▼                                  ▼
Guest receives    Guest fetches full             Guest sees
decision event    LiveKit token from backend     "Request Declined"
                  and joins meeting room         screen
```

**Key rule:** Invite links grant no access by themselves. A full LiveKit media token is only issued after the host explicitly approves the request.

---

## External Services

### LiveKit

Real-time video/audio/data channel infrastructure.

- Sign up at [livekit.io](https://livekit.io) and create a cloud project
- Copy the WebSocket URL, API key, and secret
- Use the **same credentials** in both `node-api/.env` and `backend/.env`

### Firebase

Used for user authentication and the Firestore real-time database.

- Enable **Email/Password** authentication in Firebase Console
- Create a **Firestore database** (start in production mode)
- Download a **Service Account JSON** for the Python backend
- Add the Firebase web config values to `apps/web/.env`

**Firestore Collections:**

| Collection | Description |
|-----------|-------------|
| `meetings` | Meeting metadata: ID, host, status, participants, timestamps |
| `tasks` | Task records: title, status, assignees, meetingId |
| `users` | User profiles synced from Firebase Auth |

### Supabase

Used as a PostgreSQL database and S3-compatible object storage.

- Create a project at [supabase.com](https://supabase.com)
- Create a Storage bucket named `meet-recordings` (or override via env)
- The backend creates the following tables automatically:
  - `meeting_recordings` — recording metadata
  - `meeting_transcripts` — full transcript text and segments
  - `meeting_ai_messages` — AI Q&A history per meeting

### Google Gemini

Handles audio transcription and conversational Q&A.

- Get an API key from [Google AI Studio](https://aistudio.google.com)
- Recommended model: `gemini-2.5-flash`
- Transcription language defaults to **Turkish** (configurable in `transcription_service.py`)
- Files under 15 MB are sent inline; larger files use the Gemini Files API

### n8n (optional)

Automation platform for email notifications.

- Triggered when a task is assigned (`POST /api/tasks`)
- Triggered when a meeting ends (`POST /api/meetings/end`)
- Create a **Webhook trigger** workflow in n8n and paste the URL into the env files

---

## Mobile Setup

### Running on a physical device

1. Install **Expo Go** from the App Store or Google Play
2. Update `apps/mobile/src/config/env.ts` with your machine's LAN IP:
   ```ts
   API_BASE_URL: "http://192.168.x.x:8000",
   NODE_API_BASE_URL: "http://192.168.x.x:3001",
   ```
3. Run `pnpm mobile` and scan the QR code with Expo Go

> **Why LAN IP?** The mobile device runs on your local network but cannot resolve `localhost` on the host machine. Find your IP with `ipconfig` (Windows) or `ifconfig` (macOS/Linux).

### Running on an emulator

```bash
# Android emulator
pnpm android

# iOS simulator (macOS only)
pnpm ios
```

### Native Android build

```bash
cd apps/mobile
npx expo run:android
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit your changes following [Conventional Commits](https://www.conventionalcommits.org/): `git commit -m "feat: add your feature"`
4. Push to your branch: `git push origin feat/your-feature`
5. Open a Pull Request against `main`

---

## License

This project is for educational and personal use.
