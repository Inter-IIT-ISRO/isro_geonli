import React from "react";
import { useNavigate } from "react-router-dom";
import { MdAdminPanelSettings } from "react-icons/md";
import { FiLogOut } from "react-icons/fi";

export default function UserMenu({
  user,
  sidebarCollapsed,
  showUserMenu,
  setShowUserMenu,
  onLogout,
  theme,
  textColor,
  borderColor,
  hoverChatBg
}) {
  const navigate = useNavigate();

  return (
    <div className="relative user-menu-container" style={{ marginLeft: '-6px' }}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowUserMenu(!showUserMenu);
        }}
        title="Account Settings"
        className={`${sidebarCollapsed ? 'w-9 h-9 p-0 mr-auto ml-1' : 'w-full p-2'} flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-start gap-3'} rounded-full ${hoverChatBg} transition-all duration-200 cursor-pointer`}
      >
        <div className={`${sidebarCollapsed ? 'h-9 w-9 text-sm' : 'h-8 w-8'} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 transition-all duration-300 ${
          theme === "dark" ? "bg-blue-600" : "bg-blue-500"
        }`}>
          {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
        </div>
        {!sidebarCollapsed && (
          <div className="flex-1 text-left overflow-hidden">
            <div className={`${textColor} text-sm font-medium truncate`}>
              {user?.email ? user.email.split('@')[0] : 'User'}
            </div>
          </div>
        )}
      </button>

      {showUserMenu && (
        <div 
          className={`fixed w-48 rounded-lg shadow-xl overflow-hidden z-[100] ${
            theme === "dark" ? "bg-neutral-700" : "bg-white"
          }`}
          style={{
            bottom: '72px',
            left: sidebarCollapsed ? '68px' : '8px',
            border: theme === "dark" ? "1px solid #404040" : "1px solid #e5e7eb",
            boxShadow: theme === "dark" 
              ? "0 10px 25px rgba(0, 0, 0, 0.5)" 
              : "0 10px 25px rgba(0, 0, 0, 0.15)"
          }}
        >
          {user?.role === 2 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowUserMenu(false);
                navigate('/admin/dashboard');
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm ${textColor} transition-colors cursor-pointer ${
                theme === "dark" ? "hover:bg-neutral-600" : "hover:bg-gray-100"
              }`}
            >
              <MdAdminPanelSettings className="text-amber-500 text-base" />
              <span>Admin Dashboard</span>
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLogout();
              setShowUserMenu(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 transition-colors cursor-pointer ${
              theme === "dark" ? "hover:bg-neutral-600" : "hover:bg-gray-100"
            }`}
          >
            <FiLogOut className="text-base" />
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  );
}
