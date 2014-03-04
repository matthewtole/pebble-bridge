#!/usr/bin/env node

var WebSocketServer = require('websocket').server;
var http = require('http');
var program = require('commander');
var io = require('socket.io-client');

program
  .version('0.1.4')
  .option('-i, --id [id]', 'Bridge ID')
  .parse(process.argv);

var bridgeId = program.id;
var verbose = program.verbose;
var port = 9000;

if (! bridgeId) {
  program.help();
}

// In order to create a WebSocketServer, there has to be a HTTP server
// to attach it to. All HTTP requests to it will be redirected to the
// Pebble Bridge help page.
var server = http.createServer(function (req, res) {
  res.writeHead(302, { 'Location': 'http://pblweb.com/bridge/' });
  res.end();
});

// When the server starts listening, create the two websockets.
server.listen(port, function () {
  setupSocketServer(server, setupSocketClient());
});

// Create the server WebSocket, which takes the comments from the Pebble tool
// and sends them to the Pebble Bridge server.
function setupSocketServer(server, socket) {

  // Attach a new WebSocketServer to the HTTP server.
  var ws = new WebSocketServer({
    httpServer: server
  });

  // Handle incoming socket connections.
  ws.on('request', function (request) {

    var connection = request.accept();

    // Data from the Pebble tool can just be sent straight to the Pebble
    // Bridge server using the client socket.
    connection.on('message', function (message) {
      socket.emit('message', message);
    });

    // Messages from the client socket, which is data coming from the other
    // end of the bridge, need conveting into a buffer.
    socket.on('message', function (data) {
      var dataArray = Object.keys(data).map(function (k) {
        return data[k];
      });
      connection.sendBytes(new Buffer(dataArray));
    });

  });

}

// Create the client WebSocket (using socket.io) that handles communication
// with the Pebble Bridge server.
function setupSocketClient() {

  var socket = io.connect('http://pblweb.com/bridge');

  // When the socket connects, send the ID to the Bridge,
  // so it knows who we are.
  socket.on('connect', function () {
    socket.emit('id', { id: bridgeId });
    console.log('Connected to Pebble Bridge with ID ' + bridgeId);
  });

  // Introducing, the world's worst error handling.
  socket.on('error', function (err) {
    console.log('Could not connect to Pebble Bridge.');
  });

  return socket;

}

