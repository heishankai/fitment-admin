# 聊天功能 API 文档

## 概述

聊天功能支持微信用户和客服之间的实时通信。使用 WebSocket 进行实时消息推送，使用 REST API 进行数据查询和房间管理。

## REST API 接口

### 基础路径

所有接口都需要在请求头中携带 token：

```
Authorization: Bearer <token>
```

### 1. 获取客服的聊天房间列表

**接口**: `GET /chat/rooms`  
**权限**: 仅客服用户  
**说明**: 返回所有活跃的聊天房间列表，包含微信用户信息和最后一条消息

**响应示例**:

```json
[
  {
    "id": 1,
    "wechat_user_id": 1,
    "wechat_user": {
      "id": 1,
      "nickname": "用户昵称",
      "avatar": "头像URL"
    },
    "lastMessage": {
      "id": 10,
      "content": "最后一条消息内容",
      "sender_type": "wechat",
      "createdAt": "2024-01-01T10:00:00.000Z"
    },
    "unreadCount": 3,
    "createdAt": "2024-01-01T08:00:00.000Z",
    "updatedAt": "2024-01-01T10:00:00.000Z"
  }
]
```

### 2. 获取微信用户的聊天房间

**接口**: `GET /chat/room/my`  
**权限**: 仅微信用户  
**说明**: 获取当前微信用户的聊天房间信息。如果房间不存在，会自动创建。

**响应示例**:

```json
{
  "id": 1,
  "wechat_user_id": 1,
  "wechat_user": {
    "id": 1,
    "nickname": "用户昵称",
    "avatar": "头像URL"
  },
  "lastMessage": {
    "id": 10,
    "content": "最后一条消息",
    "sender_type": "wechat",
    "createdAt": "2024-01-01T10:00:00.000Z"
  },
  "createdAt": "2024-01-01T08:00:00.000Z",
  "updatedAt": "2024-01-01T10:00:00.000Z"
}
```

**注意**: 首次访问时，如果用户没有房间，系统会自动创建一个新的聊天房间。

### 3. 获取房间内的消息列表

**接口**: `GET /chat/rooms/:roomId/messages`  
**权限**: 所有用户  
**参数**:

- `roomId`: 房间ID (路径参数)
- `all`: 是否获取全部消息，可选 `true`/`false`，默认 `false` (查询参数)
- `page`: 页码，默认1 (查询参数，当 all=false 时生效)
- `pageSize`: 每页数量，默认50 (查询参数，当 all=false 时生效)
  - 特殊值：`pageSize=-1` 或 `pageSize=all` 等同于 `all=true`

**说明**:

- 当 `all=true` 或 `pageSize=-1/all` 时，返回房间内的全部消息（按时间正序排列）
- 当 `all=false`（默认）时，返回分页消息（按时间正序排列）

**获取全部消息示例**:

```
GET /chat/rooms/1/messages?all=true
```

**分页获取消息示例**:

```
GET /chat/rooms/1/messages?page=1&pageSize=50
```

**响应示例**:

```json
{
  "messages": [
    {
      "id": 1,
      "chat_room_id": 1,
      "sender_type": "wechat",
      "sender_id": 1,
      "content": "消息内容",
      "read": false,
      "createdAt": "2024-01-01T09:00:00.000Z"
    },
    {
      "id": 2,
      "chat_room_id": 1,
      "sender_type": "service",
      "sender_id": 1,
      "content": "客服回复消息",
      "read": false,
      "createdAt": "2024-01-01T09:05:00.000Z"
    }
  ],
  "total": 100
}
```

**消息字段说明**:
- `sender_type`: 发送者类型，值为 `"wechat"`（微信用户）或 `"service"`（客服）
- 前端可通过 `sender_type` 字段区分消息来源，并设置不同的样式和位置
- `sender_id`: 发送者的用户ID（微信用户ID或客服用户ID）

**前端区分消息的方法**:

每条消息都包含 `sender_type` 字段，用于区分发送者：
- `"wechat"`: 微信用户发送的消息
- `"service"`: 客服发送的消息

**微信用户端（fitment-h5）示例**:
```vue
<template>
  <div 
    v-for="message in messages" 
    :key="message.id"
    :class="[
      'message-item',
      message.sender_type === 'wechat' ? 'message-right' : 'message-left'
    ]"
  >
    <!-- 自己的消息（wechat）显示在右侧，绿色背景 -->
    <!-- 客服的消息（service）显示在左侧，白色背景 -->
  </div>
</template>
```

**客服端（fitment-pc）示例**:
```tsx
{messages.map((msg) => (
  <div
    key={msg.id}
    style={{
      display: 'flex',
      justifyContent: msg.sender_type === 'service' ? 'flex-end' : 'flex-start',
    }}
  >
    <div
      style={{
        backgroundColor: msg.sender_type === 'service' ? '#1890ff' : '#fff',
        color: msg.sender_type === 'service' ? '#fff' : '#333',
      }}
    >
      {/* 自己的消息（service）显示在右侧，蓝色背景 */}
      {/* 用户的消息（wechat）显示在左侧，白色背景 */}
    </div>
  </div>
))}
```

**判断逻辑**:
```typescript
// 在微信用户端：判断是否为当前用户发送的消息
const isMyMessage = message.sender_type === 'wechat';

// 在客服端：判断是否为当前用户发送的消息
const isMyMessage = message.sender_type === 'service';

// 通用判断方法
const getMessageStyle = (senderType: string, currentUserType: 'wechat' | 'service') => {
  const isMyMessage = senderType === currentUserType;
  return {
    align: isMyMessage ? 'right' : 'left',
    backgroundColor: isMyMessage ? '#07c160' : '#fff', // 根据实际情况调整颜色
    color: isMyMessage ? '#fff' : '#333',
  };
};
```

### 4. 创建聊天房间

**接口**: `POST /chat/rooms`  
**权限**: 仅客服用户  
**请求体**:

```json
{
  "wechat_user_id": 1
}
```

### 5. 删除聊天房间

**接口**: `DELETE /chat/rooms/:roomId`  
**权限**: 仅客服用户  
**说明**: 软删除房间（将active设为false）

### 6. 获取单个房间信息

**接口**: `GET /chat/rooms/:roomId`  
**权限**: 所有用户

## WebSocket 接口

### 连接地址

```
ws://localhost:3000/chat
```

### 连接认证

连接时需要在查询参数或认证头中携带 token：

**方式1（查询参数）**:

```
ws://localhost:3000/chat?token=<token>
```

**方式2（认证头）**:

```javascript
const socket = io('http://localhost:3000/chat', {
  auth: {
    token: '<token>',
  },
});
```

### 客户端事件

#### 1. 加入房间（仅客服）

```javascript
socket.emit('join-room', { roomId: 1 });

// 服务器响应
socket.on('joined-room', ({ roomId }) => {
  console.log('已加入房间', roomId);
});
```

#### 2. 发送消息

```javascript
socket.emit('send-message', {
  roomId: 1,
  content: '消息内容',
});

// 接收新消息（房间内所有客户端都会收到）
socket.on('new-message', (messageData) => {
  console.log('新消息:', messageData);
  // messageData: {
  //   id: 1,
  //   roomId: 1,
  //   senderType: 'wechat' | 'service',
  //   senderId: 1,
  //   content: '消息内容',
  //   createdAt: '2024-01-01T10:00:00.000Z'
  // }
});
```

#### 3. 标记消息为已读（仅客服）

```javascript
socket.emit('mark-read', { roomId: 1 });
```

#### 4. 错误处理

```javascript
socket.on('error', ({ message }) => {
  console.error('错误:', message);
});
```

## 前端集成示例

### 微信用户端（fitment-h5）

#### wechat-msg 页面（聊天房间）

```typescript
import { io } from 'socket.io-client';

// 1. 获取微信用户的房间（如果不存在会自动创建）
const fetchRoom = async () => {
  const response = await fetch('/api/chat/room/my', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const res = await response.json();
  return res.data; // 房间信息
};

// 2. 连接 WebSocket
const socket = io('http://localhost:3000/chat', {
  auth: { token },
  query: { token },
});

// 微信用户连接后会自动加入自己的房间

// 3. 监听新消息
socket.on('new-message', (messageData) => {
  // 更新消息列表
  // messageData: { id, roomId, senderType, senderId, content, createdAt }
});

// 4. 发送消息
const sendMessage = (roomId: number, content: string) => {
  socket.emit('send-message', {
    roomId: roomId,
    content: content,
  });
};

// 5. 获取历史消息（获取全部消息）
const fetchMessages = async (roomId: number) => {
  const response = await fetch(`/api/chat/rooms/${roomId}/messages?all=true`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const res = await response.json();
  return res.data.messages; // 消息数组（按时间正序）
};
```

### 客服端（fitment-pc）

#### client-chat 页面

```typescript
import { io } from 'socket.io-client';

// 1. 获取房间列表
const fetchRooms = async () => {
  const response = await fetch('/chat/rooms', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const res = await response.json();
  return res.data || res; // 房间列表数组
};

// 2. 连接 WebSocket
const socket = io('http://localhost:3000/chat', {
  auth: { token },
  query: { token },
});

// 3. 加入房间（选择房间时调用）
const joinRoom = (roomId: number) => {
  socket.emit('join-room', { roomId });

  // 监听加入成功事件
  socket.on('joined-room', ({ roomId }) => {
    console.log('已加入房间', roomId);
  });
};

// 4. 获取历史消息（获取全部消息）
const fetchMessages = async (roomId: number) => {
  const response = await fetch(`/chat/rooms/${roomId}/messages?all=true`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const res = await response.json();
  return res.data.messages || res.messages; // 消息数组（按时间正序）
};

// 5. 发送消息
const sendMessage = (roomId: number, content: string) => {
  socket.emit('send-message', {
    roomId: roomId,
    content: content,
  });
};

// 6. 监听新消息
socket.on('new-message', (messageData) => {
  // messageData: { id, roomId, senderType, senderId, content, createdAt }
  // 如果当前选中的房间收到消息，更新消息列表
  if (messageData.roomId === currentRoomId) {
    // 更新消息列表
  }
  // 刷新房间列表以更新最后一条消息
  fetchRooms();
});

// 7. 标记已读
const markRead = (roomId: number) => {
  socket.emit('mark-read', { roomId });
};

// 8. 删除房间
const deleteRoom = async (roomId: number) => {
  const response = await fetch(`/chat/rooms/${roomId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const res = await response.json();
  return res;
};
```

## 数据库表结构

### chat_room (聊天房间表)

- `id`: 主键
- `wechat_user_id`: 微信用户ID
- `active`: 是否启用
- `createdAt`: 创建时间
- `updatedAt`: 更新时间

### chat_message (聊天消息表)

- `id`: 主键
- `chat_room_id`: 聊天房间ID
- `sender_type`: 发送者类型 ('wechat' | 'service')
- `sender_id`: 发送者ID
- `content`: 消息内容
- `read`: 是否已读
- `createdAt`: 创建时间

## 注意事项

1. **认证**: 所有接口和 WebSocket 连接都需要通过 token 认证
2. **房间创建**:
   - 微信用户首次调用 `/chat/room/my` 时，如果房间不存在会自动创建
   - 客服可以手动创建房间（通过 `POST /chat/rooms`）
3. **WebSocket 连接**:
   - 微信用户连接后会自动加入自己的房间
   - 客服需要主动发送 `join-room` 事件才能加入指定房间
4. **消息获取**:
   - 默认可以通过 `all=true` 参数获取全部消息（按时间正序）
   - 也可以使用分页参数 `page` 和 `pageSize` 获取部分消息
   - 消息按时间正序返回（最早的消息在前）
5. **权限控制**:
   - 只有客服可以创建和删除房间
   - 只有客服可以查看所有房间列表
   - 微信用户只能访问自己的房间
6. **未读消息**: 只统计微信用户发送的消息（客服发送的消息默认已读）
7. **路由说明**:
   - `/chat/room/my` 必须在路径中包含 `/room/my`，不会与 `/chat/rooms/:roomId` 冲突
