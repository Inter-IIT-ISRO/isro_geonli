import React, { useState, useEffect } from 'react';
import { IoClose, IoCopy, IoCheckmark } from 'react-icons/io5';
import { MdRemoveRedEye, MdEdit } from 'react-icons/md';

export default function ShareModal({ isOpen, onClose, chatId, onShare, onRevoke, initialShareInfo, theme }) {
  const [permission, setPermission] = useState('view');
  const [shareUrl, setShareUrl] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const bgColor = theme === "dark" ? "bg-neutral-800" : "bg-white";
  const textColor = theme === "dark" ? "text-slate-200" : "text-gray-800";
  const secondaryTextColor = theme === "dark" ? "text-slate-400" : "text-gray-600";
  const borderColor = theme === "dark" ? "border-slate-600" : "border-gray-300";
  const inputBg = theme === "dark" ? "bg-neutral-700" : "bg-gray-50";
  const hoverBg = theme === "dark" ? "hover:bg-neutral-700" : "hover:bg-gray-100";
  const selectedBg = theme === "dark" ? "bg-blue-900/50" : "bg-blue-100";

  useEffect(() => {
    if (isOpen && initialShareInfo) {
      if (initialShareInfo.shareToken && initialShareInfo.sharePermission !== 'none') {
        setIsShared(true);
        setPermission(initialShareInfo.sharePermission);
        const baseUrl = window.location.origin;
        setShareUrl(`${baseUrl}/shared/${initialShareInfo.shareToken}`);
      } else {
        setIsShared(false);
        setShareUrl('');
        setPermission('view');
      }
      setCopied(false);
    }
  }, [isOpen, initialShareInfo]);

  const handleGenerateLink = async () => {
    setIsGenerating(true);
    try {
      const url = await onShare(chatId, permission);
      setShareUrl(url);
      setIsShared(true);
    } catch (error) {
      console.error('Failed to generate share link:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleRevokeAccess = async () => {
    try {
      await onRevoke(chatId);
      setShareUrl('');
      setIsShared(false);
      setCopied(false);
      setPermission('view'); 
    } catch (error) {
      console.error('Failed to revoke access:', error);
    }
  };

  const handleChangePermission = async () => {
    const newPermission = permission === 'view' ? 'edit' : 'view';
    setPermission(newPermission);
    setIsGenerating(true);
    try {
      const url = await onShare(chatId, newPermission);
      setShareUrl(url);
      setIsShared(true);
    } catch (error) {
      console.error('Failed to update permission:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className={`${bgColor} rounded-xl shadow-2xl w-full max-w-md mx-4 border ${borderColor}`}>
        <div className={`flex items-center justify-between p-4 border-b ${borderColor}`}>
          <h2 className={`text-lg font-semibold ${textColor}`}>Share Chat</h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg ${hoverBg} transition-colors`}
          >
            <IoClose className={`${textColor} text-xl`} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {!isShared ? (
            <>
              <div>
                <label className={`block text-sm font-medium ${textColor} mb-2`}>
                  Choose permission level
                </label>
                <div className="space-y-2">
                  <button
                    onClick={() => setPermission('view')}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border ${borderColor} transition-all ${
                      permission === 'view' ? selectedBg : hoverBg
                    }`}
                  >
                    <MdRemoveRedEye className={`text-xl ${textColor}`} />
                    <div className="text-left flex-1">
                      <div className={`text-sm font-medium ${textColor}`}>View only</div>
                      <div className={`text-xs ${secondaryTextColor}`}>
                        Others can view the chat but cannot add messages
                      </div>
                    </div>
                    {permission === 'view' && (
                      <IoCheckmark className="text-blue-500 text-xl" />
                    )}
                  </button>

                  <button
                    onClick={() => setPermission('edit')}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border ${borderColor} transition-all ${
                      permission === 'edit' ? selectedBg : hoverBg
                    }`}
                  >
                    <MdEdit className={`text-xl ${textColor}`} />
                    <div className="text-left flex-1">
                      <div className={`text-sm font-medium ${textColor}`}>Can continue chatting</div>
                      <div className={`text-xs ${secondaryTextColor}`}>
                        Others can view and add new messages
                      </div>
                    </div>
                    {permission === 'edit' && (
                      <IoCheckmark className="text-blue-500 text-xl" />
                    )}
                  </button>
                </div>
              </div>

              <button
                onClick={handleGenerateLink}
                disabled={isGenerating}
                className={`w-full py-2.5 px-4 rounded-lg font-medium transition-all ${
                  isGenerating
                    ? 'bg-gray-500 cursor-not-allowed opacity-50'
                    : 'bg-[#FF6B35] hover:bg-[#ff7a47] active:bg-[#e85a2a]'
                } text-white`}
              >
                {isGenerating ? 'Generating...' : 'Generate Share Link'}
              </button>
            </>
          ) : (
            <>
              <div>
                <label className={`block text-sm font-medium ${textColor} mb-2`}>
                  Share link
                </label>
                <div className={`flex items-center gap-2 p-3 rounded-lg border ${borderColor} ${inputBg}`}>
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className={`flex-1 bg-transparent ${textColor} text-sm outline-none`}
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`p-2 rounded ${hoverBg} transition-colors flex-shrink-0`}
                    title="Copy link"
                  >
                    {copied ? (
                      <IoCheckmark className="text-green-500 text-lg" />
                    ) : (
                      <IoCopy className={`${textColor} text-lg`} />
                    )}
                  </button>
                </div>
                <p className={`text-xs ${secondaryTextColor} mt-1`}>
                  Permission: <span className="font-medium capitalize">{permission}</span>
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleChangePermission}
                  disabled={isGenerating}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium border ${borderColor} ${textColor} ${hoverBg} transition-all ${
                    isGenerating ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isGenerating ? 'Updating...' : 'Change Permission'}
                </button>
                <button
                  onClick={handleRevokeAccess}
                  className="flex-1 py-2 px-4 rounded-lg font-medium bg-red-500 hover:bg-red-600 text-white transition-all"
                >
                  Revoke Access
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
