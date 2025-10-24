🎬 WatchParty API (W2G_Backend)

Welcome to the backend server documentation for the WatchParty application! This server is the core of the application, handling user management, co-watching rooms, video synchronization, and real-time messaging.

✨ Key Features

✅ User Authentication: A complete registration and login system using JWT (JSON Web Tokens) for secure API access.

👤 Profile Management: Users can update their personal information (name, username, bio) and upload a profile picture.

🚪 Room System: Create, list, and manage rooms for a shared viewing experience.

💬 Real-time Chat: Infrastructure for real-time messaging within rooms (designed for WebSocket integration).

🎬 Video Management: Logic for adding and synchronizing videos within rooms.

📄 API Documentation: Built-in interactive API documentation powered by Swagger (OpenAPI).

🛠️ Technology Stack

Runtime: Node.js

Framework: Express.js

Database: PostgreSQL

Authentication: JSON Web Tokens (jsonwebtoken) with password hashing via bcryptjs.

File Handling: multer for avatar uploads.

Logging: winston (as configured in logger.js).

API Documentation: swagger-ui-express and swagger-jsdoc.

Environment Variables: dotenv.

📂 Project Structure

The project is organized by feature to ensure scalability and ease of maintenance.

code
Code
download
content_copy
expand_less
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
🚀 Getting Started

Follow these steps to set up and run the project on your local machine.

1. Prerequisites

Ensure you have the following software installed:

Node.js (LTS version is recommended)

npm (comes with Node.js)

PostgreSQL (running locally or via Docker)

2. Installation

Clone the repository:

code
Bash
download
content_copy
expand_less
git clone <your-repository-url>
cd W2G_Backend

Install dependencies:

code
Bash
download
content_copy
expand_less
npm install
3. Database Setup

Create a database in PostgreSQL. You can use pgAdmin or the psql command-line tool:

code
SQL
download
content_copy
expand_less
CREATE DATABASE watchparty_db;

Run the SQL scripts from the /scripts folder to create the necessary tables. Connect to your newly created database and execute the scripts in order:

First, 001_create_users_table.sql (or your equivalent script that creates the users table).

Then, 001_create_rooms_tables.sql.

Important: Ensure your users table schema matches what the application code expects (with profile_picture, phone_number, and role columns).

4. Environment Configuration

In the project's root directory (W2G_Backend/), create a new file named .env.

Copy the content below into your .env file and replace the placeholder values with your actual configuration.

code
Env
download
content_copy
expand_less
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

Security Note: JWT_SECRET must be a long, random, and unique string. Do not use a common password!

5. Running the Application

For development (with auto-reload):

code
Bash
download
content_copy
expand_less
npm run dev
```    The server will start, and `nodemon` will automatically restart it whenever you save a file.

For production:

code
Bash
download
content_copy
expand_less
npm start

(This assumes you have a "start": "node src/server.js" script in your package.json).

After a successful launch, you will see the following output in your console:

code
Code
download
content_copy
expand_less
2025-10-17 11:00:00 [info]: Server is running on port 5000
2025-10-17 11:00:00 [info]: Swagger docs available at http://localhost:5000/api-docs
Database connected successfully.
📖 API Documentation (Swagger)

This project uses Swagger to automatically generate interactive API documentation.

To access the documentation:

Start the server.

Open your web browser and navigate to the following URL:
http://localhost:5000/api-docs

From this page, you can:

View all available endpoints, grouped by tags (e.g., Authentication, Rooms).

See the expected parameters, request bodies, and response schemas for each endpoint.

Test the API endpoints directly from your browser. For protected routes, click the "Authorize" button and paste your JWT token to authenticate your requests.
