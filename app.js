var express = require('express');
var crypto  = require('crypto');
var app = express();

app.use('/public',express.static('public'));

app.get('/', function (req, res) {
    res.sendFile(__dirname+'/index.html');
});

var srv = app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});

function proveKey(key){
    var shasum = crypto.createHash('sha1');
    shasum.update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11");
    return shasum.digest('base64');
}

srv.on('upgrade',function(request,socket,head){
    var key = request.headers['sec-websocket-key'];
    
    var headers = [
        'HTTP/1.1 101 Switching Protocols',
        'Upgrade: WebSocket',
        'Connection: Upgrade',
        'Sec-WebSocket-Accept: '+proveKey(key)
        // 'Sec-WebSocket-Protocol: chat'
    ];
    socket.setTimeout(0);
    socket.setNoDelay(true);
    socket.write(headers.concat('', '').join('\r\n'));
    console.log('upgrade',request.headers);
});