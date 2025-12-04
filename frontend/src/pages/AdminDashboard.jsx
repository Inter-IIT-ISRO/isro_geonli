import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdArrowBack, MdAdd, MdEdit, MdDelete, MdPerson, MdAdminPanelSettings, MdCheckCircle, MdCancel, MdFilterList, MdKeyboardArrowDown } from 'react-icons/md';
import { getUsers, createUser, updateRole, updateWhitelist, deleteUser } from '../services/api';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all'); 
  const [filterWhitelist, setFilterWhitelist] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  const navigate = useNavigate();
  const theme = 'dark'; 
  const usersPerPage = 10;

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (error || successMessage) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, successMessage]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getUsers();
      setUsers(response.data || []);
    } catch (error) {
      console.error('Failed to load users:', error);
      setError(error.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    
    if (!newUserEmail.trim()) {
      setError('Email is required');
      return;
    }

    try {
      setIsCreating(true);
      setError(null);
      await createUser(newUserEmail.trim());
      setSuccessMessage(`Email "${newUserEmail}" added to whitelist. User can now sign up!`);
      setShowCreateModal(false);
      setNewUserEmail('');
      loadUsers();
    } catch (error) {
      console.error('Failed to add user:', error);
      setError(error.response?.data?.message || 'Failed to add user');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleRole = async (email, currentRole) => {
    const newRole = currentRole === 1 ? 2 : 1;
    
    try {
      setError(null);
      await updateRole(email, newRole);
      setSuccessMessage(`User role updated to ${newRole === 2 ? 'Admin' : 'User'}`);
      setUsers(prev => prev.map(u => 
        u.email === email ? { ...u, role: newRole } : u
      ));
    } catch (error) {
      console.error('Failed to update role:', error);
      setError(error.response?.data?.message || 'Failed to update role');
    }
  };

  const handleToggleWhitelist = async (email, currentWhitelist) => {
    const newWhitelist = !currentWhitelist;
    
    try {
      setError(null);
      await updateWhitelist(email, newWhitelist);
      setSuccessMessage(`User ${newWhitelist ? 'added to' : 'removed from'} whitelist`);
      setUsers(prev => prev.map(u => 
        u.email === email ? { ...u, isWhitelisted: newWhitelist } : u
      ));
    } catch (error) {
      console.error('Failed to update whitelist:', error);
      setError(error.response?.data?.message || 'Failed to update whitelist');
    }
  };

  const handleDeleteUser = async (email) => {
    if (!window.confirm(`Are you sure you want to delete user "${email}"?`)) {
      return;
    }

    try {
      setError(null);
      await deleteUser(email);
      setSuccessMessage(`User "${email}" deleted successfully`);
      setUsers(prev => prev.filter(u => u.email !== email));
    } catch (error) {
      console.error('Failed to delete user:', error);
      setError(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === parseInt(filterRole);
    const matchesWhitelist = filterWhitelist === 'all' || user.isWhitelisted.toString() === filterWhitelist;
    return matchesSearch && matchesRole && matchesWhitelist;
  });

  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + usersPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterRole, filterWhitelist]);

  const bgColor = theme === "dark" ? "bg-neutral-900" : "bg-gray-100";
  const cardBg = theme === "dark" ? "bg-neutral-800" : "bg-white";
  const textColor = theme === "dark" ? "text-slate-200" : "text-gray-800";
  const secondaryTextColor = theme === "dark" ? "text-slate-400" : "text-gray-600";
  const borderColor = theme === "dark" ? "border-slate-600" : "border-gray-300";
  const inputBg = theme === "dark" ? "bg-neutral-700" : "bg-gray-50";
  const hoverBg = theme === "dark" ? "hover:bg-neutral-700" : "hover:bg-gray-50";

  return (
    <div className={`min-h-screen ${bgColor} ${textColor} p-8`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/chat')}
            className={`p-3 rounded-lg ${hoverBg} transition-all cursor-pointer shadow-sm hover:shadow-md active:scale-95`}
            title="Back to Chat"
          >
            <MdArrowBack className="text-2xl" />
          </button>
          <div>
            <h1 className="text-4xl font-bold">Admin Dashboard</h1>
            <p className={`${secondaryTextColor} text-lg mt-1`}>Manage users and permissions</p>
          </div>
        </div>

        {error && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-600 text-white py-3 px-6 rounded-lg shadow-xl max-w-md">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-600 text-white py-3 px-6 rounded-lg shadow-xl max-w-md">
            {successMessage}
          </div>
        )}

        <div className={`${cardBg} rounded-lg shadow-lg p-6 mb-6`}>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[280px]">
              <input
                type="text"
                placeholder="🔍 Search by email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full px-4 py-2.5 ${inputBg} ${textColor} border ${borderColor} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm`}
              />
            </div>

            <div className="relative group">
              <div className={`absolute left-3 top-1/2 -translate-y-1/2 ${secondaryTextColor} text-lg pointer-events-none z-10 transition-colors group-hover:text-blue-500`}>
                <MdFilterList />
              </div>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className={`pl-10 pr-8 py-2.5 ${inputBg} ${textColor} border ${borderColor} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer transition-all duration-200 text-sm font-medium min-w-[150px] appearance-none shadow-sm hover:shadow-md`}
              >
                <option value="all">All Roles</option>
                <option value="1">Users Only</option>
                <option value="2">Admins Only</option>
              </select>
            </div>

            <div className="relative group">
              <div className={`absolute left-3 top-1/2 -translate-y-1/2 ${secondaryTextColor} text-lg pointer-events-none z-10 transition-colors group-hover:text-green-500`}>
                <MdFilterList />
              </div>
              <select
                value={filterWhitelist}
                onChange={(e) => setFilterWhitelist(e.target.value)}
                className={`pl-10 pr-8 py-2.5 ${inputBg} ${textColor} border ${borderColor} rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent cursor-pointer transition-all duration-200 text-sm font-medium min-w-[170px] appearance-none shadow-sm hover:shadow-md`}
              >
                <option value="all">All Status</option>
                <option value="true">Whitelisted</option>
                <option value="false">Not Whitelisted</option>
              </select>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg transition-all font-semibold cursor-pointer shadow-md hover:shadow-lg text-sm"
            >
              <MdAdd className="text-xl" />
              <span>Add to Whitelist</span>
            </button>
          </div>
        </div>

        <div className={`${cardBg} rounded-lg shadow-lg overflow-hidden`}>
          {loading ? (
            <div className="p-12 text-center">
              <div className={`${secondaryTextColor} text-lg`}>Loading users...</div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center">
              <div className={`${secondaryTextColor} text-lg`}>
                {searchQuery || filterRole !== 'all' || filterWhitelist !== 'all'
                  ? 'No users match the current filters'
                  : 'No users found'}
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
                <table className="w-full table-fixed">
                  <thead className={`${theme === 'dark' ? 'bg-neutral-700' : 'bg-gray-50'} sticky top-0 z-10`}>
                    <tr>
                      <th className={`w-[40%] px-6 py-4 text-left text-sm font-semibold ${textColor}`}>Email</th>
                      <th className={`w-[15%] px-6 py-4 text-center text-sm font-semibold ${textColor}`}>Role</th>
                      <th className={`w-[30%] px-6 py-4 text-center text-sm font-semibold ${textColor}`}>Whitelist</th>
                      <th className={`w-[15%] px-6 py-4 text-center text-sm font-semibold ${textColor}`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {paginatedUsers.map((user, index) => (
                      <tr key={user._id || index} className={hoverBg}>
                        <td className={`px-6 py-4 ${textColor}`}>
                          <div className="flex items-center gap-3">
                            {user.role === 2 ? (
                              <MdAdminPanelSettings className="text-purple-500 text-xl flex-shrink-0" />
                            ) : (
                              <MdPerson className="text-blue-500 text-xl flex-shrink-0" />
                            )}
                            <span className="font-medium truncate">{user.email}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center">
                            <button
                              onClick={() => handleToggleRole(user.email, user.role)}
                              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer min-w-[70px] shadow-sm hover:shadow-md active:scale-95 ${
                                user.role === 2
                                  ? 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white'
                                  : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white'
                              }`}
                            >
                              {user.role === 2 ? 'Admin' : 'User'}
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center">
                            <button
                              onClick={() => handleToggleWhitelist(user.email, user.isWhitelisted)}
                              className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer min-w-[150px] justify-center shadow-sm hover:shadow-md active:scale-95 ${
                                user.isWhitelisted
                                  ? 'bg-green-600 hover:bg-green-700 active:bg-green-800 text-white'
                                  : 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white'
                              }`}
                            >
                              {user.isWhitelisted ? (
                                <>
                                  <MdCheckCircle className="text-base flex-shrink-0" />
                                  <span>Whitelisted</span>
                                </>
                              ) : (
                                <>
                                  <MdCancel className="text-base flex-shrink-0" />
                                  <span>Not Whitelisted</span>
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center">
                            <button
                              onClick={() => handleDeleteUser(user.email)}
                              className="p-2.5 text-red-500 hover:bg-red-600 hover:text-white rounded-lg transition-all cursor-pointer shadow-sm hover:shadow-md active:scale-95"
                              title="Delete user"
                            >
                              <MdDelete className="text-xl" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className={`px-6 py-4 flex items-center justify-between border-t ${borderColor} bg-opacity-50`}>
                  <div className={`${secondaryTextColor} text-sm font-medium`}>
                    Showing {startIndex + 1} to {Math.min(startIndex + usersPerPage, filteredUsers.length)} of {filteredUsers.length} users
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className={`px-5 py-2 rounded-lg transition-all font-semibold text-sm shadow-sm hover:shadow-md active:scale-95 ${
                        currentPage === 1
                          ? `${secondaryTextColor} cursor-not-allowed opacity-50`
                          : `${textColor} ${hoverBg} cursor-pointer`
                      }`}
                    >
                      Previous
                    </button>
                    <div className="flex items-center gap-2">
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        let page;
                        if (totalPages <= 5) {
                          page = i + 1;
                        } else if (currentPage <= 3) {
                          page = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          page = totalPages - 4 + i;
                        } else {
                          page = currentPage - 2 + i;
                        }
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`min-w-[40px] px-4 py-2 rounded-lg transition-all font-semibold text-sm shadow-sm hover:shadow-md active:scale-95 ${
                              currentPage === page
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : `${textColor} ${hoverBg}`
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className={`px-5 py-2 rounded-lg transition-all font-semibold text-sm shadow-sm hover:shadow-md active:scale-95 ${
                        currentPage === totalPages
                          ? `${secondaryTextColor} cursor-not-allowed opacity-50`
                          : `${textColor} ${hoverBg} cursor-pointer`
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className={`${cardBg} rounded-xl shadow-2xl max-w-md w-full p-8 transform transition-all`}>
            <h2 className={`text-2xl font-bold mb-2 ${textColor}`}>Add Email to Whitelist</h2>
            <p className={`${secondaryTextColor} text-sm mb-6 leading-relaxed`}>
              Add an email to the whitelist. The user can then sign up and create their own password.
            </p>
            <form onSubmit={handleCreateUser}>
              <div className="mb-6">
                <label className={`block text-sm font-semibold mb-2 ${textColor}`}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className={`w-full px-4 py-3 ${inputBg} ${textColor} border ${borderColor} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm`}
                  placeholder="user@example.com"
                  required
                  autoFocus
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewUserEmail('');
                  }}
                  className={`px-6 py-2.5 border-2 ${borderColor} rounded-lg ${hoverBg} transition-all cursor-pointer font-semibold text-sm shadow-sm hover:shadow-md active:scale-95`}
                  disabled={isCreating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg transition-all font-semibold disabled:opacity-50 cursor-pointer shadow-md hover:shadow-lg text-sm active:scale-95"
                  disabled={isCreating}
                >
                  {isCreating ? 'Adding...' : 'Add to Whitelist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
