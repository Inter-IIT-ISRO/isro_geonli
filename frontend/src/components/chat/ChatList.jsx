import React from "react";
import { IoIosSearch } from "react-icons/io";
import ChatListItem from "./ChatListItem";

export default function ChatList({
  filteredChats,
  currentChatId,
  searchQuery,
  setSearchQuery,
  renamingChatId,
  setRenamingChatId,
  renameValue,
  setRenameValue,
  openMenuChatId,
  onChatSelect,
  onRenameSubmit,
  onMenuOpen,
  theme,
  textColor,
  secondaryTextColor,
  borderColor,
  searchBg,
  activeChatBg,
  hoverChatBg
}) {
  return (
    <div className="flex-1 flex flex-col min-h-0 mt-1">
      <div className="px-2 pb-2">
        <div className={`relative rounded-lg border ${borderColor} ${searchBg}`}>
          <IoIosSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${textColor} text-lg`} />
          <input
            type="text"
            placeholder="Search Chats"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-3 py-2 bg-transparent ${textColor} placeholder-gray-500 outline-none rounded-lg`}
          />
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="px-2 pb-1 flex-shrink-0">
          <div className={`${secondaryTextColor} text-xs font-semibold uppercase tracking-wider px-2`}>
            Chats
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-2 min-h-0 custom-scrollbar">
          {filteredChats.length > 0 ? (
            filteredChats.map((chat) => {
              const chatId = chat._id || chat.id;
              return (
                <ChatListItem
                  key={chatId}
                  chat={chat}
                  chatId={chatId}
                  isActive={currentChatId === chatId}
                  isRenaming={renamingChatId === chatId}
                  isMenuOpen={openMenuChatId === chatId}
                  renameValue={renameValue}
                  setRenameValue={setRenameValue}
                  onChatSelect={onChatSelect}
                  onRenameSubmit={onRenameSubmit}
                  setRenamingChatId={setRenamingChatId}
                  onMenuOpen={onMenuOpen}
                  theme={theme}
                  textColor={textColor}
                  borderColor={borderColor}
                  activeChatBg={activeChatBg}
                  hoverChatBg={hoverChatBg}
                />
              );
            })
          ) : (
            <div className={`${secondaryTextColor} text-sm text-center py-8`}>
              {searchQuery ? 'No matching chats found' : 'No chats yet'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
