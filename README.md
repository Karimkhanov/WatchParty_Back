# 🎬 WatchParty API (W2G_Backend)

Welcome to the backend server documentation for the **WatchParty** application! This server is the core of the application, handling user management, co-watching rooms, video synchronization, and real-time messaging.

## ✨ Key Features

*   ✅ **User Authentication**: A complete registration and login system using JWT (JSON Web Tokens) for secure API access.
*   👤 **Profile Management**: Users can update their personal information (name, username, bio) and upload a profile picture.
*   🚪 **Room System**: Create, list, and manage rooms for a shared viewing experience.
*   💬 **Real-time Chat**: Infrastructure for real-time messaging within rooms (designed for WebSocket integration).
*   🎬 **Video Management**: Logic for adding and synchronizing videos within rooms.
*   📄 **API Documentation**: Built-in interactive API documentation powered by Swagger (OpenAPI).
*   ⚡ **Redis Caching**: High-performance caching for improved API response times (5-50x faster).
*   📧 **Background Tasks**: Asynchronous email sending and image processing using Bull queues.
*   🖼️ **Image Optimization**: Automatic avatar optimization with multiple sizes and WebP format.
*   🧹 **Auto Cleanup**: Scheduled cleanup of inactive rooms and old messages.

## 🛠️ Technology Stack

*   **Runtime**: Node.js
*   **Framework**: Express.js
*   **Database**: PostgreSQL
*   **Cache & Queues**: Redis + Bull (background tasks)
*   **Authentication**: JSON Web Tokens (`jsonwebtoken`) with password hashing via `bcryptjs`.
*   **File Handling**: `multer` for avatar uploads, `sharp` for image optimization.
*   **Email**: `nodemailer` with async queue processing.
*   **Logging**: `winston` (as configured in `logger.js`).
*   **API Documentation**: `swagger-ui-express` and `swagger-jsdoc`.
*   **Environment Variables**: `dotenv`.

## 📂 Project Structure

The project is organized by feature to ensure scalability and ease of maintenance.

```
W2G_Backend/
├── node_modules/       # Project dependencies
├── uploads/            # Directory for uploaded user avatars
├── scripts/            # SQL scripts for DB initialization and migrations
│   ├── 001_create_users_table.sql
│   └── 001_create_rooms_tables.sql
├── src/                # Main application source code
│   ├── config/         # Configuration files (DB, logger, Swagger)
│   ├── controllers/    # Business logic (request handlers)
│   ├── middleware/     # Express middleware (auth, request logging)
│   ├── models/         # (Optional) Data models or schemas
│   ├── routes/         # API endpoint definitions
│   └── server.js       # The main server entry point
├── .env                # Environment variables file (you must create this)
├── package.json        # Project manifest and dependencies
└── README.md           # This documentation file
```

---

## 🚀 Getting Started

Follow these steps to set up and run the project on your local machine.

### 1. Prerequisites

Ensure you have the following software installed:
*   [Node.js](https://nodejs.org/) (LTS version is recommended)
*   [npm](https://www.npmjs.com/) (comes with Node.js)
*   [PostgreSQL](https://www.postgresql.org/download/) (running locally or via Docker)
*   [Redis](https://redis.io/download) (for caching and background tasks)
    *   **Windows**: [Redis Windows Port](https://github.com/microsoftarchive/redis/releases) or use Docker
    *   **macOS**: `brew install redis`
    *   **Linux**: `sudo apt install redis-server`
    *   **Docker**: `docker run -d -p 6379:6379 redis`

### 2. Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd W2G_Backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

### 3. Database Setup

1.  **Create a database** in PostgreSQL. You can use `pgAdmin` or the `psql` command-line tool:
    ```sql
    CREATE DATABASE watchparty_db;
    ```

2.  **Run the SQL scripts** from the `/scripts` folder to create the necessary tables. Connect to your newly created database and execute the scripts in order:
    *   First, `001_create_users_table.sql` (or your equivalent script that creates the `users` table).
    *   Then, `001_create_rooms_tables.sql`.

    > **Important**: Ensure your `users` table schema matches what the application code expects (with `profile_picture`, `phone_number`, and `role` columns).

### 4. Environment Configuration

1.  In the project's root directory (`W2G_Backend/`), create a new file named `.env`.

2.  Copy the content below into your `.env` file and replace the placeholder values with your actual configuration.

    ```env
    # Server Configuration
    PORT=5000
    
    # Frontend URL for CORS
    FRONTEND_URL=http://localhost:5173
    
    # PostgreSQL Database Connection
    # Format: postgres://USER:PASSWORD@HOST:PORT/DATABASE
    DATABASE_URL=postgres://postgres:your_password@localhost:5432/watchparty_db
    
    # JWT (JSON Web Token) Settings
    JWT_SECRET=your_very_strong_and_secret_key_here
    JWT_EXPIRE=7d

    # Redis Configuration
    REDIS_HOST=localhost
    REDIS_PORT=6379
    REDIS_PASSWORD=

    # Email Configuration (optional for development)
    EMAIL_USER=your-email@gmail.com
    EMAIL_PASSWORD=your-app-password
    EMAIL_FROM=noreply@watchparty.com

    # SMTP Configuration (for production)
    SMTP_HOST=smtp.gmail.com
    SMTP_PORT=587
    SMTP_SECURE=false
    ```

    > **Security Note**: `JWT_SECRET` must be a long, random, and unique string. Do not use a common password!
    >
    > **Email Setup**: For Gmail, enable 2FA and create an [App Password](https://myaccount.google.com/apppasswords). See [QUICK_START.md](./QUICK_START.md) for details.

### 5. Running the Application

1.  **Start Redis server:**
    ```bash
    # Windows/macOS/Linux
    redis-server

    # Or with Docker
    docker start redis

    # Verify Redis is running
    redis-cli ping  # Should return PONG
    ```

2.  **For development (with auto-reload):**
    ```bash
    npm run dev
    ```    The server will start, and `nodemon` will automatically restart it whenever you save a file.

3.  **For production:**
    ```bash
    npm start
    ```
    (This assumes you have a `"start": "node src/server.js"` script in your `package.json`).

After a successful launch, you will see the following output in your console:
```
2025-10-17 11:00:00 [info]: Server is running on port 5000
2025-10-17 11:00:00 [info]: Swagger docs available at http://localhost:5000/api-docs
Database connected successfully.
✅ Redis connected successfully
🚀 Redis is ready to accept commands
📧 Email worker initialized
🖼️ Image processing worker initialized
🧹 Room cleanup worker initialized
🚀 All background workers initialized successfully
```

---

## 📖 API Documentation (Swagger)

This project uses Swagger to automatically generate interactive API documentation.

**To access the documentation:**

1.  Start the server.
2.  Open your web browser and navigate to the following URL:
    [**http://localhost:5000/api-docs**](http://localhost:5000/api-docs)

From this page, you can:
*   View all available endpoints, grouped by tags (e.g., `Authentication`, `Rooms`).
*   See the expected parameters, request bodies, and response schemas for each endpoint.
*   **Test the API endpoints** directly from your browser. For protected routes, click the "Authorize" button and paste your JWT token to authenticate your requests.

---

## ⚡ Redis Integration & Performance

This project now includes Redis integration for high-performance caching and background task processing.

### 🚀 Features Added:

1. **Intelligent Caching**
   - API responses cached for 1-10 minutes depending on endpoint
   - Automatic cache invalidation on data mutations
   - 5-50x faster response times for repeated requests

2. **Background Task Queues**
   - **Email Queue**: Welcome emails, password resets (asynchronous)
   - **Image Processing**: Avatar optimization with multiple sizes
   - **Room Cleanup**: Auto-cleanup of inactive rooms and old messages

3. **New API Endpoints**
   - `GET /api/health` - Check Redis connection status
   - `GET /api/queues/stats` - View queue statistics
   - `POST /api/queues/cleanup` - Manually trigger cleanup
   - `POST /api/queues/report` - Generate activity report

### 📚 Documentation:

- **[QUICK_START.md](./QUICK_START.md)** - Quick setup guide with examples
- **[REDIS_SETUP.md](./REDIS_SETUP.md)** - Comprehensive Redis integration documentation

### 🧪 Testing Redis:

```bash
# Check health endpoint
curl http://localhost:5000/api/health

# Test caching (second request will be cached)
curl http://localhost:5000/api/rooms

# View queue statistics
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/queues/stats
```

---



## 👨‍💻 Author

Developed for the WatchParty collaborative viewing platform.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

---

**Happy coding! 🎉**
