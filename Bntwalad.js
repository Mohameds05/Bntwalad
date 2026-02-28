const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

let players = {};
let pickingHistory = []; // قيد اللاعبين اللي اختاروا

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
      const playerKeys = Object.keys(players);

      if (allReady && playerKeys.length >= 2) {
        selectNextPicker();
      }
    }
  });

  function selectNextPicker() {
    const playerKeys = Object.keys(players);
    let availablePickers = playerKeys.filter(id => !pickingHistory.includes(id));

    if (availablePickers.length === 0) {
      pickingHistory = [];
      availablePickers = playerKeys;
    }

    const pickerId = availablePickers[Math.floor(Math.random() * availablePickers.length)];
    pickingHistory.push(pickerId);
    io.emit('picker_selected', { pickerName: players[pickerId].name, pickerId: pickerId });
  }

  socket.on('letter_chosen', (letter) => {
    io.emit('start_game_with_letter', letter);
  });

  socket.on('send_msg', (data) => {
    io.emit('receive_msg', { name: players[socket.id]?.name || "لاعب", text: data.text });
  });

  socket.on('player_stopped', (results) => {
    // تحديث السكور
    if(players[socket.id]) players[socket.id].score += results.score;
    io.emit('stop_game_forall', { winner: players[socket.id].name, players: players });
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    pickingHistory = pickingHistory.filter(id => id !== socket.id);
    io.emit('update_players', players);
  });
});

http.listen(3000, () => { console.log('Server Active on Port 3000'); });
