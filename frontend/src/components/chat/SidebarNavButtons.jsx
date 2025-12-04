import React from "react";
import { MdOutlineDarkMode } from "react-icons/md";
import { CiCirclePlus, CiLight } from "react-icons/ci";

export default function SidebarNavButtons({
  sidebarCollapsed,
  theme,
  secondaryTextColor,
  hoverChatBg,
  onThemeToggle,
  onNewChat
}) {
  return (
    <div className="p-2 space-y-2">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onThemeToggle();
        }}
        title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center p-3' : 'justify-start gap-3 p-3'} ${sidebarCollapsed ? 'rounded-full' : 'rounded-lg'} transition-all duration-200 cursor-pointer min-w-0 ${
          theme === 'dark' ? 'bg-slate-600 hover:bg-slate-700 border border-slate-500' : 'bg-slate-700 hover:bg-slate-800 border border-slate-600'
        }`}
      >
        {theme === "dark" ? (
          <CiLight className={`${theme === 'dark' ? 'text-slate-200' : 'text-white'} text-xl flex-shrink-0`} />
        ) : (
          <MdOutlineDarkMode className={`${theme === 'dark' ? 'text-slate-200' : 'text-white'} text-xl flex-shrink-0`} />
        )}
        {!sidebarCollapsed && (
          <span className={`${theme === 'dark' ? 'text-slate-200' : 'text-white'} font-medium text-sm truncate`}>
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </span>
        )}
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onNewChat(e);
        }}
        title="Start a New Chat"
        className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center p-3' : 'justify-start gap-3 p-3'} ${sidebarCollapsed ? 'rounded-full' : 'rounded-lg'} transition-all duration-200 cursor-pointer min-w-0 ${
          theme === 'dark' ? 'bg-slate-700/50 hover:bg-slate-700/70 border border-slate-600/50' : 'bg-slate-100 hover:bg-slate-200 border border-slate-300'
        }`}
      >
        <CiCirclePlus className={`${secondaryTextColor} text-xl flex-shrink-0`} />
        {!sidebarCollapsed && (
          <span className={`${secondaryTextColor} font-medium text-sm truncate`}>New Chat</span>
        )}
      </button>
    </div>
  );
}
