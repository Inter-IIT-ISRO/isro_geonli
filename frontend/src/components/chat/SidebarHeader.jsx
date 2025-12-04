import React from "react";
import { LuPanelRightOpen } from "react-icons/lu";
import { GoSidebarCollapse } from "react-icons/go";

export default function SidebarHeader({ 
  sidebarCollapsed, 
  isHoveringLogo,
  toggleSidebar,
  theme,
  textColor,
  hoverChatBg,
  handleImageError
}) {
  return (
    <div className="flex-shrink-0 p-3 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between min-w-0 relative">
        {!sidebarCollapsed ? (
          <>
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <img 
                src="/src/assets/isro_logo.png" 
                alt="ISRO" 
                className="h-8 w-8 object-contain flex-shrink-0" 
                onError={handleImageError}
              />
              <div 
                className="h-8 w-8 bg-blue-500 rounded flex items-center justify-center text-white text-sm font-bold hidden"
              >
                ISRO
              </div>
              <span className={`${textColor} text-xl font-bold truncate`}>AstraVLM</span>
            </div>
            <button
              onClick={toggleSidebar}
              title="Collapse Sidebar"
              className={`p-2 rounded-lg ${hoverChatBg} transition-colors cursor-pointer flex-shrink-0`}
            >
              <LuPanelRightOpen className={`${textColor} text-xl`} style={{ strokeWidth: 1.5 }} />
            </button>
          </>
        ) : (
          <div className="w-full flex justify-center">
            <div className="relative h-10 w-10 flex items-center justify-center flex-shrink-0">
              <img 
                src="/src/assets/isro_logo.png" 
                alt="ISRO" 
                className={`absolute h-10 w-10 object-contain transition-opacity duration-200 ${
                  isHoveringLogo ? 'opacity-0' : 'opacity-100'
                }`}
                onError={handleImageError}
              />
              <GoSidebarCollapse 
                className={`absolute ${textColor} text-2xl transition-opacity duration-200 cursor-pointer ${
                  isHoveringLogo ? 'opacity-100' : 'opacity-0'
                }`} 
                style={{ strokeWidth: 0.5 }}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSidebar();
                }}
              />
              <div 
                className="absolute h-10 w-10 bg-blue-500 rounded items-center justify-center text-white text-sm font-bold hidden"
              >
                ISRO
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
