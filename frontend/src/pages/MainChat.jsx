import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import { LuPanelRightOpen } from "react-icons/lu";
import { MdOutlineDarkMode, MdEdit, MdDelete, MdAdminPanelSettings } from "react-icons/md";
import { CiCirclePlus, CiLight } from "react-icons/ci";
import { IoIosSearch } from "react-icons/io";
import { GoSidebarCollapse } from "react-icons/go";
import { FiLogOut } from "react-icons/fi";
import { BsThreeDotsVertical } from "react-icons/bs";
import { useAuth } from "../context/AuthContext";
import ImageUpload from "../components/ImageUpload";
import ChatWindow from "../components/ChatWindow";
import ShareModal from "../components/ShareModal";
import api, { createChat, getChatById, getChatSidebar, describeChat, generateCompletion, generateCompletionStream, renameChat, deleteChat, shareChat, revokeShare, updateChatTimes } from "../services/api";
import axios from "axios";

export default function MainChat() {
  const [theme, setTheme] = useState("dark");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(260); // Default to min-width (260px)
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
  
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  const { chatId: urlChatId } = useParams();

  // Load chat from URL on mount
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

  // Timer for tracking generation time
  useEffect(() => {
    if (isGenerating && generationStartTime) {
      const interval = setInterval(() => {
        setElapsedTime(((Date.now() - generationStartTime) / 1000).toFixed(0));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isGenerating, generationStartTime]);

  useEffect(() => {
    // Close menus when clicking outside
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

  // Sidebar resize handlers
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      
      const newWidth = e.clientX;
      // Min width: 300px (ensures logo + "AstraVLM" + collapse button fit), Max width: 450px
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
      setCurrentChatTitle('Untitled Chat'); // Set initial title
      setChatHistory(chatResponse.data.chat && chatResponse.data.chat.chats ? chatResponse.data.chat.chats : []);
      
      // Update URL to reflect the new chat
      navigate(`/chat/${chatId}`, { replace: true });
      
      if (isAuthenticated) {
        // Load sidebar immediately with the new chat
        loadUserChats();
        
        // Generate description in background and update when ready
        try {
          const descResponse = await describeChat(chatId);
          // Update the current chat title with the generated description
          if (descResponse?.data?.description) {
            setCurrentChatTitle(descResponse.data.description);
          }
          // Reload the sidebar to update the chat title
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

  // Helper to detect if query is a grounding task
  const getCategory = async (query,image_url) => {
    return (await api.post('/classify', { query,image_url })).data;
  };

  const handleSendMessage = async (query) => {
    if (!currentChatId || !query.trim()) return;
    
    setIsGenerating(true);
    setGenerationStartTime(Date.now());
    setElapsedTime(0);
    setLastResponseTime(null);
    setError(null);
    
    // Add query to chat history IMMEDIATELY for instant display
    const tempChat = { 
      query, 
      response: '...', 
      reasoning: '',
      bounding_boxes: [],
      timestamp: new Date().toISOString()
    };
    
    setChatHistory(prev => [...prev, tempChat]);
    
    // Then get category (this takes time)
    const { category, transformed_query } = await getCategory(query,currentImageUrl);
    
    const trimmedCategory = category.trim();
    const trimmedTransformedQuery = transformed_query.trim();

    const to_stream = trimmedCategory !== "vqa_numeric" && trimmedCategory !== "grounding";
    
    // Use streaming for non-grounding tasks (captioning, VQA, etc.)
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
          // Capture start time on first reasoning chunk
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
          // Capture reasoning time when solution starts (only reasoning duration)
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
          const responseTime = generationStartTime 
            ? ((Date.now() - generationStartTime) / 1000).toFixed(1) 
            : data.response_time;
          const currentReasoningTime = reasoningEndTime || (reasoning && reasoningStartTime ? ((Date.now() - reasoningStartTime) / 1000).toFixed(1) : null);
          
          setLastResponseTime(responseTime);
          
          // Calculate the message index BEFORE updating state
          const messageIndex = chatHistory.length;
          
          setChatHistory(prev => {
            const newHistory = [...prev];
            const idx = newHistory.length - 1; // This is the temp message we added
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
          
          // Save times to backend (use the calculated index)
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
          if (completed) return; // Already handled completion
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
      // Use regular completion for grounding tasks
      try {
        const response = await generateCompletion(currentChatId, query, trimmedCategory, trimmedTransformedQuery);
        const responseTime = response.data.response_time || null;
        setLastResponseTime(responseTime);
        // Calculate the message index BEFORE updating state
        const messageIndex = chatHistory.length;
        
        setChatHistory(prev => {
          const newHistory = [...prev];
          const idx = newHistory.length - 1; // This is the temp message we added
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
        
        // Save time to backend (use the calculated index)
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
      setShowLoginPrompt(false);
      // Update URL to include chatId
      navigate(`/chat/${chatId}`, { replace: true });
    } catch (error) {
      console.error('Failed to load chat:', error);
      setError('Failed to load chat. Please try again.');
    }
  };

  const handleNewChat = (e) => {
    if (e?.ctrlKey || e?.metaKey) {
      // Ctrl/Cmd + Click: open in new tab
      window.open('/chat', '_blank');
    } else {
      // Normal click: navigate in same tab
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
    const estimatedMenuHeight = 96; // approx 2 items
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
    setIsHoveringLogo(false); // Reset hover state when toggling
  };

  // Theme styling variables
  const bgColor = theme === "dark" ? "bg-neutral-900" : "bg-gray-100";
  const sidebarBg = theme === "dark" ? "bg-neutral-800" : "bg-white";
  const textColor = theme === "dark" ? "text-slate-200" : "text-gray-800";
  const secondaryTextColor = theme === "dark" ? "text-slate-400" : "text-gray-600";
  const activeChatBg = theme === "dark" ? "bg-slate-700/60 border-l-2 border-slate-500" : "bg-slate-100 border-l-2 border-slate-400";
  const hoverChatBg = theme === "dark" ? "hover:bg-slate-700/40" : "hover:bg-slate-50";
  const borderColor = theme === "dark" ? "border-slate-600" : "border-gray-300";
  const searchBg = theme === "dark" ? "bg-neutral-800" : "bg-gray-50";

  // Safe image error handler
  const handleImageError = (e) => {
    e.target.style.display = 'none';
    const nextSibling = e.target.nextSibling;
    if (nextSibling && nextSibling.style) {
      nextSibling.style.display = 'block';
    }
  };

  return (
    <div className={`w-screen h-screen relative ${bgColor} overflow-hidden flex`}>
      {/* Login Prompt Banner */}
      {showLoginPrompt && !isAuthenticated && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-yellow-600 text-white py-3 px-4 flex justify-between items-center">
          <span className="text-sm font-medium">
            ⚠️ You are using guest mode. Your chat will be lost unless you login to save it.
          </span>
          <div className="flex gap-3">
            <button 
              onClick={handleLoginClick} 
              className="px-4 py-1 bg-white text-yellow-600 rounded hover:bg-gray-100 text-sm font-semibold transition-colors"
            >
              Login to Save
            </button>
            <button 
              onClick={() => setShowLoginPrompt(false)} 
              className="px-4 py-1 border border-white rounded hover:bg-yellow-700 text-sm transition-colors"
            >
              Continue as Guest
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="absolute top-0 left-0 right-0 z-40 bg-red-600 text-white py-2 px-4 text-center">
          <span className="text-sm">{error}</span>
          <button 
            onClick={() => setError(null)} 
            className="ml-4 text-sm underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Sidebar */}
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
          // Expand if collapsed - buttons will stopPropagation
          if (sidebarCollapsed) {
            toggleSidebar();
          }
        }}
      >
        {/* Resize Handle - Subtle drag line */}
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
        {/* Header */}
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

        {/* Navigation Items */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-2 space-y-2">
            {/* Theme Toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleTheme();
              }}
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center p-3' : 'justify-start gap-3 p-3'} ${sidebarCollapsed ? 'rounded-full' : 'rounded-lg'} transition-all duration-200 cursor-pointer min-w-0 ${
                theme === 'dark' ? 'bg-slate-600 hover:bg-slate-700 border border-slate-500' : 'bg-slate-700 hover:bg-slate-800 border border-slate-600'
              }`}
            >
              {theme === "dark" ? (
                <CiLight className={`${theme === 'dark' ? 'text-slate-200' : 'text-white'} text-xl flex-shrink-0`} />
              ) : (
                <MdOutlineDarkMode className={`${theme === 'dark' ? 'text-slate-200' : 'text-white'} text-xl flex-shrink-0`} />
              )}
              {!sidebarCollapsed && (
                <span className={`${theme === 'dark' ? 'text-slate-200' : 'text-white'} font-medium text-sm truncate`}>
                  {theme === "dark" ? "Light Mode" : "Dark Mode"}
                </span>
              )}
            </button>

            {/* New Chat */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNewChat(e);
              }}
              title="Start a New Chat"
              className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center p-3' : 'justify-start gap-3 p-3'} ${sidebarCollapsed ? 'rounded-full' : 'rounded-lg'} transition-all duration-200 cursor-pointer min-w-0 ${
                theme === 'dark' ? 'bg-slate-700/50 hover:bg-slate-700/70 border border-slate-600/50' : 'bg-slate-100 hover:bg-slate-200 border border-slate-300'
              }`}
            >
              <CiCirclePlus className={`${secondaryTextColor} text-xl flex-shrink-0`} />
              {!sidebarCollapsed && (
                <span className={`${secondaryTextColor} font-medium text-sm truncate`}>New Chat</span>
              )}
            </button>
          </div>

          {/* Search and Chat List - Only for authenticated users */}
          {isAuthenticated && !sidebarCollapsed && (
            <div className="flex-1 flex flex-col min-h-0 mt-1">
              {/* Search */}
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

              {/* Chat List */}
  <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                <div className="px-2 pb-1 flex-shrink-0">
                  <div className={`${secondaryTextColor} text-xs font-semibold uppercase tracking-wider px-2`}>
                    Chats
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-2 pb-2 min-h-0 custom-scrollbar">
                  {filteredChats.length > 0 ? (
                    filteredChats.map((chat, index) => {
                      const chatId = chat._id || chat.id;
                      const isRenaming = renamingChatId === chatId;
                      const isMenuOpen = openMenuChatId === chatId;
                      const isLastItems = index >= filteredChats.length - 3; // Last 3 items
                      
                      return (
                        <div
                          key={chatId}
                          data-chat-item
                          className={`relative w-full rounded-lg mb-1 transition-colors group ${
                            currentChatId === chatId 
                              ? activeChatBg 
                              : ''
                          } ${currentChatId !== chatId ? hoverChatBg : ''}`}
                        >
                          {isRenaming ? (
                            <div className="p-3">
                              <input
                                type="text"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    handleRenameSubmit(chatId);
                                  } else if (e.key === 'Escape') {
                                    setRenamingChatId(null);
                                    setRenameValue('');
                                  }
                                }}
                                onBlur={() => handleRenameSubmit(chatId)}
                                autoFocus
                                className={`w-full px-2 py-1 text-sm ${textColor} bg-transparent border ${borderColor} rounded focus:outline-none`}
                              />
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={(e) => {
                                  if (!isMenuOpen) {
                                    if (e.ctrlKey || e.metaKey) {
                                      window.open(`/chat/${chatId}`, '_blank');
                                    } else {
                                      handleChatSelect(chatId);
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
                              
                              {/* Three Dot Menu */}
                              <div 
                                className={`absolute right-2 top-1/2 -translate-y-1/2 chat-menu-container ${
                                  isMenuOpen ? 'z-[60]' : 'z-10'
                                }`}
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMenuOpen(chatId, e.currentTarget);
                                  }}
                                  title="Chat Options"
                                  className={`menu-trigger p-1.5 cursor-pointer transition-opacity ${
                                    isMenuOpen ? 'menu-open' : ''
                                  }`}
                                >
                                  <BsThreeDotsVertical className={`${textColor} text-base`} />
                                </button>
                                
                                {/* Dropdown Menu */}
                                {false}
                              </div>
                            </>
                          )}
                        </div>
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
          )}
        </div>

        {/* Footer - User Menu */}
        <div className="flex-shrink-0 pt-2 px-2 pb-2 border-t border-gray-200 dark:border-gray-700">
          {isAuthenticated ? (
            <div className="relative user-menu-container" style={{ marginLeft: '-6px' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUserMenu(!showUserMenu);
                }}
                title="Account Settings"
                className={`${sidebarCollapsed ? 'w-9 h-9 p-0 mr-auto ml-1' : 'w-full p-2'} flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-start gap-3'} rounded-full ${hoverChatBg} transition-all duration-200 cursor-pointer`}
              >
                {/* User Avatar */}
                <div className={`${sidebarCollapsed ? 'h-9 w-9 text-sm' : 'h-8 w-8'} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 transition-all duration-300 ${
                  theme === "dark" ? "bg-blue-600" : "bg-blue-500"
                }`}>
                  {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
                </div>
                {!sidebarCollapsed && (
                  <div className="flex-1 text-left overflow-hidden">
                    <div className={`${textColor} text-sm font-medium truncate`}>
                      {user?.email ? user.email.split('@')[0] : 'User'}
                    </div>
                  </div>
                )}
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div 
                  className={`fixed w-48 rounded-lg shadow-xl overflow-hidden z-[100] ${
                    theme === "dark" ? "bg-neutral-700" : "bg-white"
                  }`}
                  style={{
                    bottom: '72px',
                    left: sidebarCollapsed ? '68px' : '8px',
                    border: theme === "dark" ? "1px solid #404040" : "1px solid #e5e7eb",
                    boxShadow: theme === "dark" 
                      ? "0 10px 25px rgba(0, 0, 0, 0.5)" 
                      : "0 10px 25px rgba(0, 0, 0, 0.15)"
                  }}
                >
                  {/* Admin Dashboard - only show for role === 2 */}
                  {user?.role === 2 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowUserMenu(false);
                        navigate('/admin/dashboard');
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm ${textColor} transition-colors cursor-pointer ${
                        theme === "dark" ? "hover:bg-neutral-600" : "hover:bg-gray-100"
                      }`}
                    >
                      <MdAdminPanelSettings className="text-amber-500 text-base" />
                      <span>Admin Dashboard</span>
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLogout();
                      setShowUserMenu(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 transition-colors cursor-pointer ${
                      theme === "dark" ? "hover:bg-neutral-600" : "hover:bg-gray-100"
                    }`}
                  >
                    <FiLogOut className="text-base" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Guest Mode - Show Login/Signup buttons */
            <div className={`space-y-2 ${sidebarCollapsed ? 'px-2' : 'px-2'}`}>
              <button
                onClick={() => navigate('/')}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-start gap-3'} p-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer`}
              >
                {!sidebarCollapsed && (
                  <span className="text-white text-sm font-medium">Login</span>
                )}
                {sidebarCollapsed && (
                  <span className="text-white text-sm font-medium">L</span>
                )}
              </button>
              <button
                onClick={() => navigate('/signup')}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-start gap-3'} p-2 rounded-lg ${hoverChatBg} border ${borderColor} transition-colors cursor-pointer`}
              >
                {!sidebarCollapsed && (
                  <span className={`${textColor} text-sm font-medium`}>Sign Up</span>
                )}
                {sidebarCollapsed && (
                  <span className={`${textColor} text-sm font-medium`}>S</span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div 
        className="flex-1 flex flex-col min-h-0 overflow-hidden transition-all duration-300"
        style={{ 
          marginTop: (showLoginPrompt && !isAuthenticated) ? '3rem' : '0'
        }}
      >
        {!currentChatId ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="flex flex-col items-center gap-8 max-w-4xl text-center">
              <div className="space-y-4">
                <h1 className={`${textColor} text-5xl md:text-6xl font-extrabold leading-tight`}>
                  {isUploading ? "Uploading Image..." : "Upload a Remote Sensing Image"}
                </h1>
                <p className={`${secondaryTextColor} text-2xl md:text-3xl font-medium`}>
                  to start a new chat
                </p>
              </div>
              {!isUploading && (
                <ImageUpload onImageSelect={handleImageUpload} theme={theme} />
              )}
              {isUploading && (
                <div className={`${textColor} text-lg`}>Processing your image...</div>
              )}
            </div>
          </div>
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

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        chatId={currentChatId}
        onShare={handleShare}
        onRevoke={handleRevokeShare}
        theme={theme}
      />

      {/* Three-dot menu rendered via portal */}
      {openMenuChatId && menuAnchorRect && createPortal(
        (() => {
          const menuWidth = 176; // w-44
          const estimatedMenuHeight = 96; // ~2 items
          // Base position to the right of trigger with small gap
          const baseLeft = Math.min(menuAnchorRect.right + 8, window.innerWidth - menuWidth - 8);
          // Shift the entire dropdown 25% of its width to the left, clamped to viewport with 8px padding
          const shift = menuWidth * 0.25;
          const safeLeft = Math.max(8, Math.min(window.innerWidth - menuWidth - 8, baseLeft - shift));
          const top = menuPlacement === 'down'
            ? Math.min(menuAnchorRect.bottom + 8, window.innerHeight - estimatedMenuHeight - 8)
            : Math.max(menuAnchorRect.top - estimatedMenuHeight - 8, 8);
          const border = theme === 'dark' ? '1px solid #404040' : '1px solid #e5e7eb';
          const shadow = theme === 'dark' ? '0 10px 25px rgba(0, 0, 0, 0.5)' : '0 10px 25px rgba(0, 0, 0, 0.15)';
          const activeChat = allChats.find(c => (c._id || c.id) === openMenuChatId);
          return (
            <>
              {/* Backdrop to capture outside clicks */}
              <div className="fixed inset-0 z-[999]" onClick={handleMenuClose} />
              <div
                className={`fixed w-44 rounded-lg shadow-xl z-[1000] chat-menu-portal ${theme === 'dark' ? 'bg-neutral-700' : 'bg-white'}`}
                style={{ top, left: safeLeft, border, boxShadow: shadow }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRenameClick(openMenuChatId, activeChat?.description);
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
                    handleDeleteClick(openMenuChatId);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 transition-colors cursor-pointer ${
                    theme === 'dark' ? 'hover:bg-neutral-600' : 'hover:bg-gray-100'
                  }`}
                >
                  <MdDelete className="text-base" />
                  <span>Delete</span>
                </button>
              </div>
            </>
          );
        })(),
        document.body
      )}
      </div>
    </div>
  );
}
