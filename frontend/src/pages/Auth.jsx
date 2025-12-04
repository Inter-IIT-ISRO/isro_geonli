import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ParticleBackground from "../components/ParticleBackground";

export default function Auth() {
  const location = useLocation();
  const isSignup = location.pathname === '/signup';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, signup } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password, false);
    
    if (result.success) {
      navigate('/chat');
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const result = await signup(email, password);
    
    if (result.success) {
      navigate('/chat');
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSignup) {
      handleSignup(e);
    } else {
      handleLogin(e);
    }
  };

  const handleGuestMode = () => {
    navigate('/chat');
  };

  return (
    <div className="w-[100vw] h-[100vh] relative bg-[#0f172a] overflow-hidden">
      <ParticleBackground />
      
      <div className="relative z-10">
        <img
          className="w-[38vw] h-[78vh] left-[20vw] top-[11vh] absolute object-fill rounded-tl-[5.21vw] rounded-bl-[5.21vw] rounded-bl-3xl object-cover shadow-2xl"
          src="src/assets/earth_image_2.png"
        />
        <div className="w-[20vw] h-[78vh] left-[58vw] top-[11vh] absolute bg-gradient-to-br from-[#acc2e0] to-[#8FA8C8] rounded-tr-3xl rounded-br-3xl shadow-2xl" />
        
        <div className="flex w-[15vw] h-[5.93vh] left-[60.5vw] top-[18vh] absolute justify-center items-center text-sky-950 text-4xl font-extrabold font-['Inter'] gap-2">
          <img src="src/assets/isro_logo.png" alt="isro image" />
          AstraVLM
        </div>

      <div className="w-[15vw] left-[60.5vw] top-[26vh] absolute text-center text-sky-950 text-base font-normal font-['JetBrains_Mono'] leading-snug">
        {isSignup ? 'Create your account to save your chats!' : 'Your AI Partner for Satellite Image Understanding!'}
      </div>

      <div className="w-[15vw] h-[4.5vh] left-[60.5vw] top-[35vh] absolute flex rounded-xl bg-sky-950/10 backdrop-blur-sm p-1 shadow-sm relative">
        <div 
          className="absolute left-1 top-1 bottom-1 w-[calc(50%-4px)] bg-sky-950 rounded-lg shadow-md transition-transform duration-300 ease-in-out" 
          style={{ transform: isSignup ? 'translateX(100%)' : 'translateX(0%)' }}
        />
        <button
          onClick={() => navigate('/')}
          className={`flex-1 rounded-lg flex items-center justify-center text-sm cursor-pointer z-10 relative transition-colors duration-300 ${
            !isSignup ? 'text-white font-bold' : 'text-sky-950 font-semibold hover:bg-sky-950/5'
          }`}
        >
          Login
        </button>
        <button
          onClick={() => navigate('/signup')}
          className={`flex-1 rounded-lg flex items-center justify-center text-sm cursor-pointer z-10 relative transition-colors duration-300 ${
            isSignup ? 'text-white font-bold' : 'text-sky-950 font-semibold hover:bg-sky-950/5'
          }`}
        >
          Sign Up
        </button>
      </div>

      <input
        type="email"
        placeholder={isSignup ? "Email (must be whitelisted)" : "Email"}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSubmit(e)}
        className="w-[15vw] h-[5vh] left-[60.5vw] absolute px-4 py-2 rounded-xl border-2 border-gray-300 text-gray-800 text-sm focus:outline-none focus:border-sky-950 focus:ring-2 focus:ring-sky-950/20 transition-all shadow-sm"
        style={{ top: isSignup ? '42vh' : '45vh' }}
      />

      <input
        type="password"
        placeholder={isSignup ? "Password (min 6 chars)" : "Password"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && !isSignup && handleSubmit(e)}
        className="w-[15vw] h-[5vh] left-[60.5vw] absolute px-4 py-2 rounded-xl border-2 border-gray-300 text-gray-800 text-sm focus:outline-none focus:border-sky-950 focus:ring-2 focus:ring-sky-950/20 transition-all shadow-sm"
        style={{ top: isSignup ? '48vh' : '51vh' }}
      />

      {isSignup && (
        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSubmit(e)}
          className="w-[15vw] h-[5vh] left-[60.5vw] top-[54vh] absolute px-4 py-2 rounded-xl border-2 border-gray-300 text-gray-800 text-sm focus:outline-none focus:border-sky-950 focus:ring-2 focus:ring-sky-950/20 transition-all shadow-sm"
        />
      )}

      {error && (
        <div 
          className="left-[60.5vw] absolute text-red-600 text-xs font-semibold bg-red-50 px-3 py-1.5 rounded-lg shadow-sm max-w-[15vw]"
          style={{ top: isSignup ? '60vh' : '57vh' }}
        >
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-[15vw] h-[5vh] left-[60.5vw] absolute bg-[#FF6B35] rounded-xl text-white text-base font-bold hover:bg-[#ff7a47] active:bg-[#e85a2a] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl active:scale-[0.98]"
        style={{ top: '63vh' }}
      >
        {loading ? (isSignup ? 'Signing up...' : 'Logging in...') : (isSignup ? 'Sign Up' : 'Login')}
      </button>

      <button
        onClick={handleGuestMode}
        className="w-[15vw] h-[4.5vh] left-[60.5vw] top-[69vh] absolute bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl text-white text-sm font-semibold transition-all cursor-pointer shadow-md hover:shadow-lg active:scale-[0.98]"
      >
        Continue as Guest
      </button>
      <div className="left-[60.5vw] top-[74vh] absolute text-sky-900 text-xs text-center w-[15vw] font-medium opacity-60">
        (chats won't be saved)
      </div>
      </div>
    </div>
  );
}
