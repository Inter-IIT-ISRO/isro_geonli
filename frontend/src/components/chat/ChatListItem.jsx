import React from "react";
import { BsThreeDotsVertical } from "react-icons/bs";

export default function ChatListItem({
  chat,
  chatId,
  isActive,
  isRenaming,
  isMenuOpen,
  renameValue,
  setRenameValue,
  onChatSelect,
  onRenameSubmit,
  setRenamingChatId,
  onMenuOpen,
  theme,
  textColor,
  borderColor,
  activeChatBg,
  hoverChatBg
}) {
  if (isRenaming) {
    return (
      <div
        data-chat-item
        className={`relative w-full rounded-lg mb-1 transition-colors group ${activeChatBg}`}
      >
        <div className="p-3">
          <input
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                onRenameSubmit(chatId);
              } else if (e.key === 'Escape') {
                setRenamingChatId(null);
                setRenameValue('');
              }
            }}
            onBlur={() => onRenameSubmit(chatId)}
            autoFocus
            className={`w-full px-2 py-1 text-sm ${textColor} bg-transparent border ${borderColor} rounded focus:outline-none`}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      data-chat-item
      className={`relative w-full rounded-lg mb-1 transition-colors group ${
        isActive ? activeChatBg : ''
      } ${!isActive ? hoverChatBg : ''}`}
    >
      <button
        onClick={(e) => {
          if (!isMenuOpen) {
            if (e.ctrlKey || e.metaKey) {
              window.open(`/chat/${chatId}`, '_blank');
            } else {
              onChatSelect(chatId);
            }
          }
        }}
        className={`w-full text-left p-3 pr-10 cursor-pointer chat-item-btn ${isMenuOpen ? 'pointer-events-none' : ''}`}
        title={chat.description || 'Untitled Chat'}
      >
        <div className={`${textColor} text-sm truncate`}>
          {chat.description || 'Untitled Chat'}
        </div>
      </button>
      
      <div 
        className={`absolute right-2 top-1/2 -translate-y-1/2 chat-menu-container ${
          isMenuOpen ? 'z-[60]' : 'z-10'
        }`}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMenuOpen(chatId, e.currentTarget);
          }}
          title="Chat Options"
          className={`menu-trigger p-1.5 cursor-pointer transition-opacity ${
            isMenuOpen ? 'menu-open' : ''
          }`}
        >
          <BsThreeDotsVertical className={`${textColor} text-base`} />
        </button>
      </div>
    </div>
  );
}
