#!/usr/bin/env node

var WebSocketServer = require('websocket').server;
var http = require('http');
var program = require('commander');
var io = require('socket.io-client');

program
  .version('0.1.1')
  .option('-i, --id [id]', 'Bridge ID')
  .parse(process.argv);

var bridgeId = program.id;
var verbose = program.verbose;
var port = 9000;

if (! bridgeId) {
  program.help();
}

var socket = io.connect('http://pblweb.com/bridge');
socket.on('connect', function () {

  socket.emit('id', { id: bridgeId });
  console.log('Connected to Pebble Bridge with ID ' + bridgeId)

  var server = http.createServer(function (req, res) {
    res.redirect('http://pblweb.com/bridge/')
  });

  server.listen(port, function () {

    var ws = new WebSocketServer({
      httpServer: server
    });

    ws.on('request', function (request) {
      var connection = request.accept();
      connection.on('message', function (message) {
        socket.emit('message', message);
      });

      socket.on('message', function (data) {
        connection.sendBytes(new Buffer(Object.keys(data).map(function (k) { return data[k]; })));
      });

    });

  });


});

socket.on('error', function (err) {
  console.log('Could not connect to Pebble Bridge.');
});