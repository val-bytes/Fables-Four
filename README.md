# Fables Four

Fables Four is a digital multiplayer card game built with an Electron client and a Node.js/Socket.IO backend. The game features both an offline AI mode and real-time cloud matchmaking, complete with a self-hosted auto-update pipeline.

## 🌟 Features

* **Real-Time Multiplayer:** Matchmake and play against other users online via a Google Cloud hosted Socket.IO server.
* **Pre-Match Score Voting:** Negotiate the target score (10, 20, or 30 points) with opponents in real-time before a match begins.
* **Offline AI Mode:** Play locally against an automated opponent without needing a server connection.
* **Dynamic Viewport Scaling:** The game board and cards automatically scale to perfectly fit any display resolution or window size.
* **Automated Updates:** The client checks the server for new versions on boot. Updates are downloaded in the background and applied seamlessly via `electron-updater`.
* **In-Game Changelog:** Patch notes are stored in a centralized SQLite database and broadcast to the client.

## 🏗️ Repository Structure

This is a monorepo containing both the client application and the cloud server.

```text
Fables-Four/
├── client/                 # Electron Desktop Application
│   ├── index.html          # Game UI and frontend logic
│   ├── main.js             # Electron main process and updater hooks
│   ├── package.json        # Client dependencies and build configurations
│   └── images/, fonts/     # Static assets
└── server/                 # Node.js Backend 
    ├── server.js           # Express and Socket.IO server, SQLite initialization
    ├── package.json        # Server dependencies
    └── updates/            # Staging directory for new client patch files
```

## 🚀 Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (v20 or newer recommended)
* Git

### Backend Setup (Google Cloud / Ubuntu VM)
The server manages player authentication, matchmaking, and serves the static update files for the client.

1. Navigate to the server directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install express socket.io sqlite3
   ```
3. Run the server (Port 3000):
   ```bash
   node server.js
   ```
   *(For production environments, running via `pm2` is recommended to keep the daemon alive).*

### Client Setup (Local Windows Machine)
The client is a standalone desktop application built with Electron.

1. Navigate to the client directory:
   ```bash
   cd client
   ```
2. Install dependencies (including Electron and builders):
   ```bash
   npm install
   ```
3. Run the game locally in development mode:
   ```bash
   npm start
   ```

## 📦 Building & Deploying Updates

Fables Four uses a self-hosted update pipeline. The Electron client checks the server's `/updates` endpoint for new NSIS installers.

1. **Bump Version:** Increase the `"version"` number in `client/package.json`.
2. **Compile:** Run `npm run build` inside the `client/` folder.
3. **Upload:** Take the newly generated `latest.yml` and `fables-four Setup X.X.X.exe` from the `client/dist/` folder and upload them to the `server/updates/` folder on your host machine.
4. **Patch Notes:** SSH into the server and insert your patch notes into the SQLite database:
   ```bash
   sqlite3 fables.db "INSERT INTO changelog (version, timestamp, notes) VALUES ('X.X.X', datetime('now', 'localtime'), 'Your patch notes here.');"
   ```
The next time clients launch the game, they will automatically detect the new `latest.yml` file, disable online matchmaking to prevent version mismatches, and prompt the user to download the update.

## 🛠️ Technology Stack

* **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
* **Desktop Wrapper:** Electron, electron-builder, electron-updater
* **Backend:** Node.js, Express, Socket.IO
* **Database:** SQLite3
