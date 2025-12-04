import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// User APIs
export const signup = (email, password) => api.post('/user/signup', { email, password });
export const login = (email, password) => api.post('/user/login', { email, password });
export const adminLogin = (email, password) => api.post('/admin/login', { email, password });
export const logout = () => api.get('/user/logout');
export const getMe = () => api.get('/user/me');

// Chat APIs
export const createChat = (imageFile) => {
  const formData = new FormData();
  formData.append('image', imageFile);
  return api.post('/chat', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const getChatById = (chatId) => api.get(`/chat/${chatId}`);
export const getChatSidebar = () => api.get('/chat/sidebar');
export const describeChat = (chatId) => api.get(`/chat/describe/${chatId}`);
export const generateCompletion = (chatId, query, category, transformed_query) => 
  api.get('/chat/completion', { params: { chat_id: chatId, query, category, transformed_query } });

// Streaming completion - returns EventSource for SSE
export const generateCompletionStream = (chatId, query, category = null) => {
  const params = new URLSearchParams({ 
    chat_id: chatId, 
    query 
  });
  if (category) {
    params.append('category', category);
  }
  const url = `${API_BASE_URL}/chat/completion_stream?${params.toString()}`;
  return new EventSource(url, { withCredentials: true });
};

export const renameChat = (chatId, description) => 
  api.put(`/chat/rename/${chatId}`, { description });
export const deleteChat = (chatId) => api.delete(`/chat/${chatId}`);
export const updateChatTimes = (chatId, messageIndex, responseTime, reasoningTime) =>
  api.put(`/chat/update-times/${chatId}`, { 
    message_index: messageIndex, 
    response_time: responseTime, 
    reasoning_time: reasoningTime 
  });

// Share Chat APIs
export const shareChat = (chatId, permission) => 
  api.post(`/chat/share/${chatId}`, { permission });
export const revokeShare = (chatId) => api.delete(`/chat/share/${chatId}`);
export const getSharedChat = (token) => api.get(`/chat/shared/${token}`);
export const addMessageToSharedChat = (token, query) => 
  api.post(`/chat/shared/${token}/message`, { query });

// Admin APIs
export const getUsers = () => api.get('/admin/get-users');
export const createUser = (email) => api.post('/admin/create-user', { email });
export const updateRole = (email, role) => api.patch('/admin/update-role', { email, role });
export const updateWhitelist = (email, isWhitelisted) => api.patch('/admin/update-whitelist', { email, isWhitelisted });
export const deleteUser = (email) => api.delete('/admin/delete-user', { data: { email } });

export default api;
