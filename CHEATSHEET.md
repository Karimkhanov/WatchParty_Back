# 📝 Redis Integration Cheat Sheet

## 🚀 Quick Commands

### Start Everything
```bash
# 1. Start Redis
redis-server

# 2. Start Backend
npm run dev
```

### Check Status
```bash
# Redis
redis-cli ping

# Server Health
curl http://localhost:5000/api/health

# Queue Stats
curl -H "Authorization: Bearer TOKEN" http://localhost:5000/api/queues/stats
```

---

## 🔧 Redis CLI Commands

```bash
# Open Redis CLI
redis-cli

# View all keys
KEYS *

# Get cached value
GET "cache:rooms:page:1:limit:10"

# Delete key
DEL "cache:room:5"

# Delete all keys matching pattern
KEYS "cache:rooms:*" | xargs redis-cli DEL

# Clear all cache
FLUSHDB

# Monitor real-time
MONITOR

# Server info
INFO
```

---

## 📊 API Endpoints

### Health Check
```bash
GET /api/health
```

### Queue Management
```bash
# Get statistics
GET /api/queues/stats
Authorization: Bearer TOKEN

# Trigger cleanup
POST /api/queues/cleanup
Authorization: Bearer TOKEN
Content-Type: application/json
{"daysInactive": 30}

# Generate report
POST /api/queues/report
Authorization: Bearer TOKEN
```

---

## 🧪 Testing Cache

```bash
# First request (MISS - from DB)
curl http://localhost:5000/api/rooms

# Second request (HIT - from cache)
curl http://localhost:5000/api/rooms
# Response will include: "_cached": true
```

---

## 📧 Email Queue

```javascript
// In code
const { sendWelcomeEmail } = require('./services/emailService');
await sendWelcomeEmail('user@example.com', 'username');

// Check logs
// 📧 Welcome email queued for: user@example.com
// ✅ Email sent successfully
```

---

## 🖼️ Image Processing

```javascript
// Automatic on profile picture upload
// Creates:
// - original.jpg
// - original-thumbnail.jpg (150x150)
// - original-medium.jpg (600x600)
// - original.webp
```

---

## 🧹 Cleanup Tasks

```bash
# Manual trigger
curl -X POST http://localhost:5000/api/queues/cleanup \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"daysInactive": 30}'
```

---

## 📦 Cache Keys Pattern

```
cache:rooms:page:{page}:limit:{limit}    # Rooms list
cache:room:{id}                          # Specific room
cache:movies:page:{page}:limit:{limit}   # Movies list
cache:movie:{id}                         # Specific movie
cache:chat:{roomId}:messages:{limit}     # Chat messages
cache:user:{userId}:profile              # User profile
```

---

## ⏱️ Cache TTL (Time To Live)

| Endpoint | TTL |
|----------|-----|
| Rooms list | 5 min (300s) |
| Room details | 5 min (300s) |
| Movies | 5 min (300s) |
| Chat messages | 1 min (60s) |
| User profile | 10 min (600s) |

---

## 🐛 Troubleshooting

### Redis not connecting
```bash
# Check if running
redis-cli ping

# If not, start it
redis-server
```

### Cache not working
```bash
# Check Redis connection
curl http://localhost:5000/api/health

# Should show: "redis": "connected"
```

### Email not sending
```env
# Check .env
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Gmail: Use App Password
# https://myaccount.google.com/apppasswords
```

### Clear all cache
```bash
redis-cli FLUSHDB
```

---

## 📝 Environment Variables

```env
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Email
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@watchparty.com
```

---

## 📚 Documentation Files

- `README.md` - Main documentation
- `QUICK_START.md` - Quick setup guide
- `REDIS_SETUP.md` - Detailed Redis documentation
- `IMPLEMENTATION_SUMMARY.md` - What was implemented
- `CHEATSHEET.md` - This file

---

## 🎯 Quick Test Checklist

- [ ] Redis is running (`redis-cli ping`)
- [ ] Server starts without errors (`npm run dev`)
- [ ] Health check works (`/api/health`)
- [ ] Cache is working (check logs for HIT/MISS)
- [ ] Email queue is working (register a user)
- [ ] Image processing works (upload avatar)
- [ ] Queue stats accessible (`/api/queues/stats`)

---

## 🔥 Pro Tips

1. **Monitor logs in real-time:**
   ```bash
   tail -f logs/combined.log
   ```

2. **Watch Redis commands:**
   ```bash
   redis-cli MONITOR
   ```

3. **Check queue status:**
   ```bash
   curl -H "Authorization: Bearer $TOKEN" localhost:5000/api/queues/stats | jq
   ```

4. **Invalidate specific cache:**
   ```bash
   redis-cli DEL "cache:room:5"
   ```

5. **See all cached rooms:**
   ```bash
   redis-cli KEYS "cache:rooms:*"
   ```

---

## 🚨 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| `ECONNREFUSED 6379` | Start Redis: `redis-server` |
| Email not sending | Check EMAIL_USER/PASSWORD in .env |
| Cache always MISS | Check Redis connection in /api/health |
| Old data in cache | Wait for TTL or manually delete key |
| Queue stuck | Check worker logs for errors |

---

**Last Updated:** 2024-01-15
**Version:** 1.0.0
