# Meet.ai

AI-powered meeting application with real-time tasks, transcript analysis, and cross-platform support (web + mobile).

## Features

- **Video meetings**: High-quality video conferencing powered by LiveKit.
- **Real-time task assignment**: Automatically extract and assign tasks during meetings.
- **AI-powered transcript & Q&A**: Smart meeting summaries and searchable transcripts.
- **Cross-platform**: Seamless experience across Web and Mobile (React Native).

## Tech Stack

- **Frontend**: React + Vite (Web), React Native (Mobile - Planned)
- **Backend**: FastAPI (Planned)
- **Infrastructure**: LiveKit (WebRTC), Firebase (Auth)
- **Automation**: n8n

## Project Structure

```text
meet.ai/
├── apps/
│   ├── web/          # React + Vite web application
│   └── mobile/       # React Native application (Planned)
├── packages/         # Shared packages (Planned)
└── backend/          # FastAPI backend (Planned)
```

## Setup Instructions

### Prerequisites

- [pnpm](https://pnpm.io/installation) installed.

### Installation

```bash
pnpm install
```

### Running the App

To start the web frontend:

```bash
pnpm run dev --filter web
```
