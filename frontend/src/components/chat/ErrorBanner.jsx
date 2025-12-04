import React from "react";

export default function ErrorBanner({ error, onDismiss }) {
  if (!error) return null;
  
  return (
    <div className="absolute top-0 left-0 right-0 z-40 bg-red-600 text-white py-2 px-4 text-center">
      <span className="text-sm">{error}</span>
      <button 
        onClick={onDismiss} 
        className="ml-4 text-sm underline hover:no-underline"
      >
        Dismiss
      </button>
    </div>
  );
}
