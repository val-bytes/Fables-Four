const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
app.use('/updates', express.static(path.join(__dirname, 'updates')));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } }); 

const db = new sqlite3.Database('./fables.db');
db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, salt TEXT, hash TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS changelog (id INTEGER PRIMARY KEY AUTOINCREMENT, version TEXT, timestamp TEXT, notes TEXT)");
    db.get("SELECT count(*) as count FROM changelog", (err, row) => {
        if (row && row.count === 0) {
            db.run("INSERT INTO changelog (version, timestamp, notes) VALUES ('1.0.0', datetime('now', 'localtime'), 'Initial Fables Four cloud release. Setup the self-hosted update pipeline.')");
        }
    });
});

function hashPassword(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

let lobby = {};
let pendingChallenges = {};
let activeVotes = {}; 

io.on('connection', (socket) => {
    socket.on('get_changelog', () => {
        db.all("SELECT * FROM changelog ORDER BY id DESC", [], (err, rows) => {
            socket.emit('changelog_data', rows || []);
        });
    });

    socket.on('register', (data) => {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = hashPassword(data.password, salt);
        db.run("INSERT INTO users (username, salt, hash) VALUES (?, ?, ?)", [data.username, salt, hash], function(err) {
            if (err) socket.emit('auth_result', { success: false, msg: "Username already exists." });
            else {
                lobby[socket.id] = data.username;
                socket.emit('auth_result', { success: true, username: data.username });
                io.emit('lobby_update', lobby);
            }
        });
    });

    socket.on('login', (data) => {
        db.get("SELECT * FROM users WHERE username = ?", [data.username], (err, row) => {
            if (row && hashPassword(data.password, row.salt) === row.hash) {
                lobby[socket.id] = data.username;
                socket.emit('auth_result', { success: true, username: data.username });
                io.emit('lobby_update', lobby);
            } else socket.emit('auth_result', { success: false, msg: "Invalid credentials." });
        });
    });

    socket.on('challenge_player', (targetId) => {
        pendingChallenges[socket.id] = targetId;
        if (pendingChallenges[targetId] === socket.id) {
            const gameId = socket.id + targetId;
            socket.join(gameId);
            io.sockets.sockets.get(targetId).join(gameId);
            
            activeVotes[gameId] = { [socket.id]: null, [targetId]: null };
            io.to(gameId).emit('score_vote_start', { p1: socket.id, p2: targetId, gameId });
            
            delete pendingChallenges[socket.id]; 
            delete pendingChallenges[targetId];
        } else {
            io.to(targetId).emit('challenged', { id: socket.id, name: lobby[socket.id] });
        }
    });

    socket.on('submit_vote', (data) => {
        const { gameId, score } = data;
        if (!activeVotes[gameId]) return;
        
        activeVotes[gameId][socket.id] = score;
        const players = Object.keys(activeVotes[gameId]);
        const otherPlayer = players.find(p => p !== socket.id);
        const otherVote = activeVotes[gameId][otherPlayer];

        if (otherVote === score) {
            io.to(gameId).emit('game_start', { p1: players[0], p2: players[1], gameId: gameId, score: score });
            delete activeVotes[gameId];
        } else {
            io.to(otherPlayer).emit('opponent_voted', { score, name: lobby[socket.id] });
        }
    });

    socket.on('sync_state', (data) => socket.to(data.gameId).emit('state_update', data.state));
    
    socket.on('disconnect', () => {
        delete lobby[socket.id]; 
        delete pendingChallenges[socket.id];
        for (const [gameId, votes] of Object.entries(activeVotes)) {
            if (votes[socket.id] !== undefined) delete activeVotes[gameId];
        }
        io.emit('lobby_update', lobby);
    });
});

server.listen(3000, '0.0.0.0', () => console.log('Fables Four Cloud Server Online'));