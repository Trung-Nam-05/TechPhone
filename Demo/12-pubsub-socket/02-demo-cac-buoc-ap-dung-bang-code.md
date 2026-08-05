# Pub-Sub — Socket.io: Demo các bước áp dụng bằng code

## Bước 1 — Client publish sự kiện gửi tin / join room

```js
socket.emit('conversation:join', { conversationId });
socket.emit('message:send', { conversationId, body });
```

## Bước 2 — Server nhận publish, lưu DB, publish lại theo room

```js
socket.on('message:send', async ({ conversationId, body }) => {
  const message = await Message.create({ ... });
  // publish cho mọi subscriber của room
  io.to(`conversation:${conversationId}`).emit('message:new', { message });
  io.to('admin:support').emit('message:new', { message }); // inbox admin
});
```

## Bước 3 — Subscriber chỉ lắng nghe, không gọi UI bên kia

```js
// trước
adminInboxUi.appendMessage(message);

// sau
socket.on('message:new', ({ message }) => {
  setMessages((prev) => [...prev, message]);
});
```

## File thật trong project

`server/src/socket.js`, `src/context/SupportChatContext.jsx`
