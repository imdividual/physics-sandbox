var tests = require('./server/tests.js');
tests();

const Engine = require('./server/Engine.js');

var express = require('express');
var app = express();
var serv = require('http').Server(app);

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/client/index.html');
});

app.use('/client', express.static(__dirname + '/client'));
app.use('/shared', express.static(__dirname + '/shared'));

serv.listen(8080);

console.log("server started");

var io = require('socket.io')(serv, {});

var SOCKET_LIST = {};
var FPS = 60;

io.sockets.on('connection', function(socket) {
    console.log('new socket connection');
    // Generate ID
    var id = 0;
    var unique = false;
    while (!unique) {
        id = Math.random();
        unique = true;
        for (var i in SOCKET_LIST) {
            if (SOCKET_LIST[i].id == id) {
                unique = false;
                break;
            }
        }
    }
    socket.id = id;

    // attributes
    socket.state = -1;

    // add socket
    SOCKET_LIST[socket.id] = socket;

    socket.on('add', function(data) {
      engine.entityManager.addRandom(data.x, data.y);
    });

    socket.on('lock', function(data) {
      engine.entityManager.lock(data.x, data.y);
    });

    socket.on('unlock', function(data) {
      engine.entityManager.unlock();
    });

    socket.on('move', function(data) {
      engine.entityManager.move(data.x, data.y);
    });

    // when player disconnects
    socket.on('disconnect', function() {
      console.log('socket disconnection');
        delete SOCKET_LIST[socket.id];
    });
});

var engine = new Engine();
engine.init();

// main game loop
const gameloop = require('node-gameloop');

const id = gameloop.setGameLoop(function(delta) {
  // engine calculations
  engine.update(delta);

  // send data to client
  for (var i in SOCKET_LIST) {
      var socket = SOCKET_LIST[i];
      socket.emit(
          'update', {
              entities: engine.entityManager.package()
          }
      );
  }
}, 1000 / 60);


/*
setInterval(function() {
    // engine calculations
    engine.update();

    // send data to client
    for (var i in SOCKET_LIST) {
        var socket = SOCKET_LIST[i];
        socket.emit(
            'update', {
                entities: engine.entityManager.package()
            }
        );
    }
}, 1000 / FPS);
*/
