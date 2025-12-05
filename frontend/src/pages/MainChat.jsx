import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ChatWindow from "../components/ChatWindow";
import ShareModal from "../components/ShareModal";
import Sidebar from "../components/chat/Sidebar";
import LoginPromptBanner from "../components/chat/LoginPromptBanner";
import ErrorBanner from "../components/chat/ErrorBanner";
import WelcomeScreen from "../components/chat/WelcomeScreen";
import ChatMenuPortal from "../components/chat/ChatMenuPortal";
import api, { createChat, getChatById, getChatSidebar, describeChat, generateCompletion, generateCompletionStream, renameChat, deleteChat, shareChat, revokeShare, updateChatTimes } from "../services/api";

export default function MainChat() {
  const [theme, setTheme] = useState("dark");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(260); 
  const [isResizing, setIsResizing] = useState(false);
  const [isHoveringLogo, setIsHoveringLogo] = useState(false);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [currentImageUrl, setCurrentImageUrl] = useState(null);
  const [currentChatTitle, setCurrentChatTitle] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [allChats, setAllChats] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStartTime, setGenerationStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [lastResponseTime, setLastResponseTime] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [error, setError] = useState(null);
  const [openMenuChatId, setOpenMenuChatId] = useState(null);
  const [renamingChatId, setRenamingChatId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [menuAnchorRect, setMenuAnchorRect] = useState(null);
  const [menuPlacement, setMenuPlacement] = useState('down');
  const [showShareModal, setShowShareModal] = useState(false);
  const [currentShareInfo, setCurrentShareInfo] = useState({ shareToken: null, sharePermission: 'none' });
  
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  const { chatId: urlChatId } = useParams();

  useEffect(() => {
    if (urlChatId && isAuthenticated) {
      handleChatSelect(urlChatId);
    }
  }, [urlChatId, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      loadUserChats();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isGenerating && generationStartTime) {
      const interval = setInterval(() => {
        setElapsedTime(((Date.now() - generationStartTime) / 1000).toFixed(0));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isGenerating, generationStartTime]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      const inChatMenu = e.target.closest('.chat-menu-container');
      const inChatMenuPortal = e.target.closest('.chat-menu-portal');
      if (openMenuChatId && !(inChatMenu || inChatMenuPortal)) {
        handleMenuClose();
      }
      if (showUserMenu && !e.target.closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuChatId, showUserMenu]);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      
      const newWidth = e.clientX;
      if (newWidth >= 260 && newWidth <= 450) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const loadUserChats = async () => {
    try {
      setError(null);
      const response = await getChatSidebar();
      setAllChats(response.data || []);
    } catch (error) {
      console.error('Failed to load chats:', error);
      setError('Failed to load chats');
    }
  };

  const handleImageUpload = async (file) => {
    setIsUploading(true);
    setError(null);
    try {
      const response = await createChat(file);
      const chatId = response.data.chat_id;
      const chatResponse = await getChatById(chatId);
      setCurrentChatId(chatId);
      setCurrentImageUrl(chatResponse.data.image_url || null);
      setCurrentChatTitle('Untitled Chat');
      setChatHistory(chatResponse.data.chat && chatResponse.data.chat.chats ? chatResponse.data.chat.chats : []);
      setCurrentShareInfo({ shareToken: null, sharePermission: 'none' }); // New chat is not shared
      
      navigate(`/chat/${chatId}`, { replace: true });
      
      if (isAuthenticated) {
        loadUserChats();
        try {
          const descResponse = await describeChat(chatId);
          if (descResponse?.data?.description) {
            setCurrentChatTitle(descResponse.data.description);
          }
          loadUserChats();
        } catch (error) {
          console.error('Failed to generate description:', error);
        }
      } else {
        setShowLoginPrompt(true);
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
      setError('Failed to upload image. Please try again.');
    }
    setIsUploading(false);
  };

  const getCategory = async (query,image_url) => {
    return (await api.post('/classify', { query,image_url })).data;
  };

  const handleSendMessage = async (query) => {
    if (!currentChatId || !query.trim()) return;
    
    // Store start time in local variable (not just state) for accurate calculation
    const queryStartTime = Date.now();
    
    setIsGenerating(true);
    setGenerationStartTime(queryStartTime);
    setElapsedTime(0);
    setLastResponseTime(null);
    setError(null);
    
    const tempChat = { 
      query, 
      response: '...', 
      reasoning: '',
      bounding_boxes: [],
      timestamp: new Date().toISOString()
    };
    
    setChatHistory(prev => [...prev, tempChat]);
    
    const { category, transformed_query } = await getCategory(query,currentImageUrl);
    
    const trimmedCategory = category.trim();
    const trimmedTransformedQuery = transformed_query.trim();

    const to_stream = trimmedCategory !== "vqa_numeric" && trimmedCategory !== "grounding";
    
    if (to_stream) {
      let eventSource = null;
      try {
        eventSource = generateCompletionStream(currentChatId, query, trimmedCategory);
        let reasoning = '';
        let solution = '';
        let reasoningStartTime = null;
        let reasoningEndTime = null;
        let completed = false;
        
        eventSource.addEventListener('reasoning', (event) => {
          const data = JSON.parse(event.data);
          reasoning += data;
          if (!reasoningStartTime) {
            reasoningStartTime = Date.now();
          }
          setChatHistory(prev => {
            const newHistory = [...prev];
            newHistory[newHistory.length - 1] = {
              ...newHistory[newHistory.length - 1],
              reasoning: reasoning,
              isStreaming: true
            };
            return newHistory;
          });
        });
        
        eventSource.addEventListener('solution', (event) => {
          const data = JSON.parse(event.data);
          solution += data;
          if (!reasoningEndTime && reasoning && reasoningStartTime) {
            reasoningEndTime = ((Date.now() - reasoningStartTime) / 1000).toFixed(1);
          }
          setChatHistory(prev => {
            const newHistory = [...prev];
            newHistory[newHistory.length - 1] = {
              ...newHistory[newHistory.length - 1],
              response: solution,
              reasoning_time: reasoningEndTime,
              isStreaming: true
            };
            return newHistory;
          });
        });
        
        eventSource.addEventListener('end', async (event) => {
          if (completed) return;
          completed = true;
          
          const data = JSON.parse(event.data);
          const responseTime = ((Date.now() - queryStartTime) / 1000).toFixed(1);
          const currentReasoningTime = reasoningEndTime || (reasoning && reasoningStartTime ? ((Date.now() - reasoningStartTime) / 1000).toFixed(1) : null);
          
          setLastResponseTime(responseTime);
          
          const messageIndex = chatHistory.length;
          
          setChatHistory(prev => {
            const newHistory = [...prev];
            const idx = newHistory.length - 1; 
            newHistory[idx] = {
              query,
              reasoning: reasoning.trim(),
              response: solution.trim() || 'No response received',
              bounding_boxes: data.bounding_boxes || [],
              response_time: responseTime,
              reasoning_time: currentReasoningTime,
              isStreaming: false,
              timestamp: new Date().toISOString()
            };
            return newHistory;
          });
          
          try {
            console.log('Saving times:', { 
              chatId: currentChatId, 
              messageIndex, 
              responseTime, 
              currentReasoningTime 
            });
            const result = await updateChatTimes(currentChatId, messageIndex, responseTime, currentReasoningTime);
            console.log('Times saved successfully:', result.data);
          } catch (error) {
            console.error('Failed to save times:', error.response?.data || error.message);
          }
          
          eventSource.close();
          setIsGenerating(false);
          setGenerationStartTime(null);
        });
        
        eventSource.addEventListener('error', (event) => {
          if (completed) return; 
          completed = true;
          
          console.error('Streaming error:', event);
          eventSource.close();
          setChatHistory(prev => prev.slice(0, -1));
          setError('Failed to generate response. Please try again.');
          setIsGenerating(false);
          setGenerationStartTime(null);
        });
      } catch (error) {
        console.error('Failed to start streaming:', error);
        if (eventSource) eventSource.close();
        setChatHistory(prev => prev.slice(0, -1));
        setError('Failed to generate response. Please try again.');
        setIsGenerating(false);
        setGenerationStartTime(null);
      }
    } else {
      try {
        const response = await generateCompletion(currentChatId, query, trimmedCategory, trimmedTransformedQuery);
        const responseTime = ((Date.now() - queryStartTime) / 1000).toFixed(1);
        setLastResponseTime(responseTime);
        const messageIndex = chatHistory.length;
        
        setChatHistory(prev => {
          const newHistory = [...prev];
          const idx = newHistory.length - 1; 
          newHistory[idx] = {
            query,
            response: response.data.response || 'No response received',
            bounding_boxes: response.data.bounding_boxes || [],
            response_time: responseTime,
            isStreaming: false,
            timestamp: new Date().toISOString()
          };
          return newHistory;
        });
        
        try {
          console.log('Saving grounding time:', { messageIndex, responseTime });
          const result = await updateChatTimes(currentChatId, messageIndex, responseTime, null);
          console.log('Grounding time saved successfully:', result.data);
        } catch (error) {
          console.error('Failed to save times:', error.response?.data || error.message);
        }
      } catch (error) {
        console.error('Failed to generate response:', error);
        setChatHistory(prev => prev.slice(0, -1));
        setError('Failed to generate response. Please try again.');
      }
      setIsGenerating(false);
      setGenerationStartTime(null);
    }
  };

  const handleChatSelect = async (chatId) => {
    try {
      setError(null);
      const response = await getChatById(chatId);
      setCurrentChatId(chatId);
      setCurrentImageUrl(response.data.image_url || null);
      setCurrentChatTitle(response.data.chat?.description || 'Untitled Chat');
      setChatHistory(response.data.chat && response.data.chat.chats ? response.data.chat.chats : []);
      setCurrentShareInfo({
        shareToken: response.data.chat?.shareToken || null,
        sharePermission: response.data.chat?.sharePermission || 'none'
      });
      setShowLoginPrompt(false);
      navigate(`/chat/${chatId}`, { replace: true });
    } catch (error) {
      console.error('Failed to load chat:', error);
      setError('Failed to load chat. Please try again.');
    }
  };

  const handleNewChat = (e) => {
    if (e?.ctrlKey || e?.metaKey) {
      window.open('/chat', '_blank');
    } else {
      setCurrentChatId(null);
      setCurrentImageUrl(null);
      setCurrentChatTitle('');
      setChatHistory([]);
      setShowLoginPrompt(false);
      setError(null);
      navigate('/chat', { replace: true });
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
      setError('Logout failed. Please try again.');
    }
  };

  const handleShareClick = () => {
    if (!currentChatId) return;
    setShowShareModal(true);
  };

  const handleShare = async (chatId, permission) => {
    try {
      const response = await shareChat(chatId, permission);
      setCurrentShareInfo({
        shareToken: response.data.shareToken,
        sharePermission: permission
      });
      return response.data.shareUrl;
    } catch (error) {
      console.error('Failed to share chat:', error);
      setError('Failed to generate share link. Please try again.');
      throw error;
    }
  };

  const handleRevokeShare = async (chatId) => {
    try {
      await revokeShare(chatId);
      setCurrentShareInfo({ shareToken: null, sharePermission: 'none' });
      setShowShareModal(false);
    } catch (error) {
      console.error('Failed to revoke share:', error);
      setError('Failed to revoke access. Please try again.');
      throw error;
    }
  };

  const handleLoginClick = () => {
    navigate('/');
  };

  const handleRenameClick = (chatId, currentDescription) => {
    setRenamingChatId(chatId);
    setRenameValue(currentDescription || '');
    setOpenMenuChatId(null);
  };

  const handleRenameSubmit = async (chatId) => {
    if (!renameValue.trim()) {
      setError('Chat name cannot be empty');
      return;
    }
    
    try {
      setError(null);
      await renameChat(chatId, renameValue.trim());
      setAllChats(prev => prev.map(chat => 
        chat._id === chatId ? { ...chat, description: renameValue.trim() } : chat
      ));
      setRenamingChatId(null);
      setRenameValue('');
    } catch (error) {
      console.error('Failed to rename chat:', error);
      setError('Failed to rename chat. Please try again.');
    }
  };

  const handleDeleteClick = async (chatId) => {
    if (!window.confirm('Are you sure you want to delete this chat?')) {
      return;
    }

    try {
      setError(null);
      await deleteChat(chatId);
      setAllChats(prev => prev.filter(chat => chat._id !== chatId));
      if (currentChatId === chatId) {
        handleNewChat();
      }
      setOpenMenuChatId(null);
    } catch (error) {
      console.error('Failed to delete chat:', error);
      setError('Failed to delete chat. Please try again.');
    }
  };

  const handleMenuToggle = (chatId) => {
    setOpenMenuChatId(openMenuChatId === chatId ? null : chatId);
  };

  const handleMenuOpen = (chatId, targetEl) => {
    const rect = targetEl.getBoundingClientRect();
    setMenuAnchorRect(rect);
    const spaceBelow = window.innerHeight - rect.bottom;
    const estimatedMenuHeight = 96; 
    setMenuPlacement(spaceBelow < estimatedMenuHeight + 16 ? 'up' : 'down');
    setOpenMenuChatId(chatId);
  };

  const handleMenuClose = () => {
    setOpenMenuChatId(null);
    setMenuAnchorRect(null);
  };

  const filteredChats = allChats.filter(chat => {
    const description = chat.description || '';
    return description.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
    setIsHoveringLogo(false); 
  };

  const bgColor = theme === "dark" ? "bg-neutral-900" : "bg-gray-100";
  const sidebarBg = theme === "dark" ? "bg-neutral-800" : "bg-white";
  const textColor = theme === "dark" ? "text-slate-200" : "text-gray-800";
  const secondaryTextColor = theme === "dark" ? "text-slate-400" : "text-gray-600";
  const activeChatBg = theme === "dark" ? "bg-slate-700/60 border-l-2 border-slate-500" : "bg-slate-100 border-l-2 border-slate-400";
  const hoverChatBg = theme === "dark" ? "hover:bg-slate-700/40" : "hover:bg-slate-50";
  const borderColor = theme === "dark" ? "border-slate-600" : "border-gray-300";
  const searchBg = theme === "dark" ? "bg-neutral-800" : "bg-gray-50";

  const handleImageError = (e) => {
    e.target.style.display = 'none';
    const nextSibling = e.target.nextSibling;
    if (nextSibling && nextSibling.style) {
      nextSibling.style.display = 'block';
    }
  };

  return (
    <div className={`w-screen h-screen relative ${bgColor} overflow-hidden flex`}>
      {showLoginPrompt && !isAuthenticated && (
        <LoginPromptBanner 
          onLoginClick={handleLoginClick} 
          onDismiss={() => setShowLoginPrompt(false)} 
        />
      )}

      <ErrorBanner error={error} onDismiss={() => setError(null)} />

      <Sidebar
        sidebarCollapsed={sidebarCollapsed}
        sidebarWidth={sidebarWidth}
        isResizing={isResizing}
        isHoveringLogo={isHoveringLogo}
        setIsHoveringLogo={setIsHoveringLogo}
        currentChatId={currentChatId}
        filteredChats={filteredChats}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        openMenuChatId={openMenuChatId}
        renamingChatId={renamingChatId}
        setRenamingChatId={setRenamingChatId}
        renameValue={renameValue}
        setRenameValue={setRenameValue}
        showUserMenu={showUserMenu}
        setShowUserMenu={setShowUserMenu}
        isAuthenticated={isAuthenticated}
        user={user}
        toggleSidebar={toggleSidebar}
        toggleTheme={toggleTheme}
        handleNewChat={handleNewChat}
        handleChatSelect={handleChatSelect}
        handleRenameSubmit={handleRenameSubmit}
        handleMenuOpen={handleMenuOpen}
        handleLogout={handleLogout}
        handleMouseDown={handleMouseDown}
        handleImageError={handleImageError}
        theme={theme}
        sidebarBg={sidebarBg}
        textColor={textColor}
        secondaryTextColor={secondaryTextColor}
        borderColor={borderColor}
        searchBg={searchBg}
        activeChatBg={activeChatBg}
        hoverChatBg={hoverChatBg}
      />

      <div 
        className="flex-1 flex flex-col min-h-0 overflow-hidden transition-all duration-300"
        style={{ 
          marginTop: (showLoginPrompt && !isAuthenticated) ? '3rem' : '0'
        }}
      >
        {!currentChatId ? (
          <WelcomeScreen
            isUploading={isUploading}
            onImageUpload={handleImageUpload}
            theme={theme}
            textColor={textColor}
            secondaryTextColor={secondaryTextColor}
          />
        ) : (
          <div className="flex-1 min-h-0 overflow-hidden">
            <ChatWindow 
              chatId={currentChatId} 
              imageUrl={currentImageUrl}
              chatTitle={currentChatTitle}
              chatHistory={chatHistory} 
              onSendMessage={handleSendMessage} 
              isGenerating={isGenerating}
              elapsedTime={elapsedTime}
              lastResponseTime={lastResponseTime}
              onShareClick={handleShareClick}
              theme={theme} 
            />
          </div>
        )}

        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          chatId={currentChatId}
          onShare={handleShare}
          onRevoke={handleRevokeShare}
          initialShareInfo={currentShareInfo}
          theme={theme}
        />

        <ChatMenuPortal
          openMenuChatId={openMenuChatId}
          menuAnchorRect={menuAnchorRect}
          menuPlacement={menuPlacement}
          allChats={allChats}
          onMenuClose={handleMenuClose}
          onRenameClick={handleRenameClick}
          onDeleteClick={handleDeleteClick}
          theme={theme}
          textColor={textColor}
        />
      </div>
    </div>
  );
}
