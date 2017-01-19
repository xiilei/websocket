# WebSocket 协议 (version 13)

[WebSocket](https://tools.ietf.org/html/rfc6455 "rfc")设计用来替代polling方式并减少headers发送,基于http的通讯协议,所以有几点值得一提

- 遵守http协议,支持http的基础设施(代理等）
- 共享http server socket,不需要另外端口,可以指定request path
- 支持tls

### Handshake 

一个比较完整的client 握手请求头

```
GET /chat HTTP/1.1
Host: server.example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Origin: http://example.com
Sec-WebSocket-Protocol: chat, superchat
Sec-WebSocket-Version: 13
Sec-WebSocket-Extensions:permessage-deflate; client_max_window_bits
```

- headers和http一样没有顺序要求
- 必需是GET请求,协议版本至少是1.1
- 必须有Connection: Upgrade,Upgrade: websocket,Sec-WebSocket-Key,Sec-WebSocket-Version: 13

##### Sec-WebSocket-Key（必需）base64编码的随机16字节

```javascript
//nodejs
const crypto = require('crypto');
crypto.randomBytes(16).toString('base64');
```
```python
#python3
import os
import base64
base64.encodebytes(os.urandom(16)).decode('utf-8').strip()
```

这个header并不能提供安全特性,仍然是由tls(wss)提供,只是有两个简单的作用
- Server 向客户端证明其收到并理解 WebSocket协议 (配合server响应的Sec-WebSocket-Accept)
- Server 可以确定是一个websocket client

> Server根据Sec-WebSocket-Key响应Sec-WebSocket-Accept
> 这里假定key为收到的Sec-WebSocket-Key,然后拼接guid '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'

```javascript
//nodejs
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const crypto = require ('crypto');
const h = crypto.createHash('sha1');
h.update(key + GUID);
h.digest('base64');
```
```python
#python3
import hashlib
import base64
GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
b = hashlib.sha1((key+GUID).encode('utf-8')).digest()
base64.encodebytes(b).decode('utf-8').strip()
```

例如
```
Sec-WebSocket-Accept: E/vXnD05Dl1lhaIeEf9ewZcM/ww=
```

##### Sec-WebSocket-Protocol (非必需) 自定义子协议
> 后面是可以自定义的子消息协议,用逗号分隔
```
 Sec-WebSocket-Protocol: chat
```

##### Sec-WebSocket-Extensions (非必需) 协议扩展
> 定义传输数据处理的方式,一般是压缩,分号分割

```
// client
Sec-WebSocket-Extensions: permessage-deflate; client_max_window_bits
//server 选择一个,
Sec-WebSocket-Extensions: permessage-deflate

//client如果用逗号分隔的,server 选择第一个数据处理需要 bar(foo(data))
Sec-WebSocket-Extensions: foo,bar; client_max_window_bits
```
##### [数据压缩](https://tools.ietf.org/html/rfc7692)
> [TODO](compression.md)

一个比较完整的server 握手响应头
```
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
Sec-WebSocket-Protocol: chat
Sec-WebSocket-Extensions: permessage-deflate
```

Server处理upgrade

```javascript
//nodejs
const http = require('http');
const srv = http.createServer();
srv.on('upgrade',(req, socket, head) => {
    const headers = [
        'HTTP/1.1 101 Switching Protocols',
        'Upgrade: websocket',
        'Connection: Upgrade',
        'Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo='
    ];
    //响应握手http headers
    socket.write(headers.concat('', '').join('\r\n'));
    //接收webscoket数据帧
    socket.on('data',(data) => { handleFrame(data); });
});
srv.listen(3000);
```

### Data Framing
```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-------+-+-------------+-------------------------------+
|F|R|R|R| opcode|M| Payload len |    Extended payload length    |
|I|S|S|S|  (4)  |A|     (7)     |             (16/64)           |
|N|V|V|V|       |S|             |   (if payload len==126/127)   |
| |1|2|3|       |K|             |                               |
+-+-+-+-+-------+-+-------------+ - - - - - - - - - - - - - - - +
|     Extended payload length continued, if payload len == 127  |
+ - - - - - - - - - - - - - - - +-------------------------------+
|                               |Masking-key, if MASK set to 1  |
+-------------------------------+-------------------------------+
| Masking-key (continued)       |          Payload Data         |
+-------------------------------- - - - - - - - - - - - - - - - +
:                     Payload Data continued ...                :
+ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - +
|                     Payload Data continued ...                |
+---------------------------------------------------------------+
```

> 数据格式描述 [ABNF](https://tools.ietf.org/html/rfc5234) [维基百科](https://zh.wikipedia.org/wiki/%E6%89%A9%E5%85%85%E5%B7%B4%E7%A7%91%E6%96%AF%E8%8C%83%E5%BC%8F)
 

**FIN** 1bit 标示是否为最后一个frame(第一个也可能是最后一个)

**RSV1** 1bit 使用启用压缩,此位为 1

**RSV2** 1bit

**RSV3** 1bit

**opcode** 4bit 描述payload data 数据类型
- %x0 
- %x1 文本数据
- %x2 二进制数据
- %x3-7 预留的非控制类型
- %x8 连接关闭
- %x9 ping
- %xA pong
- %xB-F 预留的控制类型

**Mask** 是否拥有masking-key  

Client-to-Server Masking 

**Masking-key** 4 bytes

**Payload length**
- 0-125 7bits 数据长度
- 126 7+16 bits 往后2个字节记录数据长度
－ 127 7+64 bits 往后8个字节纪录数据长度

