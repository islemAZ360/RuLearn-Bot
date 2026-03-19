import { handleTelegramMessage } from './messageHandler';
import { auth, db } from '../firebase';
import { doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';

const WEBHOOK_BASE_URL = 'https://ru-learn-bot.vercel.app/api/webhook';

let isPolling = false;
let lastUpdateId = 0;
let pollTimeout: any = null;

export type LogEntry = { time: Date; message: string; type: 'info' | 'error' | 'msg' };
const logs: LogEntry[] = [];
let onLogUpdate: () => void = () => {};

export function setLogListener(listener: () => void) {
  onLogUpdate = listener;
}

export function getLogs() {
  return logs;
}

function addLog(message: string, type: 'info' | 'error' | 'msg' = 'info') {
  logs.unshift({ time: new Date(), message, type });
  if (logs.length > 100) logs.pop();
  onLogUpdate();
}

export function addLogPublic(message: string, type: 'info' | 'error' | 'msg' = 'info') {
  addLog(message, type);
}

function getToken() {
  const userId = auth.currentUser?.uid || '';
  return localStorage.getItem(`${userId}_telegram_token`) || localStorage.getItem('telegram_token') || '';
}

export async function startBot() {
  if (isPolling) return;
  
  const userId = auth.currentUser?.uid;
  if (!userId) {
    addLog('Error: User not logged in.', 'error');
    return;
  }
  
  const token = getToken();
  if (!token) {
    addLog('Error: Bot Token is missing. Please add it in Settings.', 'error');
    return;
  }

  isPolling = true;
  addLog('Starting bot...', 'info');
  
  // Get user settings
  const aiApiKey = localStorage.getItem(`${userId}_ai_api_key`) || localStorage.getItem('ai_api_key') || '';
  const aiBaseUrl = localStorage.getItem(`${userId}_ai_base_url`) || localStorage.getItem('ai_base_url') || 'https://api.kiro.cheap';
  const aiModel = localStorage.getItem(`${userId}_ai_model`) || localStorage.getItem('ai_model') || 'claude-opus-4-6';
  const translationLanguage = localStorage.getItem(`${userId}_translation_language`) || localStorage.getItem('translation_language') || 'Arabic';

  try {
    // First, get the chat ID by sending a test or getting updates
    const updatesRes = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=1`);
    const updatesData = await updatesRes.json();
    let chatId = localStorage.getItem(`${userId}_last_chat_id`) || '';
    
    if (updatesData.ok && updatesData.result.length > 0) {
      chatId = updatesData.result[0].message?.chat?.id?.toString() || chatId;
      if (chatId) {
        localStorage.setItem(`${userId}_last_chat_id`, chatId);
      }
    }

    // Save bot config to Firebase
    const configRef = doc(db, 'botConfigs', `${userId}_${token.slice(-10)}`);
    await setDoc(configRef, {
      userId,
      botToken: token,
      chatId: chatId,
      aiApiKey,
      aiBaseUrl,
      aiModel,
      translationLanguage,
      active: true,
      updatedAt: Date.now()
    });
    addLog('Saved bot configuration to cloud.', 'info');

    // Register webhook with Telegram (include config ID in URL)
    const configId = `${userId}_${token.slice(-10)}`;
    const webhookUrl = `${WEBHOOK_BASE_URL}?configId=${encodeURIComponent(configId)}`;
    const webhookRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`);
    const webhookData = await webhookRes.json();
    
    if (webhookData.ok) {
      addLog('Webhook registered successfully!', 'info');
      addLog('Bot is now running in cloud mode.', 'info');
      addLog('You can close this app - bot will keep working!', 'info');
      
      // Send notification to user
      if (chatId) {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `🟢 **Bot is now ONLINE (Cloud Mode)!**\n\nI will keep running even if you close the app.\n\nTranslation language: **${translationLanguage}**`,
            parse_mode: 'Markdown'
          })
        });
        addLog(`Sent startup notification to chat ${chatId}`, 'info');
      }
    } else {
      addLog(`Webhook registration failed: ${webhookData.description}`, 'error');
      // Fallback to polling mode
      addLog('Falling back to polling mode (requires app to stay open)', 'info');
      startPollingMode();
    }
  } catch (e: any) {
    addLog(`Error: ${e.message}`, 'error');
    addLog('Falling back to polling mode', 'info');
    startPollingMode();
  }
}

async function startPollingMode() {
  const token = getToken();
  
  try {
    // Delete webhook for polling
    await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);
    addLog('Cleared webhooks, starting polling...', 'info');
  } catch (e: any) {
    addLog(`Failed to clear webhook: ${e.message}`, 'error');
  }

  poll();
}

export async function stopBot() {
  isPolling = false;
  if (pollTimeout) clearTimeout(pollTimeout);
  
  const userId = auth.currentUser?.uid;
  const token = getToken();
  
  if (userId && token) {
    try {
      // Delete webhook
      await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);
      addLog('Webhook removed.', 'info');
      
      // Update config in Firebase
      const configRef = doc(db, 'botConfigs', `${userId}_${token.slice(-10)}`);
      const configSnap = await getDoc(configRef);
      if (configSnap.exists()) {
        await setDoc(configRef, { ...configSnap.data(), active: false, updatedAt: Date.now() });
      }
      
      // Notify user
      const chatId = localStorage.getItem(`${userId}_last_chat_id`);
      if (chatId) {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: '🔴 **Bot is now OFFLINE.**',
            parse_mode: 'Markdown'
          })
        });
      }
    } catch (e: any) {
      addLog(`Error stopping: ${e.message}`, 'error');
    }
  }
  
  addLog('Bot stopped.', 'info');
}

export function getBotStatus() {
  return isPolling;
}

// Check bot status from Firebase
export async function checkBotStatusFromFirebase(): Promise<boolean> {
  const userId = auth.currentUser?.uid;
  if (!userId) return false;
  
  const token = getToken();
  if (!token) return false;
  
  try {
    const configRef = doc(db, 'botConfigs', `${userId}_${token.slice(-10)}`);
    const configSnap = await getDoc(configRef);
    
    if (configSnap.exists()) {
      const config = configSnap.data();
      return config.active === true;
    }
  } catch (e: any) {
    console.error('Error checking bot status:', e);
  }
  
  return false;
}

async function poll() {
  if (!isPolling) return;
  
  const token = getToken();
  if (!token) {
    stopBot();
    return;
  }
  
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`);
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.result.length > 0) {
        for (const update of data.result) {
          lastUpdateId = update.update_id;
          if (update.message) {
            addLog(`Received message from ${update.message.from?.first_name || 'User'}: ${update.message.text}`, 'msg');
            await handleTelegramMessage(update.message, token, addLog);
          }
        }
      }
    } else {
      addLog(`Telegram API error: ${res.status}`, 'error');
    }
  } catch (e: any) {
    addLog(`Polling error: ${e.message}`, 'error');
  }
  
  if (isPolling) {
    pollTimeout = setTimeout(poll, 1000);
  }
}
