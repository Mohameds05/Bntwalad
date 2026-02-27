const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

let players = {}; // نخزنوا فيه الأسامي والحالة (Ready أم لا)
let currentLetter = 'أ';
const alphabet = "أبتثجحخدذرزسشصضطظعغفقكلمنهوي";

io.on('connection', (socket) => {
  
  socket.on('join_game', (nickname) => {
    players[socket.id] = { name: nickname, ready: false, score: 0 };
    io.emit('update_players', players); // نبعثوا القائمة الجديدة للناس الكل
  });

  socket.on('player_ready', () => {
    if (players[socket.id]) {
      players[socket.id].ready = true;
      io.emit('update_players', players);
      
      // نثبتوا هل الناس الكل Ready؟
      const allReady = Object.values(players).every(p => p.ready);
      if (allReady && Object.keys(players).length >= 2) {
        io.emit('start_countdown'); // نبدأ العد التنازلي لبداية اللعبة
      }
    }
  });

  socket.on('player_stopped', () => {
    io.emit('stop_game_forall');
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('update_players', players);
  });
});

http.listen(3000, () => { console.log('Lobby Server running on 3000'); });
