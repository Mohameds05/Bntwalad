const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

let players = {};
let usedLetters = [];
let pickingHistory = [];
const alphabet = "أبتثجحخدذرزسشصضطظعغفقكلمنهوي";

io.on('connection', (socket) => {
    
    socket.on('join_game', (nickname) => {
        players[socket.id] = { id: socket.id, name: nickname, ready: false, score: 0 };
        io.emit('update_players', players);
    });

    socket.on('player_ready', () => {
        if (players[socket.id]) {
            players[socket.id].ready = true;
            io.emit('update_players', players);
            
            const allReady = Object.values(players).every(p => p.ready);
            if (allReady && Object.keys(players).length >= 2) {
                startNewRound();
            }
        }
    });

    function startNewRound() {
        if (usedLetters.length >= alphabet.length) {
            return io.emit('game_over', { winner: getWinner() });
        }

        const playerIds = Object.keys(players);
        let availablePickers = playerIds.filter(id => !pickingHistory.includes(id));
        
        if (availablePickers.length === 0) {
            pickingHistory = [];
            availablePickers = playerIds;
        }

        const pickerId = availablePickers[Math.floor(Math.random() * availablePickers.length)];
        pickingHistory.push(pickerId);

        const remaining = alphabet.split('').filter(l => !usedLetters.includes(l)).join('');
        io.emit('picker_selected', { 
            pickerId, 
            pickerName: players[pickerId].name,
            remaining 
        });
    }

    socket.on('letter_chosen', (letter) => {
        usedLetters.push(letter);
        io.emit('start_game', letter);
    });

    socket.on('submit_round', (data) => {
        if (players[socket.id]) {
            players[socket.id].score += data.roundScore;
            io.emit('round_ended', { 
                stopper: players[socket.id].name, 
                players 
            });
        }
    });

    socket.on('send_msg', (txt) => {
        io.emit('msg', { name: players[socket.id]?.name || "لاعب", txt });
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('update_players', players);
    });
});

function getWinner() {
    return Object.values(players).reduce((prev, current) => (prev.score > current.score) ? prev : current);
}

http.listen(3000, () => console.log('Server running!'));
