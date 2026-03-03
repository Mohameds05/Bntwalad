const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

let players = {};
let usedLetters = [];
let pickingHistory = [];
const alphabet = "أبتثجحخدذرزسشصضطظعغفقكلمنهوي";

io.on('connection', (socket) => {
    
    // دخول لاعب جديد
    socket.on('join_game', (nickname) => {
        players[socket.id] = { id: socket.id, name: nickname, ready: false, score: 0 };
        io.emit('update_players', players);
    });

    // لاعب يعلن جاهزيته
    socket.on('player_ready', () => {
        if (players[socket.id]) {
            players[socket.id].ready = true;
            io.emit('update_players', players);
            
            const allReady = Object.values(players).every(p => p.ready);
            const playerCount = Object.keys(players).length;
            
            if (allReady && playerCount >= 2) {
                startNewRound();
            }
        }
    });

    // بداية جولة جديدة واختيار من سيختار الحرف
    function startNewRound() {
        if (usedLetters.length >= alphabet.length) {
            return io.emit('game_over', { reason: "انتهت جميع الحروف!" });
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

    // استقبال الحرف وبدء اللعب
    socket.on('letter_chosen', (letter) => {
        usedLetters.push(letter);
        io.emit('start_game', letter);
    });

    // لاعب ضغط على STOP
    socket.on('stop_round_btn', () => {
        if (players[socket.id]) {
            // نطلب من كل اللاعبين يحسبوا سكوراتهم
            io.emit('trigger_score_calc', players[socket.id].name);
            
            // نرجعو الناس الكل "غير جاهزين" استعداداً للجولة القادمة
            for(let id in players) {
                players[id].ready = false;
            }
        }
    });

    // استقبال السكور من كل لاعب وتحديث القائمة
    socket.on('send_my_score', (score) => {
        if (players[socket.id]) {
            players[socket.id].score += score;
            io.emit('update_players', players);
        }
    });

    // الدردشة
    socket.on('send_msg', (txt) => {
        io.emit('msg', { name: players[socket.id]?.name || "لاعب", txt });
    });

    // خروج لاعب
    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('update_players', players);
    });
});

http.listen(3000, () => console.log('Server is running on port 3000'));
