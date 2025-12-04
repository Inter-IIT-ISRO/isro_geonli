import { useState } from 'react'
import './App.css'
import Auth from './pages/Auth'
import AdminDashboard from './pages/AdminDashboard'
import SharedChat from './pages/SharedChat'
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import MainChat from './pages/MainChat'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  const router = createBrowserRouter([
    { path: "/", Component: Auth },
    { path: "/signup", Component: Auth },
    { 
      path: "/chat", 
      element: <MainChat />  // Allow guest access
    },
    { 
      path: "/chat/:chatId", 
      element: <MainChat />  // Allow guest access with specific chat
    },
    { 
      path: "/main-chat", 
      element: <MainChat />  // Allow guest access
    },
    {
      path: "/shared/:token",
      element: <SharedChat />  // Public shared chat access
    },
    { 
      path: "/admin/dashboard", 
      element: (
        <ProtectedRoute requireAdmin={true}>
          <AdminDashboard />
        </ProtectedRoute>
      )
    },
  ]);

  return (
    <AuthProvider>
      <RouterProvider router={router}/>
    </AuthProvider>
  )
}

export default App
