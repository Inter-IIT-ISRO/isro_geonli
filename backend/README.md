# ISRO GeoNLI - Backend

The backend server acts as the orchestrator between the frontend client, the database, and the inference nodes (SAM3 and Qwen).

## API Overview

    - /api/auth: Login/Signup

    - /api/chat: Send queries, upload images, retrieve history

    - /api/admin: Administrative metrics and logs


## File Structure

```text
backend/
├── config/                     # Configuration files
│   ├── database.js            # MongoDB connection
│   ├── minio.js               # MinIO client setup
│   └── constants.js
├── controllers/               # Controllers
│   ├── admin.js
│   ├── auth.js
│   ├── chat.js
│   └── evaluation.js
├── middlewares/               # Express middlewares
│   ├── auth.js                # JWT authentication
│   └── error.js               # Error handling
├── models/                    # Mongoose schemas
│   ├── chat.js
│   └── user.js
├── routes/                    # API routes
│   ├── admin.js
│   ├── chat.js
│   └── user.js
├── utils/                     # Helper functions
│   ├── inference.js           # Logic to call Python inference services
│   └── minio.js               # File upload utilities
├── app.js                     # Express app setup
├── server.js                  # Server entry point
├── Dockerfile                 # Docker configuration
└── package.json               # Dependencies

