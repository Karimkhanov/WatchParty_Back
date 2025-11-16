# Redis Integration Guide

This document explains the Redis integration added to the WatchParty backend for caching and background task processing.

## 📋 Table of Contents
- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Caching Strategy](#caching-strategy)
- [Background Tasks](#background-tasks)
- [API Endpoints](#api-endpoints)
- [Testing](#testing)

---

## ✨ Features

### 1. **Caching**
- ✅ Caches popular API endpoints (rooms, movies, chat messages)
- ✅ Automatic cache invalidation on data mutations
- ✅ Configurable TTL (Time To Live) per endpoint
- ✅ Cache hit/miss logging for monitoring

### 2. **Background Tasks (Bull Queues)**
- ✅ **Email Queue**: Asynchronous email sending (welcome, password reset, invitations)
- ✅ **Image Processing Queue**: Avatar optimization and cleanup
- ✅ **Room Cleanup Queue**: Auto-cleanup of inactive rooms and old messages

### 3. **Performance Improvements**
- ⚡ Reduced database load with intelligent caching
- ⚡ Non-blocking email sending
- ⚡ Automatic image optimization
- ⚡ Scheduled cleanup tasks

---

## 🚀 Installation

### Step 1: Install Redis Server

#### **Windows:**
```bash
# Using Chocolatey
choco install redis-64

# Or download from: https://github.com/microsoftarchive/redis/releases

# Start Redis
redis-server
```

#### **macOS:**
```bash
brew install redis
brew services start redis
```

#### **Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

#### **Docker:**
```bash
docker run -d -p 6379:6379 --name redis redis:latest
```

### Step 2: Verify Redis Installation
```bash
redis-cli ping
# Should return: PONG
```

### Step 3: Install Node.js Dependencies
Already installed via `npm install` (ioredis, bull, nodemailer, sharp)

---

## ⚙️ Configuration

### Environment Variables

Add to your `.env` file:

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@watchparty.com

# SMTP Configuration (production)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### Gmail Setup (for development)

1. Go to your Google Account settings
2. Security → 2-Step Verification → App Passwords
3. Generate an app password for "Mail"
4. Use this password in `EMAIL_PASSWORD`

---

## 💾 Caching Strategy

### Cached Endpoints

| Endpoint | Cache Key Pattern | TTL | Description |
|----------|------------------|-----|-------------|
| `GET /api/rooms` | `cache:rooms:page:*:limit:*` | 5 min | List of active rooms |
| `GET /api/rooms/:id` | `cache:room:{id}` | 5 min | Specific room details |
| `GET /api/movies` | `cache:movies:page:*:limit:*` | 5 min | List of movies |
| `GET /api/movies/:id` | `cache:movie:{id}` | 5 min | Specific movie details |
| `GET /api/chat/:roomId/messages` | `cache:chat:{roomId}:messages:*` | 1 min | Chat messages |
| `GET /api/auth/profile` | `cache:user:{userId}:profile` | 10 min | User profile |

### Cache Invalidation

Cache is automatically invalidated on:

- **Room Creation**: Invalidates `cache:rooms:*`
- **Room Update/Delete**: Invalidates `cache:rooms:*` + `cache:room:{id}`
- **Room Join/Leave**: Invalidates `cache:room:{id}` + `cache:rooms:*`
- **Movie Creation/Update/Delete**: Invalidates `cache:movies:*` + `cache:movie:{id}`
- **Chat Message Send**: Invalidates `cache:chat:{roomId}:*`
- **Profile Update**: Invalidates `cache:user:{userId}:profile`

### Cache Usage Example

```javascript
// Cached response includes _cached flag
{
  "success": true,
  "data": { ... },
  "_cached": true,  // Indicates data came from cache
  "_cacheKey": "cache:rooms:page:1:limit:10"
}
```

---

## 🔄 Background Tasks

### 1. Email Queue

**Job Types:**
- `welcome-email`: Sent after user registration
- `password-reset-email`: Sent for password reset
- `room-invitation-email`: Sent when user is invited to a room

**Configuration:**
- Priority: High for password reset, normal for others
- Retries: 3 attempts with exponential backoff
- Auto-cleanup: Completed jobs removed automatically

**Usage:**
```javascript
const { sendWelcomeEmail } = require('./services/emailService');
await sendWelcomeEmail('user@example.com', 'username');
```

### 2. Image Processing Queue

**Job Types:**
- `optimize-avatar`: Resize and optimize profile pictures
- `delete-old-avatar`: Clean up old profile pictures

**Features:**
- Creates multiple sizes: thumbnail (150x150), medium (600x600)
- Generates WebP versions for modern browsers
- JPEG optimization with progressive loading
- Automatic cleanup of old files

### 3. Room Cleanup Queue

**Job Types:**
- `cleanupInactiveRooms`: Deactivate rooms inactive for X days (default: 30)
- `cleanupOldChatMessages`: Delete messages older than X days (default: 90)
- `cleanupInactiveParticipants`: Remove participants inactive for X hours (default: 24)
- `generateActivityReport`: Generate room activity statistics

**Scheduling:**
Can be triggered manually via API or scheduled using cron jobs (see below).

---

## 🌐 API Endpoints

### Queue Management

#### Get Queue Statistics
```http
GET /api/queues/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "email": {
      "queueName": "email",
      "waiting": 5,
      "active": 1,
      "completed": 120,
      "failed": 2,
      "delayed": 0,
      "total": 128
    },
    "imageProcessing": { ... },
    "roomCleanup": { ... }
  }
}
```

#### Trigger Room Cleanup
```http
POST /api/queues/cleanup
Authorization: Bearer <token>
Content-Type: application/json

{
  "daysInactive": 30
}
```

#### Generate Activity Report
```http
POST /api/queues/report
Authorization: Bearer <token>
```

### Health Check
```http
GET /api/health
```

**Response:**
```json
{
  "success": true,
  "message": "WatchParty API is running",
  "redis": "connected",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## 🧪 Testing

### 1. Test Redis Connection

```bash
# Start your server
npm run dev

# Check health endpoint
curl http://localhost:5000/api/health
```

### 2. Test Caching

```bash
# First request (cache MISS)
curl http://localhost:5000/api/rooms
# Check logs: "🔍 Cache MISS: cache:rooms:page:1:limit:10"

# Second request (cache HIT)
curl http://localhost:5000/api/rooms
# Check logs: "💾 Cache HIT: cache:rooms:page:1:limit:10"
# Response includes "_cached": true
```

### 3. Test Email Queue

```bash
# Register a new user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "password123"
  }'

# Check logs for: "📧 Welcome email queued for: test@example.com"
# Email will be sent asynchronously
```

### 4. Test Image Processing

```bash
# Upload profile picture
curl -X POST http://localhost:5000/api/auth/upload-profile-picture \
  -H "Authorization: Bearer <your-token>" \
  -F "profilePicture=@/path/to/image.jpg"

# Check uploads/ folder for optimized versions:
# - original.jpg
# - original-thumbnail.jpg
# - original-medium.jpg
# - original.webp
```

### 5. Test Queue Stats

```bash
curl -X GET http://localhost:5000/api/queues/stats \
  -H "Authorization: Bearer <your-token>"
```

### 6. Monitor Redis

```bash
# Open Redis CLI
redis-cli

# View all keys
KEYS *

# Get cached value
GET "cache:rooms:page:1:limit:10"

# Monitor real-time commands
MONITOR

# Get server info
INFO
```

---

## 📊 Monitoring

### View Queue Dashboard (Optional)

Install Bull Board for a web UI:

```bash
npm install @bull-board/express @bull-board/api
```

Then add to your server:

```javascript
const { createBullBoard } = require('@bull-board/api');
const { BullAdapter } = require('@bull-board/api/bullAdapter');
const { ExpressAdapter } = require('@bull-board/express');

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [
    new BullAdapter(queues.email),
    new BullAdapter(queues.imageProcessing),
    new BullAdapter(queues.roomCleanup),
  ],
  serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());
```

Access at: `http://localhost:5000/admin/queues`

---

## 🔧 Scheduled Tasks (Optional)

To run cleanup tasks automatically, use `node-cron`:

```bash
npm install node-cron
```

Create `src/jobs/scheduler.js`:

```javascript
const cron = require('node-cron');
const { addJob } = require('../config/queue');
const logger = require('../config/logger');

// Run room cleanup every day at 3 AM
cron.schedule('0 3 * * *', async () => {
  logger.info('🕐 Running scheduled room cleanup...');
  await addJob('roomCleanup', 'scheduled-cleanup', {
    action: 'cleanupInactiveRooms',
    data: { daysInactive: 30 }
  });
});

// Clean old messages weekly (Sunday at 4 AM)
cron.schedule('0 4 * * 0', async () => {
  logger.info('🕐 Running scheduled message cleanup...');
  await addJob('roomCleanup', 'scheduled-message-cleanup', {
    action: 'cleanupOldChatMessages',
    data: { daysOld: 90 }
  });
});

// Remove inactive participants every 6 hours
cron.schedule('0 */6 * * *', async () => {
  logger.info('🕐 Running scheduled participant cleanup...');
  await addJob('roomCleanup', 'scheduled-participant-cleanup', {
    action: 'cleanupInactiveParticipants',
    data: { hoursInactive: 24 }
  });
});

logger.info('⏰ Scheduled tasks initialized');
```

Then require in `server.js`:
```javascript
require('./jobs/scheduler');
```

---

## 🐛 Troubleshooting

### Redis Connection Issues

**Problem:** `Error: connect ECONNREFUSED 127.0.0.1:6379`

**Solution:**
```bash
# Check if Redis is running
redis-cli ping

# If not running, start Redis
redis-server

# Or with Docker
docker start redis
```

### Email Not Sending

**Problem:** Emails queued but not sent

**Solutions:**
1. Check email credentials in `.env`
2. Enable "Less secure app access" for Gmail
3. Use App Password for Gmail with 2FA
4. Check worker logs for errors

### Cache Not Working

**Problem:** `_cached: true` never appears

**Solutions:**
1. Verify Redis connection: `GET /api/health`
2. Check logs for cache HIT/MISS messages
3. Ensure cache middleware is applied to routes
4. Check cache TTL hasn't expired

---

## 📚 Additional Resources

- [Redis Documentation](https://redis.io/documentation)
- [Bull Queue Documentation](https://github.com/OptimalBits/bull)
- [ioredis Documentation](https://github.com/luin/ioredis)
- [Sharp Image Processing](https://sharp.pixelplumbing.com/)
- [Nodemailer Documentation](https://nodemailer.com/)

---

## 🎉 Summary

Your WatchParty backend now has:

- ✅ **Redis caching** for improved performance
- ✅ **Background task queues** for email, images, and cleanup
- ✅ **Automatic cache invalidation** on data changes
- ✅ **Queue management API** for monitoring
- ✅ **Health checks** for Redis connectivity

All features are production-ready and scalable!
