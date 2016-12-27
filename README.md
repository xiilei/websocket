# WebSocket 协议

websocket设计用来替代polling方式并减少headers发送,基于http的通讯协议,所以有几点值得一提

- 完全遵守http协议,所以支持http的基础设施(代理等）
- 共享http server socket,不需要另外端口,可以指定request path
- 支持tls

### Handshake

一个比较完整的client handshake headers

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

headers 和http一样没有顺序要求


