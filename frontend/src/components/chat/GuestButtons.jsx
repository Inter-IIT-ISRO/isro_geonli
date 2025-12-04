import React from "react";
import { useNavigate } from "react-router-dom";

export default function GuestButtons({
  sidebarCollapsed,
  theme,
  textColor,
  borderColor,
  hoverChatBg
}) {
  const navigate = useNavigate();

  return (
    <div className={`space-y-2 ${sidebarCollapsed ? 'px-2' : 'px-2'}`}>
      <button
        onClick={() => navigate('/')}
        className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-start gap-3'} p-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer`}
      >
        {!sidebarCollapsed && (
          <span className="text-white text-sm font-medium">Login</span>
        )}
        {sidebarCollapsed && (
          <span className="text-white text-sm font-medium">L</span>
        )}
      </button>
      <button
        onClick={() => navigate('/signup')}
        className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-start gap-3'} p-2 rounded-lg ${hoverChatBg} border ${borderColor} transition-colors cursor-pointer`}
      >
        {!sidebarCollapsed && (
          <span className={`${textColor} text-sm font-medium`}>Sign Up</span>
        )}
        {sidebarCollapsed && (
          <span className={`${textColor} text-sm font-medium`}>S</span>
        )}
      </button>
    </div>
  );
}
