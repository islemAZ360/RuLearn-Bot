import { handleTelegramMessage } from './messageHandler';
import { auth } from '../firebase';

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

function getToken() {
  const userId = auth.currentUser?.uid || '';
  return localStorage.getItem(`${userId}_telegram_token`) || localStorage.getItem('telegram_token') || '';
}

export async function startBot() {
  if (isPolling) return;
  
  const token = getToken();
  if (!token) {
    addLog('Error: Bot Token is missing. Please add it in Settings.', 'error');
    return;
  }

  isPolling = true;
  addLog('Bot started polling...', 'info');
  
  try {
    // Delete any existing webhook to avoid 409 Conflict errors during polling
    const res = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);
    if (res.ok) {
      addLog('Cleared existing webhooks.', 'info');
    }
  } catch (e: any) {
    addLog(`Failed to clear webhook: ${e.message}`, 'error');
  }

  // Send proactive welcome message if we have a saved chat ID
  const userId = auth.currentUser?.uid;
  if (userId) {
    const lastChatId = localStorage.getItem(`${userId}_last_chat_id`);
    if (lastChatId) {
      const targetLang = localStorage.getItem(`${userId}_translation_language`) || localStorage.getItem('translation_language') || 'Arabic';
      const welcomeMsg = `🟢 **Bot is now ONLINE!**\n\nI am ready to help you.\n- Normal messages: I will reply as a smart AI.\n- End with \`.\`: Translate to **${targetLang}** & save.\n- End with \`v\`: Extract verbs.\n- End with \`w\`: Extract words.`;
      
      try {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: lastChatId, text: welcomeMsg, parse_mode: 'Markdown' })
        });
        addLog(`Sent startup notification to chat ${lastChatId}`, 'info');
      } catch (e: any) {
        addLog(`Failed to send startup notification: ${e.message}`, 'error');
      }
    }
  }

  poll();
}

export function stopBot() {
  isPolling = false;
  if (pollTimeout) clearTimeout(pollTimeout);
  addLog('Bot stopped.', 'info');
}

export function getBotStatus() {
  return isPolling;
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
