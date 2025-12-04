import React from "react";

export default function LoginPromptBanner({ onLoginClick, onDismiss }) {
  return (
    <div className="absolute top-0 left-0 right-0 z-50 bg-yellow-600 text-white py-3 px-4 flex justify-between items-center">
      <span className="text-sm font-medium">
        ⚠️ You are using guest mode. Your chat will be lost unless you login to save it.
      </span>
      <div className="flex gap-3">
        <button 
          onClick={onLoginClick} 
          className="px-4 py-1 bg-white text-yellow-600 rounded hover:bg-gray-100 text-sm font-semibold transition-colors"
        >
          Login to Save
        </button>
        <button 
          onClick={onDismiss} 
          className="px-4 py-1 border border-white rounded hover:bg-yellow-700 text-sm transition-colors"
        >
          Continue as Guest
        </button>
      </div>
    </div>
  );
}
