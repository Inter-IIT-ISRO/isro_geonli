import React from "react";
import { createPortal } from "react-dom";
import { MdEdit, MdDelete } from "react-icons/md";

export default function ChatMenuPortal({
  openMenuChatId,
  menuAnchorRect,
  menuPlacement,
  allChats,
  onMenuClose,
  onRenameClick,
  onDeleteClick,
  theme,
  textColor
}) {
  if (!openMenuChatId || !menuAnchorRect) return null;

  const menuWidth = 176; 
  const estimatedMenuHeight = 96; 
  const baseLeft = Math.min(menuAnchorRect.right + 8, window.innerWidth - menuWidth - 8);
  const shift = menuWidth * 0.25;
  const safeLeft = Math.max(8, Math.min(window.innerWidth - menuWidth - 8, baseLeft - shift));
  const top = menuPlacement === 'down'
    ? Math.min(menuAnchorRect.bottom + 8, window.innerHeight - estimatedMenuHeight - 8)
    : Math.max(menuAnchorRect.top - estimatedMenuHeight - 8, 8);
  const border = theme === 'dark' ? '1px solid #404040' : '1px solid #e5e7eb';
  const shadow = theme === 'dark' ? '0 10px 25px rgba(0, 0, 0, 0.5)' : '0 10px 25px rgba(0, 0, 0, 0.15)';
  const activeChat = allChats.find(c => (c._id || c.id) === openMenuChatId);

  return createPortal(
    <>
      <div className="fixed inset-0 z-[999]" onClick={onMenuClose} />
      <div
        className={`fixed w-44 rounded-lg shadow-xl z-[1000] chat-menu-portal ${theme === 'dark' ? 'bg-neutral-700' : 'bg-white'}`}
        style={{ top, left: safeLeft, border, boxShadow: shadow }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRenameClick(openMenuChatId, activeChat?.description);
          }}
          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm ${textColor} transition-colors cursor-pointer ${
            theme === 'dark' ? 'hover:bg-neutral-600' : 'hover:bg-gray-100'
          }`}
        >
          <MdEdit className="text-cyan-500 text-base" />
          <span>Rename</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteClick(openMenuChatId);
          }}
          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 transition-colors cursor-pointer ${
            theme === 'dark' ? 'hover:bg-neutral-600' : 'hover:bg-gray-100'
          }`}
        >
          <MdDelete className="text-base" />
          <span>Delete</span>
        </button>
      </div>
    </>,
    document.body
  );
}
