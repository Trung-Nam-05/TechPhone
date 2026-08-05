# Observer — Chat: Demo các bước áp dụng bằng code

## Bước 1 — Subject (server) phát sự kiện khi có tin mới

```js
// socket.js (ý tưởng)
socket.on('message:send', async ({ conversationId, body }) => {
  const message = await Message.create({ conversation: conversationId, body, sender: socket.data.userId, senderRole: socket.data.role });
  io.to(`conversation:${conversationId}`).emit('message:new', { message });
});
```

## Bước 2 — Observer (client) đăng ký lắng nghe và cập nhật state

```js
// SupportChatContext.jsx (ý tưởng)
socket.on('message:new', ({ message }) => {
  setMessages((prev) => [...prev, message]);
});

socket.on('typing:update', ({ typing }) => {
  setPeerTyping(Boolean(typing));
});
```

## Bước 3 — Thay polling bằng subscribe/unsubscribe

```js
// trước
setInterval(() => fetch(messagesUrl), 2000);

// sau
socket.emit('conversation:join', { conversationId });
// lắng nghe message:new cho đến khi rời room / unmount
```

## File thật trong project

`server/src/socket.js`, `src/context/SupportChatContext.jsx`
