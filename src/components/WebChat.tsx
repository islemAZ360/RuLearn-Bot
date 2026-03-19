import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Trash2, Sparkles, MessageSquare } from 'lucide-react';
import { callAI, Message } from '../services/ai';
import { auth } from '../firebase';

const SYSTEM_PROMPT = "You are a helpful Russian learning assistant. Answer in Arabic or English as appropriate.";
const INITIAL_MESSAGE: Message = { role: 'ai', content: 'Hello! I am your AI assistant. How can I help you learn Russian today?' };

export default function WebChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load messages from localStorage on mount
  useEffect(() => {
    const userId = auth.currentUser?.uid || '';
    const saved = localStorage.getItem(`${userId}_webchat_messages`) || localStorage.getItem('webchat_messages');
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        setMessages([INITIAL_MESSAGE]);
      }
    } else {
      setMessages([INITIAL_MESSAGE]);
    }
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    const userId = auth.currentUser?.uid || '';
    if (messages.length > 0) {
      localStorage.setItem(`${userId}_webchat_messages`, JSON.stringify(messages));
    }
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleClearChat = () => {
    if (window.confirm('Are you sure you want to clear the chat history?')) {
      const userId = auth.currentUser?.uid || '';
      setMessages([INITIAL_MESSAGE]);
      localStorage.removeItem(`${userId}_webchat_messages`);
      localStorage.removeItem('webchat_messages');
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMsg = input.trim();
    setInput('');
    
    const newMessages: Message[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setIsLoading(true);

    // Add a temporary empty AI message that we will stream into
    setMessages(prev => [...prev, { role: 'ai', content: '' }]);

    try {
      // Prepare messages for API (include system prompt at the beginning)
      const apiMessages: Message[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...newMessages
      ];

      let currentResponse = '';
      
      await callAI(apiMessages, (chunk) => {
        currentResponse += chunk;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'ai', content: currentResponse };
          return updated;
        });
      });
      
    } catch (e: any) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'ai', content: `Sorry, I encountered an error communicating with the AI. Details: ${e.message}` };
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 relative pb-16 md:pb-0">
      {/* Premium Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-4 md:px-8 py-4 md:py-6 sticky top-0 z-20">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="p-2 md:p-3 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl md:rounded-2xl shadow-lg shadow-indigo-500/20 relative">
              <MessageSquare className="text-white w-5 h-5 md:w-6 md:h-6" />
              <div className="absolute -top-1 -right-1 bg-slate-900 rounded-full p-0.5 border border-slate-700">
                <Sparkles className="w-2 h-2 md:w-3 md:h-3 text-amber-400" />
              </div>
            </div>
            <div>
              <h2 className="text-lg md:text-2xl font-bold text-slate-900 tracking-tight">AI Chat</h2>
              <p className="text-xs md:text-sm text-slate-500 font-medium mt-0.5 hidden sm:block">Try your AI assistant directly from the browser</p>
            </div>
          </div>
          <button 
            onClick={handleClearChat}
            className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 text-xs md:text-sm font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg md:rounded-xl transition-all shadow-sm border border-rose-100"
            title="Clear Chat"
          >
            <Trash2 size={16} className="md:w-[18px] md:h-[18px]" />
            <span className="hidden sm:inline">Clear Chat</span>
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden flex flex-col max-w-5xl mx-auto w-full p-2 md:p-8">
        <div className="flex-1 bg-white rounded-2xl md:rounded-[2rem] shadow-sm border border-slate-200/60 overflow-hidden flex flex-col relative">
          
          {/* Subtle background pattern */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02] pointer-events-none"></div>

          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8 relative z-10 scroll-smooth">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}>
                <div className={`max-w-[90%] md:max-w-[75%] flex gap-2 md:gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start`}>
                  
                  {/* Avatar */}
                  <div className={`shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shadow-sm border ${
                    msg.role === 'user' 
                      ? 'bg-gradient-to-br from-indigo-500 to-violet-600 border-indigo-400/30 text-white' 
                      : 'bg-white border-slate-200 text-indigo-600'
                  }`}>
                    {msg.role === 'user' ? <User size={16} className="md:w-5 md:h-5" /> : <Bot size={16} className="md:w-5 md:h-5" />}
                  </div>

                  {/* Message Bubble */}
                  <div className={`px-4 py-3 md:px-5 md:py-3.5 rounded-2xl shadow-sm text-sm md:text-[15px] leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-tr-sm' 
                      : 'bg-white text-slate-800 rounded-tl-sm border border-slate-200/60'
                  }`} dir="auto">
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && messages[messages.length - 1]?.content === '' && (
              <div className="flex justify-start">
                <div className="max-w-[90%] md:max-w-[75%] flex gap-2 md:gap-4 flex-row items-start">
                  <div className="shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shadow-sm border bg-white border-slate-200 text-indigo-600">
                    <Bot size={16} className="md:w-5 md:h-5" />
                  </div>
                  <div className="px-4 py-3 md:px-5 md:py-4 rounded-2xl rounded-tl-sm bg-white border border-slate-200/60 shadow-sm flex items-center gap-2 h-[42px] md:h-[46px]">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>
          
          {/* Input Area */}
          <div className="p-3 md:p-6 bg-white/80 backdrop-blur-md border-t border-slate-200/60 relative z-10">
            <div className="flex gap-2 md:gap-4 max-w-4xl mx-auto relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type your message here..."
                className="flex-1 px-4 py-3 md:px-6 md:py-4 text-sm md:text-base bg-slate-50/50 border border-slate-200 rounded-xl md:rounded-2xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 shadow-sm transition-all text-slate-700 font-medium placeholder:text-slate-400"
              />
              <button 
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="px-4 py-3 md:px-6 md:py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl md:rounded-2xl hover:shadow-lg hover:shadow-indigo-500/25 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:translate-y-0 flex items-center justify-center shadow-md active:translate-y-0 shrink-0"
              >
                <Send size={18} className={`md:w-[22px] md:h-[22px] ${input.trim() && !isLoading ? "animate-pulse" : ""}`} />
              </button>
            </div>
            <p className="text-center text-[10px] md:text-xs text-slate-400 mt-2 md:mt-4 font-medium">
              AI may make mistakes. Please verify important information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
