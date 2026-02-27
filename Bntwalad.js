const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

let currentLetter = 'أ';
const alphabet = "أبتثجحخدذرزسشصضطظعغفقكلمنهوي";

io.on('connection', (socket) => {
  console.log('لاعب جديد دخل!');

  // أول ما يدخل لاعب نعطيوه الحرف الحالي
  socket.emit('init', { letter: currentLetter });

  // كي واحد ينزل STOP يوقّف اللعبة عند الناس الكل
  socket.on('player_stopped', (payload) => {
    io.emit('stop_game_forall', payload);
  });

  // طلب جولة جديدة
  socket.on('request_next_round', () => {
    currentLetter = alphabet[Math.floor(Math.random() * alphabet.length)];
    io.emit('new_round_started', { letter: currentLetter });
  });
});

http.listen(3000, () => {
  console.log('Server is running on port 3000');
});
