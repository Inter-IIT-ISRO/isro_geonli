import React from "react";
import SidebarHeader from "./SidebarHeader";
import SidebarNavButtons from "./SidebarNavButtons";
import ChatList from "./ChatList";
import UserMenu from "./UserMenu";
import GuestButtons from "./GuestButtons";

export default function Sidebar({
  sidebarCollapsed,
  sidebarWidth,
  isResizing,
  isHoveringLogo,
  setIsHoveringLogo,
  
  currentChatId,
  filteredChats,
  searchQuery,
  setSearchQuery,
  
  openMenuChatId,
  renamingChatId,
  setRenamingChatId,
  renameValue,
  setRenameValue,
  showUserMenu,
  setShowUserMenu,
  
  isAuthenticated,
  user,
  
  toggleSidebar,
  toggleTheme,
  handleNewChat,
  handleChatSelect,
  handleRenameSubmit,
  handleMenuOpen,
  handleLogout,
  handleMouseDown,
  handleImageError,
  
  theme,
  sidebarBg,
  textColor,
  secondaryTextColor,
  borderColor,
  searchBg,
  activeChatBg,
  hoverChatBg
}) {
  return (
    <div 
      className={`h-full ${sidebarBg} border-r ${borderColor} z-30 flex flex-col relative ${
        isResizing ? '' : 'transition-[width] duration-300 ease-in-out'
      } ${
        sidebarCollapsed ? "cursor-pointer" : ""
      }`}
      style={{ 
        width: sidebarCollapsed ? '64px' : `${sidebarWidth}px`,
        minWidth: '64px',
        maxWidth: '400px',
        overflow: 'hidden'
      }}
      onMouseEnter={() => {
        if (sidebarCollapsed) setIsHoveringLogo(true);
      }}
      onMouseLeave={() => {
        if (sidebarCollapsed) setIsHoveringLogo(false);
      }}
      onClick={() => {
        if (sidebarCollapsed) {
          toggleSidebar();
        }
      }}
    >
      {!sidebarCollapsed && (
        <div
          onMouseDown={handleMouseDown}
          className={`absolute top-0 right-0 bottom-0 w-1 cursor-ew-resize transition-all ${
            isResizing 
              ? 'bg-blue-500' 
              : `${theme === "dark" ? 'hover:bg-blue-500/30' : 'hover:bg-blue-400/30'}`
          }`}
          style={{ zIndex: 40 }}
        />
      )}

      <SidebarHeader
        sidebarCollapsed={sidebarCollapsed}
        isHoveringLogo={isHoveringLogo}
        toggleSidebar={toggleSidebar}
        theme={theme}
        textColor={textColor}
        hoverChatBg={hoverChatBg}
        handleImageError={handleImageError}
      />

      <div className="flex-1 overflow-hidden flex flex-col">
        <SidebarNavButtons
          sidebarCollapsed={sidebarCollapsed}
          theme={theme}
          secondaryTextColor={secondaryTextColor}
          hoverChatBg={hoverChatBg}
          onThemeToggle={toggleTheme}
          onNewChat={handleNewChat}
        />

        {isAuthenticated && !sidebarCollapsed && (
          <ChatList
            filteredChats={filteredChats}
            currentChatId={currentChatId}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            renamingChatId={renamingChatId}
            setRenamingChatId={setRenamingChatId}
            renameValue={renameValue}
            setRenameValue={setRenameValue}
            openMenuChatId={openMenuChatId}
            onChatSelect={handleChatSelect}
            onRenameSubmit={handleRenameSubmit}
            onMenuOpen={handleMenuOpen}
            theme={theme}
            textColor={textColor}
            secondaryTextColor={secondaryTextColor}
            borderColor={borderColor}
            searchBg={searchBg}
            activeChatBg={activeChatBg}
            hoverChatBg={hoverChatBg}
          />
        )}
      </div>

      <div className="flex-shrink-0 pt-2 px-2 pb-2 border-t border-gray-200 dark:border-gray-700">
        {isAuthenticated ? (
          <UserMenu
            user={user}
            sidebarCollapsed={sidebarCollapsed}
            showUserMenu={showUserMenu}
            setShowUserMenu={setShowUserMenu}
            onLogout={handleLogout}
            theme={theme}
            textColor={textColor}
            borderColor={borderColor}
            hoverChatBg={hoverChatBg}
          />
        ) : (
          <GuestButtons
            sidebarCollapsed={sidebarCollapsed}
            theme={theme}
            textColor={textColor}
            borderColor={borderColor}
            hoverChatBg={hoverChatBg}
          />
        )}
      </div>
    </div>
  );
}
