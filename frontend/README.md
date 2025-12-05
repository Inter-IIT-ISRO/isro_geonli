# ISRO GeoNLI - Frontend

This is the frontend client for the ISRO GeoNLI application, built with React and Vite. It provides a chat interface for users to interact with our models for inference.

## 📂 File Structure

```text
frontend/
├── .dockerignore
├── .gitignore
├── Dockerfile                  # Docker build configuration
├── README.md                   # Project documentation
├── eslint.config.js           # Linting configuration
├── index.html                  # Entry HTML file
├── package.json               # Dependencies and scripts
├── vite.config.js             # Vite configuration
├── public/
│   └── vite.svg
└── src/
    ├── assets/                # Static assets (images, logos)
    ├── components/            # Reusable UI components
    │   ├── chat/              # Chat-specific components (Sidebar, Message list, etc.)
    │   ├── ImageUpload.jsx
    │   ├── ParticleBackground.jsx
    │   ├── ProtectedRoute.jsx
    │   └── ...
    ├── context/               # React Context (AuthContext)
    ├── pages/                 # Page components (Login, MainChat, AdminDashboard)
    ├── services/              # API service functions (axios instances)
    ├── App.jsx                # Main App component
    ├── main.jsx               # Application entry point
    └── index.css              # Global styles
