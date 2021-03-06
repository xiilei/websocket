  var server = require('http').createServer()
  var url = require('url')
  var WebSocketServer = require('ws').Server
  var wss = new WebSocketServer({ server: server })
  var express = require('express')
  var app = express()
  var port = 3000;

app.use(express.static('public'))

wss.on('connection', function connection(ws) {
  var location = url.parse(ws.upgradeReq.url, true);
  // you might use location.query.access_token to authenticate or share sessions
  // or ws.upgradeReq.headers.cookie (see http://stackoverflow.com/a/16395220/151312)

  ws.on('message', function incoming(message) {
    console.log('received: %s', message);
  });

  ws.send('something');
});

app.get('/', function (req, res) {
    res.sendFile(__dirname+'/index.html')
});

server.on('request', app);
server.listen(port, function () { console.log('Listening on ' + server.address().port) });