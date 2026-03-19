/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Bot, MessageSquare, Database, Settings as SettingsIcon, LogOut } from 'lucide-react';
import { onAuthStateChanged, signOut, User, getRedirectResult } from 'firebase/auth';
import { auth } from './firebase';
import { MonetagService } from './services/monetag';
import BotDashboard from './components/BotDashboard';
import WebChat from './components/WebChat';
import DatabaseView from './components/DatabaseView';
import Settings from './components/Settings';
import Login from './components/Login';

const OWNER_EMAIL = '12azaiziaislam@gmail.com';

export default function App() {
  const [activeTab, setActiveTab] = useState<'bot' | 'chat' | 'db' | 'settings'>('bot');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.email === OWNER_EMAIL;

  useEffect(() => {
    // Load Monetag Zone ID from localStorage
    const savedZoneId = localStorage.getItem('monetag_zone_id') || '10748605';
    
    // Inject Monetag internally on app load
    MonetagService.injectScript(savedZoneId);

    // Register Service Worker for Monetag
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('Monetag SW registered', reg))
        .catch(err => console.error('Monetag SW registration failed', err));
    }

    // Handle redirect result from Google Sign-In (important for WebView apps)
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.log('Redirect sign-in successful:', result.user.email);
          setUser(result.user);
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error('Redirect sign-in error:', error);
        setLoading(false);
      });

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // All users can access all tabs now
  }, [activeTab, isAdmin, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden selection:bg-indigo-500/30">
      {/* Mobile Header */}
      <div className="md:hidden bg-slate-950 border-b border-slate-800 px-4 py-3 flex justify-between items-center z-20 shadow-lg relative">
        <div className="absolute top-0 left-0 right-0 h-full bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none"></div>
        <h1 className="text-lg font-extrabold text-white flex items-center gap-2 tracking-tight relative z-10">
          <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg shadow-indigo-500/20">
            <Bot className="text-white" size={18} strokeWidth={2.5} />
          </div>
          RuLearn
        </h1>
        <div className="flex items-center gap-3 relative z-10">
          <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.email}&background=6366f1&color=fff`} alt="User" className="w-8 h-8 rounded-full ring-2 ring-slate-800" />
          <button
            onClick={() => signOut(auth)}
            className="text-rose-400 hover:text-rose-300 p-1.5 bg-rose-500/10 rounded-lg transition-colors"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Sidebar - Desktop Premium Dark Mode */}
      <div className="hidden md:flex w-64 bg-slate-950 border-r border-slate-800 flex-col shadow-2xl z-20 relative">
        {/* Subtle top gradient */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none"></div>
        
        <div className="p-6 border-b border-slate-800/60 relative z-10">
          <h1 className="text-xl font-extrabold text-white flex items-center gap-3 tracking-tight">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20">
              <Bot className="text-white" size={20} strokeWidth={2.5} />
            </div>
            RuLearn
          </h1>
          <p className="text-xs text-slate-400 mt-3 font-medium tracking-wide uppercase">AI Telegram Manager</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 relative z-10 overflow-y-auto">
          <button
            onClick={() => setActiveTab('bot')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 ${
              activeTab === 'bot' 
                ? 'bg-indigo-500/10 text-indigo-400 font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] border border-indigo-500/20' 
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'
            }`}
          >
            <Bot size={20} className={activeTab === 'bot' ? 'text-indigo-400' : 'text-slate-500'} />
            Bot Dashboard
          </button>
          
          <button
            onClick={() => setActiveTab('chat')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 ${
              activeTab === 'chat' 
                ? 'bg-indigo-500/10 text-indigo-400 font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] border border-indigo-500/20' 
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'
            }`}
          >
            <MessageSquare size={20} className={activeTab === 'chat' ? 'text-indigo-400' : 'text-slate-500'} />
            Web Chat
          </button>
          
          <button
            onClick={() => setActiveTab('db')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 ${
              activeTab === 'db' 
                ? 'bg-indigo-500/10 text-indigo-400 font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] border border-indigo-500/20' 
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'
            }`}
          >
            <Database size={20} className={activeTab === 'db' ? 'text-indigo-400' : 'text-slate-500'} />
            Database
          </button>
          
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 ${
              activeTab === 'settings' 
                ? 'bg-indigo-500/10 text-indigo-400 font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] border border-indigo-500/20' 
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'
            }`}
          >
            <SettingsIcon size={20} className={activeTab === 'settings' ? 'text-indigo-400' : 'text-slate-500'} />
            Settings
          </button>
        </nav>
        
        <div className="p-4 border-t border-slate-800/60 flex flex-col gap-3 relative z-10 bg-slate-950/50 backdrop-blur-md">
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="relative">
              <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.email}&background=6366f1&color=fff`} alt="User" className="w-9 h-9 rounded-full ring-2 ring-slate-800" />
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-950 rounded-full"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-200 truncate">{user.displayName || 'User'}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut(auth)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 rounded-xl transition-all"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden bg-[#f8fafc] relative flex flex-col">
        {/* Subtle background decoration */}
        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-indigo-50/50 to-transparent pointer-events-none"></div>
        
        <div className="flex-1 relative z-10 flex flex-col overflow-hidden">
          {activeTab === 'bot' && <BotDashboard />}
          {activeTab === 'chat' && <WebChat />}
          {activeTab === 'db' && <DatabaseView />}
          {activeTab === 'settings' && <Settings />}
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden bg-slate-950 border-t border-slate-800 flex justify-around items-center p-2 z-20 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.3)] relative">
          <div className="absolute top-0 left-0 right-0 h-full bg-gradient-to-t from-indigo-500/5 to-transparent pointer-events-none"></div>
          
          <button onClick={() => setActiveTab('bot')} className={`relative p-2 flex flex-col items-center gap-1.5 rounded-xl flex-1 transition-all ${activeTab === 'bot' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}>
            {activeTab === 'bot' && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-indigo-500 rounded-b-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>}
            <Bot size={22} className={activeTab === 'bot' ? 'drop-shadow-[0_0_8px_rgba(99,102,241,0.4)]' : ''} />
            <span className="text-[10px] font-semibold tracking-wide">Bot</span>
          </button>
          
          <button onClick={() => setActiveTab('chat')} className={`relative p-2 flex flex-col items-center gap-1.5 rounded-xl flex-1 transition-all ${activeTab === 'chat' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}>
            {activeTab === 'chat' && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-indigo-500 rounded-b-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>}
            <MessageSquare size={22} className={activeTab === 'chat' ? 'drop-shadow-[0_0_8px_rgba(99,102,241,0.4)]' : ''} />
            <span className="text-[10px] font-semibold tracking-wide">Chat</span>
          </button>
          
          <button onClick={() => setActiveTab('db')} className={`relative p-2 flex flex-col items-center gap-1.5 rounded-xl flex-1 transition-all ${activeTab === 'db' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}>
            {activeTab === 'db' && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-indigo-500 rounded-b-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>}
            <Database size={22} className={activeTab === 'db' ? 'drop-shadow-[0_0_8px_rgba(99,102,241,0.4)]' : ''} />
            <span className="text-[10px] font-semibold tracking-wide">Data</span>
          </button>
          
          <button onClick={() => setActiveTab('settings')} className={`relative p-2 flex flex-col items-center gap-1.5 rounded-xl flex-1 transition-all ${activeTab === 'settings' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}>
            {activeTab === 'settings' && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-indigo-500 rounded-b-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>}
            <SettingsIcon size={22} className={activeTab === 'settings' ? 'drop-shadow-[0_0_8px_rgba(99,102,241,0.4)]' : ''} />
            <span className="text-[10px] font-semibold tracking-wide">Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}

