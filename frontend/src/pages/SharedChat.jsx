import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import ChatWindow from "../components/ChatWindow";
import { getSharedChat, addMessageToSharedChat } from "../services/api";

export default function SharedChat() {
  const [theme, setTheme] = useState("dark");
  const [imageUrl, setImageUrl] = useState(null);
  const [chatTitle, setChatTitle] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [sharePermission, setSharePermission] = useState('view');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStartTime, setGenerationStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [lastResponseTime, setLastResponseTime] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const { token } = useParams();

  const bgColor = theme === "dark" ? "bg-neutral-900" : "bg-gray-50";
  const textColor = theme === "dark" ? "text-slate-200" : "text-gray-800";
  const secondaryTextColor = theme === "dark" ? "text-slate-400" : "text-gray-600";

  useEffect(() => {
    if (isGenerating && generationStartTime) {
      const interval = setInterval(() => {
        setElapsedTime(((Date.now() - generationStartTime) / 1000).toFixed(0));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isGenerating, generationStartTime]);

  useEffect(() => {
    const loadSharedChat = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getSharedChat(token);
        
        setImageUrl(response.data.image_url);
        setChatTitle(response.data.chat.description || 'Shared Chat');
        setChatHistory(response.data.chat.chats || []);
        setSharePermission(response.data.chat.sharePermission);
        setOwnerEmail(response.data.chat.owner);
      } catch (error) {
        console.error('Failed to load shared chat:', error);
        setError('This shared link is invalid or has been revoked.');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      loadSharedChat();
    }
  }, [token]);

  const handleSendMessage = async (query) => {
    if (!query.trim() || sharePermission !== 'edit') return;
    
    setIsGenerating(true);
    setGenerationStartTime(Date.now());
    setElapsedTime(0);
    setLastResponseTime(null);
    setError(null);
    
    const tempChat = { 
      query, 
      response: '...', 
      bounding_boxes: [],
      timestamp: new Date().toISOString()
    };
    
    setChatHistory(prev => [...prev, tempChat]);
    
    try {
      const response = await addMessageToSharedChat(token, query);
      const responseTime = response.data.response_time || null;
      setLastResponseTime(responseTime);
      
      setChatHistory(prev => {
        const newHistory = [...prev];
        newHistory[newHistory.length - 1] = {
          query,
          response: response.data.response || 'No response received',
          bounding_boxes: response.data.bounding_boxes || [],
          response_time: responseTime,
          timestamp: new Date().toISOString()
        };
        return newHistory;
      });
    } catch (error) {
      console.error('Failed to generate response:', error);
      setChatHistory(prev => prev.slice(0, -1));
      setError('Failed to generate response. Please try again.');
    }
    setIsGenerating(false);
    setGenerationStartTime(null);
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-screen ${bgColor}`}>
        <div className={`text-center ${textColor}`}>
          <div className="text-xl mb-2">Loading shared chat...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-screen ${bgColor}`}>
        <div className="text-center">
          <div className={`text-xl mb-2 ${textColor}`}>❌ {error}</div>
          <a 
            href="/"
            className="text-blue-500 hover:underline"
          >
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen ${bgColor}`}>
      <div className={`flex-shrink-0 px-4 py-3 border-b ${theme === "dark" ? "border-slate-600 bg-neutral-800" : "border-gray-300 bg-white"}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <div className={`text-sm ${secondaryTextColor}`}>
              Shared by <span className="font-medium">{ownerEmail}</span>
            </div>
            <div className={`text-xs ${secondaryTextColor} mt-0.5`}>
              {sharePermission === 'view' ? '👁️ View only' : '✏️ Can continue chatting'}
            </div>
          </div>
          <a
            href="/"
            className="px-4 py-2 rounded-lg bg-[#FF6B35] hover:bg-[#ff7a47] text-white text-sm font-medium transition-colors"
          >
            Create Your Own Chat
          </a>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <ChatWindow 
          chatId={null}
          imageUrl={imageUrl}
          chatTitle={chatTitle}
          chatHistory={chatHistory} 
          onSendMessage={sharePermission === 'edit' ? handleSendMessage : null}
          isGenerating={isGenerating}
          elapsedTime={elapsedTime}
          lastResponseTime={lastResponseTime}
          onShareClick={null}
          theme={theme} 
        />
      </div>
    </div>
  );
}
