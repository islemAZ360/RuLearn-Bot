import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, ExternalLink, Shield, Info, Bot, Key, Link as LinkIcon, Cpu, Sparkles, CheckCircle2, Languages, RefreshCw } from 'lucide-react';
import { auth } from '../firebase';
import { MedianService } from '../services/median';
import { MonetagService } from '../services/monetag';

const AI_PROVIDERS: Record<string, string[]> = {
  'Custom (kiro.cheap)': ['claude-opus-4-6', 'gpt-4o', 'gemini-1.5-pro'],
  'OpenAI': ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  'Anthropic': ['claude-3-5-sonnet-20240620', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
  'Google': ['gemini-1.5-pro', 'gemini-1.5-flash'],
  'Groq': ['llama3-70b-8192', 'llama3-8b-8192', 'mixtral-8x7b-32768'],
  'DeepSeek': ['deepseek-chat', 'deepseek-coder']
};

const OWNER_EMAIL = '12azaiziaislam@gmail.com';

export default function Settings() {
  const [telegramToken, setTelegramToken] = useState('');
  const [aiProvider, setAiProvider] = useState('Custom (kiro.cheap)');
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiBaseUrl, setAiBaseUrl] = useState('');
  const [aiModel, setAiModel] = useState('');
  const [translationLanguage, setTranslationLanguage] = useState('Arabic');
  const [monetagZoneId, setMonetagZoneId] = useState('10748605');
  const [saved, setSaved] = useState(false);
  const [monetagActive, setMonetagActive] = useState(false);

  const isAdmin = auth.currentUser?.email === OWNER_EMAIL;

  useEffect(() => {
    const userId = auth.currentUser?.uid || '';
    setTelegramToken(localStorage.getItem(`${userId}_telegram_token`) || localStorage.getItem('telegram_token') || '');
    setAiProvider(localStorage.getItem(`${userId}_ai_provider`) || localStorage.getItem('ai_provider') || 'Custom (kiro.cheap)');
    setAiApiKey(localStorage.getItem(`${userId}_ai_api_key`) || localStorage.getItem('ai_api_key') || '');
    setTranslationLanguage(localStorage.getItem(`${userId}_translation_language`) || localStorage.getItem('translation_language') || 'English');
    
    let savedBaseUrl = localStorage.getItem(`${userId}_ai_base_url`) || localStorage.getItem('ai_base_url') || 'https://api.kiro.cheap';
    // Convert old proxy path to direct URL
    if (savedBaseUrl === '/api/ai') {
      savedBaseUrl = 'https://api.kiro.cheap';
    }
    setAiBaseUrl(savedBaseUrl);
    
    setAiModel(localStorage.getItem(`${userId}_ai_model`) || localStorage.getItem('ai_model') || 'claude-opus-4-6');
    setMonetagZoneId(localStorage.getItem(`${userId}_monetag_zone_id`) || localStorage.getItem('monetag_zone_id') || '10748605');

    // Inject Monetag internally
    MonetagService.injectScript();
    
    // Check if script is already in head
    const checkScript = () => {
      setMonetagActive(!!document.getElementById('monetag-script'));
    };
    
    checkScript();
    const interval = setInterval(checkScript, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSave = () => {
    const userId = auth.currentUser?.uid || '';
    localStorage.setItem(`${userId}_telegram_token`, telegramToken);
    localStorage.setItem(`${userId}_ai_provider`, aiProvider);
    localStorage.setItem(`${userId}_ai_api_key`, aiApiKey);
    localStorage.setItem(`${userId}_ai_base_url`, aiBaseUrl);
    localStorage.setItem(`${userId}_ai_model`, aiModel);
    localStorage.setItem(`${userId}_translation_language`, translationLanguage);
    localStorage.setItem(`${userId}_monetag_zone_id`, monetagZoneId);
    
    // Also save globally for backward compatibility
    localStorage.setItem('telegram_token', telegramToken);
    localStorage.setItem('ai_provider', aiProvider);
    localStorage.setItem('ai_api_key', aiApiKey);
    localStorage.setItem('ai_base_url', aiBaseUrl);
    localStorage.setItem('ai_model', aiModel);
    localStorage.setItem('translation_language', translationLanguage);
    localStorage.setItem('monetag_zone_id', monetagZoneId);

    // Re-inject Monetag with new ID
    MonetagService.removeScript();
    MonetagService.injectScript(monetagZoneId);

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provider = e.target.value;
    setAiProvider(provider);
    setAiModel(AI_PROVIDERS[provider][0]); // Auto-select first model
    
    if (provider === 'Custom (kiro.cheap)') {
      setAiBaseUrl('https://api.kiro.cheap');
    } else if (provider === 'OpenAI') {
      setAiBaseUrl('https://api.openai.com/v1');
    } else if (provider === 'Anthropic') {
      setAiBaseUrl('https://api.anthropic.com/v1');
    } else if (provider === 'Google') {
      setAiBaseUrl('https://generativelanguage.googleapis.com/v1beta');
    } else if (provider === 'Groq') {
      setAiBaseUrl('https://api.groq.com/openai/v1');
    } else if (provider === 'DeepSeek') {
      setAiBaseUrl('https://api.deepseek.com/v1');
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50/50 overflow-auto relative">
      {/* Premium Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-4 md:px-8 py-4 md:py-6 sticky top-0 z-20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between max-w-4xl mx-auto gap-4">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="p-2 md:p-3 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl md:rounded-2xl shadow-lg shadow-indigo-500/20">
              <SettingsIcon className="text-white w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">System Settings</h2>
              <p className="text-xs md:text-sm text-slate-500 font-medium mt-0.5">Configure your bot and AI preferences</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-semibold transition-all duration-300 ${
              saved 
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0'
            }`}
          >
            {saved ? <CheckCircle2 size={18} className="md:w-5 md:h-5" /> : <Save size={18} className="md:w-5 md:h-5" />}
            {saved ? 'Saved Successfully' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
          
          {/* Telegram Bot Link & Instructions - Premium Dark Card */}
          <div className="bg-slate-950 rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-8 text-white shadow-2xl shadow-slate-900/10 relative overflow-hidden border border-slate-800">
            {/* Decorative background elements */}
            <div className="absolute -top-32 -right-32 w-64 md:w-96 h-64 md:h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-32 -left-32 w-64 md:w-96 h-64 md:h-96 bg-violet-500/20 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 md:gap-6 mb-6 md:mb-8 border-b border-slate-800/60 pb-6 md:pb-8">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="p-2.5 md:p-3 bg-indigo-500/20 rounded-xl md:rounded-2xl border border-indigo-500/30">
                    <Bot className="text-indigo-400 w-6 h-6 md:w-8 md:h-8" />
                  </div>
                  <div>
                    <h3 className="text-xl md:text-2xl font-bold mb-0.5 md:mb-1 tracking-tight">Your Telegram Bot</h3>
                    <p className="text-xs md:text-sm text-slate-400 font-medium">Create your own private bot in minutes</p>
                  </div>
                </div>
                <a 
                  href="https://t.me/BotFather" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="group flex items-center justify-center gap-2 bg-white text-slate-900 hover:bg-indigo-50 transition-all px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold shadow-xl hover:shadow-indigo-500/20 hover:-translate-y-0.5 text-sm md:text-base"
                >
                  Open @BotFather 
                  <ExternalLink size={16} className="md:w-[18px] md:h-[18px] text-slate-500 group-hover:text-indigo-600 transition-colors" />
                </a>
              </div>
              
              <div className="bg-slate-900/50 rounded-xl md:rounded-2xl p-4 md:p-6 backdrop-blur-md border border-slate-800/50">
                <h4 className="text-base md:text-lg font-semibold flex items-center gap-2 mb-4 md:mb-6 text-indigo-300">
                  <Info size={18} className="md:w-5 md:h-5" /> How to create and connect your bot:
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 md:gap-x-8 gap-y-4 md:gap-y-6">
                  <div className="flex gap-3 md:gap-4">
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shrink-0 border border-indigo-500/30 text-xs md:text-base">1</div>
                    <p className="text-slate-300 text-xs md:text-sm leading-relaxed">Click <strong>Open @BotFather</strong> above to open the official Telegram bot creator.</p>
                  </div>
                  <div className="flex gap-3 md:gap-4">
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shrink-0 border border-indigo-500/30 text-xs md:text-base">2</div>
                    <p className="text-slate-300 text-xs md:text-sm leading-relaxed">Send the command <code className="bg-black/40 px-1.5 py-0.5 md:px-2 md:py-1 rounded-md text-indigo-300 font-mono text-[10px] md:text-xs border border-slate-700">/newbot</code> to start creating your bot.</p>
                  </div>
                  <div className="flex gap-3 md:gap-4">
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shrink-0 border border-indigo-500/30 text-xs md:text-base">3</div>
                    <p className="text-slate-300 text-xs md:text-sm leading-relaxed">BotFather will ask for a <strong>name</strong>. Type any name you like (e.g., <em>My Russian Tutor</em>).</p>
                  </div>
                  <div className="flex gap-3 md:gap-4">
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shrink-0 border border-indigo-500/30 text-xs md:text-base">4</div>
                    <p className="text-slate-300 text-xs md:text-sm leading-relaxed">Next, provide a <strong>username</strong>. It MUST end in <code>bot</code> (e.g., <em>MyLearnBot</em>).</p>
                  </div>
                  <div className="flex gap-3 md:gap-4">
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shrink-0 border border-indigo-500/30 text-xs md:text-base">5</div>
                    <p className="text-slate-300 text-xs md:text-sm leading-relaxed">BotFather will give you an <strong>HTTP API Token</strong> (e.g., <code className="break-all">123456:ABC-DEF...</code>).</p>
                  </div>
                  <div className="flex gap-3 md:gap-4">
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shrink-0 border border-indigo-500/30 text-xs md:text-base">6</div>
                    <p className="text-slate-300 text-xs md:text-sm leading-relaxed"><strong>Copy that token</strong> and paste it into the <strong>Bot Token</strong> field below.</p>
                  </div>
                  <div className="flex gap-3 md:gap-4">
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shrink-0 border border-indigo-500/30 text-xs md:text-base">7</div>
                    <p className="text-slate-300 text-xs md:text-sm leading-relaxed">Click <strong>Save Changes</strong>, go to the <strong>Bot Dashboard</strong>, and click <strong>Start Engine</strong>.</p>
                  </div>
                  <div className="flex gap-3 md:gap-4">
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shrink-0 border border-indigo-500/30 text-xs md:text-base">8</div>
                    <p className="text-slate-300 text-xs md:text-sm leading-relaxed">Click the link to your new bot in Telegram and send <code className="bg-black/40 px-1.5 py-0.5 md:px-2 md:py-1 rounded-md text-indigo-300 font-mono text-[10px] md:text-xs border border-slate-700">/start</code> to begin!</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Telegram Config */}
          <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-slate-200/60 overflow-hidden group hover:shadow-md transition-all duration-300">
            <div className="p-5 md:p-8 border-b border-slate-100 bg-slate-50/30">
              <h3 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-3">
                <div className="p-1.5 md:p-2 bg-blue-100 text-blue-600 rounded-lg md:rounded-xl">
                  <Shield size={20} className="md:w-[22px] md:h-[22px]" />
                </div>
                Telegram Configuration
              </h3>
            </div>
            <div className="p-5 md:p-8">
              <div className="max-w-2xl">
                <label className="block text-xs md:text-sm font-bold text-slate-700 mb-2 md:mb-3 flex items-center gap-2">
                  <Key size={14} className="text-slate-400 md:w-4 md:h-4" />
                  Bot Token
                </label>
                <input
                  type="text"
                  value={telegramToken}
                  onChange={(e) => setTelegramToken(e.target.value)}
                  placeholder="e.g. 1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                  className="w-full px-4 md:px-5 py-3 md:py-4 bg-slate-50/50 border border-slate-200 rounded-xl md:rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-700 font-mono text-xs md:text-sm shadow-sm"
                />
                <p className="text-xs md:text-sm text-slate-500 mt-2 md:mt-3 flex items-start md:items-center gap-2">
                  <Info size={14} className="text-indigo-400 shrink-0 mt-0.5 md:mt-0 md:w-4 md:h-4" />
                  Your bot token is private. Only you can access the bot you create.
                </p>
              </div>
            </div>
          </div>

          {/* AI Config */}
          <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-slate-200/60 overflow-hidden group hover:shadow-md transition-all duration-300">
            <div className="p-5 md:p-8 border-b border-slate-100 bg-slate-50/30">
              <h3 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-3">
                <div className="p-1.5 md:p-2 bg-emerald-100 text-emerald-600 rounded-lg md:rounded-xl">
                  <Cpu size={20} className="md:w-[22px] md:h-[22px]" />
                </div>
                AI Configuration
              </h3>
            </div>
            <div className="p-5 md:p-8 space-y-6 md:space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                <div>
                  <label className="block text-xs md:text-sm font-bold text-slate-700 mb-2 md:mb-3 flex items-center gap-2">
                    <Sparkles size={14} className="text-slate-400 md:w-4 md:h-4" />
                    AI Provider
                  </label>
                  <div className="relative">
                    <select
                      value={aiProvider}
                      onChange={handleProviderChange}
                      className="w-full px-4 md:px-5 py-3 md:py-4 bg-slate-50/50 border border-slate-200 rounded-xl md:rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-700 font-medium text-sm shadow-sm appearance-none cursor-pointer"
                    >
                      {Object.keys(AI_PROVIDERS).map(provider => (
                        <option key={provider} value={provider}>{provider}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 md:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <svg width="10" height="6" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg" className="md:w-3 md:h-2">
                        <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs md:text-sm font-bold text-slate-700 mb-2 md:mb-3 flex items-center gap-2">
                    <SettingsIcon size={14} className="text-slate-400 md:w-4 md:h-4" />
                    Model Name
                  </label>
                  <div className="relative">
                    <select
                      value={aiModel}
                      onChange={(e) => setAiModel(e.target.value)}
                      className="w-full px-4 md:px-5 py-3 md:py-4 bg-slate-50/50 border border-slate-200 rounded-xl md:rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-700 font-medium text-sm shadow-sm appearance-none cursor-pointer"
                    >
                      {AI_PROVIDERS[aiProvider]?.map(model => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 md:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <svg width="10" height="6" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg" className="md:w-3 md:h-2">
                        <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                <div>
                  <label className="block text-xs md:text-sm font-bold text-slate-700 mb-2 md:mb-3 flex items-center gap-2">
                    <Key size={14} className="text-slate-400 md:w-4 md:h-4" />
                    API Key
                  </label>
                  <input
                    type="password"
                    value={aiApiKey}
                    onChange={(e) => setAiApiKey(e.target.value)}
                    placeholder="Enter your API key"
                    className="w-full px-4 md:px-5 py-3 md:py-4 bg-slate-50/50 border border-slate-200 rounded-xl md:rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-700 font-mono text-xs md:text-sm shadow-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-xs md:text-sm font-bold text-slate-700 mb-2 md:mb-3 flex items-center gap-2">
                    <LinkIcon size={14} className="text-slate-400 md:w-4 md:h-4" />
                    Base URL
                  </label>
                  <input
                    type="text"
                    value={aiBaseUrl}
                    onChange={(e) => setAiBaseUrl(e.target.value)}
                    placeholder="https://api.example.com/v1"
                    className="w-full px-4 md:px-5 py-3 md:py-4 bg-slate-50/50 border border-slate-200 rounded-xl md:rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-700 font-mono text-xs md:text-sm shadow-sm"
                  />
                </div>
              </div>

              <div className="pt-5 md:pt-6 border-t border-slate-100">
                <div className="max-w-md">
                  <label className="block text-xs md:text-sm font-bold text-slate-700 mb-2 md:mb-3 flex items-center gap-2">
                    <Languages size={14} className="text-slate-400 md:w-4 md:h-4" />
                    Target Translation Language
                  </label>
                  <input
                    type="text"
                    value={translationLanguage}
                    onChange={(e) => setTranslationLanguage(e.target.value)}
                    placeholder="e.g. Arabic, English, Spanish..."
                    className="w-full px-4 md:px-5 py-3 md:py-4 bg-slate-50/50 border border-slate-200 rounded-xl md:rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-700 font-medium text-xs md:text-sm shadow-sm"
                  />
                  <p className="text-xs md:text-sm text-slate-500 mt-2 md:mt-3 flex items-start md:items-center gap-2">
                    <Info size={14} className="text-indigo-400 shrink-0 mt-0.5 md:mt-0 md:w-4 md:h-4" />
                    This language will be used when you use the translation codes (., v, w).
                  </p>
                </div>
              </div>

              {isAdmin && (
                <div className="pt-5 md:pt-6 border-t border-slate-100">
                  <div className="mb-6">
                    <label className="block text-xs md:text-sm font-bold text-slate-700 mb-2 md:mb-3 flex items-center gap-2">
                      <Shield size={14} className="text-indigo-400 md:w-4 md:h-4" />
                      Monetag Zone ID
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={monetagZoneId}
                        onChange={(e) => setMonetagZoneId(e.target.value)}
                        placeholder="e.g. 10748605"
                        className="flex-1 px-4 md:px-5 py-3 md:py-4 bg-slate-50/50 border border-slate-200 rounded-xl md:rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-700 font-mono text-xs md:text-sm shadow-sm"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2">
                      Change this if you want to use a different Monetag ad zone.
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${monetagActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                      <div>
                        <p className="text-sm font-bold text-emerald-900">Ads Engine Status</p>
                        <p className="text-xs text-emerald-700">{monetagActive ? 'Active & Injected (Internal)' : 'Inactive'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-[10px] font-mono text-emerald-600 bg-white/50 px-2 py-1 rounded-md border border-emerald-100">
                        Zone: 10748605
                      </div>
                      <button 
                        onClick={() => {
                          MonetagService.removeScript();
                          setTimeout(() => MonetagService.injectScript(), 100);
                        }}
                        className="p-2 hover:bg-emerald-100 rounded-lg text-emerald-600 transition-colors"
                        title="Refresh Ads Engine"
                      >
                        <RefreshCw size={16} />
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-[10px] text-slate-400 italic">
                    Note: If ads don't appear, please disable your AdBlocker and check if the domain is verified in your Monetag dashboard.
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
