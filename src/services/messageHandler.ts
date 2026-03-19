import { addDoc, collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { callAI } from './ai';

const pendingSaves: Record<number, { type: 'verbs' | 'words', items: {ru: string, ar: string}[] }> = {};

export async function handleTelegramMessage(msg: any, token: string, addLog: (m: string, t: 'info'|'error'|'msg') => void) {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();
  if (!text) return;

  const userId = auth.currentUser?.uid;
  
  if (userId) {
    // Save chat ID so we can send proactive messages later
    localStorage.setItem(`${userId}_last_chat_id`, chatId.toString());
  }

  const sendMsg = async (replyText: string) => {
    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: replyText, parse_mode: 'Markdown' })
      });
      addLog(`Replied to ${msg.from?.first_name || 'User'}`, 'info');
    } catch (e: any) {
      addLog(`Failed to send message: ${e.message}`, 'error');
    }
  };

  if (!userId) {
    addLog('User not authenticated. Cannot save to database.', 'error');
    await sendMsg('Error: Website user is not logged in. Please log in to the website.');
    return;
  }

  const targetLang = localStorage.getItem(`${userId}_translation_language`) || localStorage.getItem('translation_language') || 'Arabic';

  if (text === '/start' || text === '/help' || text === 'help') {
    const helpText = `Welcome! 🤖\nHere is how I can help you:\n\n1. **Normal Conversation**: Send any message and I will reply as an AI assistant.\n2. **Translate & Save**: Send text ending with a period \`.\` (e.g., \`привет.\`). I will translate it to **${targetLang}** and save it to your database.\n3. **Extract Verbs**: Send text ending with \`v\` (e.g., \`я иду домой v\`). I will extract verbs and their meanings in **${targetLang}**.\n4. **Extract Words**: Send text ending with \`w\` (e.g., \`я иду домой w\`). I will extract keywords and their meanings in **${targetLang}**.\n5. **Save Extractions**: After extracting verbs or words, send just a period \`.\` to save them!\n\n**Commands**:\n- /help or \`help\`: Show this menu\n- \`all\`: Show all saved sentences\n- \`verbs\`: Show all saved verbs\n- \`words\`: Show all saved words`;
    await sendMsg(helpText);
    return;
  }

  if (text === 'all') {
    const q = query(collection(db, 'sentences'), where('userId', '==', userId), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    const items = snapshot.docs.map(d => d.data());
    if (items.length === 0) return sendMsg('No sentences saved yet.');
    const reply = items.map(i => `${i.ru}\n${i.ar}`).join('\n\n');
    await sendMsg(`**Saved Sentences:**\n\n${reply}`.substring(0, 4000));
    return;
  }

  if (text === 'verbs') {
    const q = query(collection(db, 'verbs'), where('userId', '==', userId), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    const items = snapshot.docs.map(d => d.data());
    if (items.length === 0) return sendMsg('No verbs saved yet.');
    const reply = items.map(i => `${i.ru} - ${i.ar}`).join('\n');
    await sendMsg(`**Saved Verbs:**\n\n${reply}`.substring(0, 4000));
    return;
  }

  if (text === 'words') {
    const q = query(collection(db, 'words'), where('userId', '==', userId), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    const items = snapshot.docs.map(d => d.data());
    if (items.length === 0) return sendMsg('No words saved yet.');
    const reply = items.map(i => `${i.ru} - ${i.ar}`).join('\n');
    await sendMsg(`**Saved Words:**\n\n${reply}`.substring(0, 4000));
    return;
  }

  if (text === '.') {
    const pending = pendingSaves[chatId];
    if (pending) {
      for (const item of pending.items) {
        await addDoc(collection(db, pending.type), {
          ru: item.ru,
          ar: item.ar,
          timestamp: Date.now(),
          userId
        });
      }
      await sendMsg(`Saved ${pending.items.length} ${pending.type} to database! ✅`);
      delete pendingSaves[chatId];
    } else {
      await sendMsg('Nothing to save. Extract verbs or words first.');
    }
    return;
  }

  if (text.endsWith(' v')) {
    const ruText = text.slice(0, -2).trim();
    const prompt = `Extract all verbs from the following text. Return ONLY a valid JSON array of objects, where each object has "ru" (the verb in infinitive/base form) and "ar" (the ${targetLang} translation). Do not include any other text or markdown formatting outside the JSON array.\n\nText: ${ruText}`;
    try {
      const response = await callAI(prompt);
      const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const verbs = JSON.parse(jsonStr);
      pendingSaves[chatId] = { type: 'verbs', items: verbs };
      const reply = verbs.map((v: any) => `${v.ru} - ${v.ar}`).join('\n');
      await sendMsg(`**Extracted Verbs (${targetLang}):**\n${reply}\n\nReply with \`.\` to save.`);
    } catch (e) {
      await sendMsg('Failed to extract verbs. AI returned invalid format.');
    }
    return;
  }

  if (text.endsWith(' w')) {
    const ruText = text.slice(0, -2).trim();
    const prompt = `Extract the main words (nouns, adjectives, adverbs) from the following text. Return ONLY a valid JSON array of objects, where each object has "ru" (the word in base form) and "ar" (the ${targetLang} translation). Do not include any other text or markdown formatting outside the JSON array.\n\nText: ${ruText}`;
    try {
      const response = await callAI(prompt);
      const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const words = JSON.parse(jsonStr);
      pendingSaves[chatId] = { type: 'words', items: words };
      const reply = words.map((w: any) => `${w.ru} - ${w.ar}`).join('\n');
      await sendMsg(`**Extracted Words (${targetLang}):**\n${reply}\n\nReply with \`.\` to save.`);
    } catch (e) {
      await sendMsg('Failed to extract words. AI returned invalid format.');
    }
    return;
  }

  if (text.endsWith('.')) {
    const ruText = text.slice(0, -1).trim();
    const prompt = `Translate the following text to ${targetLang}. Return ONLY the ${targetLang} translation, nothing else.\n\nText: ${ruText}`;
    try {
      const translation = await callAI(prompt);
      await addDoc(collection(db, 'sentences'), {
        ru: ruText,
        ar: translation.trim(),
        timestamp: Date.now(),
        userId
      });
      await sendMsg(`**Translation (${targetLang}):**\n${translation.trim()}\n\n*Saved to database! ✅*`);
    } catch (e) {
      await sendMsg('Translation failed.');
    }
    return;
  }

  // Default AI conversation
  try {
    const aiResponse = await callAI(text);
    await sendMsg(aiResponse.trim());
  } catch (e) {
    await sendMsg('AI Error.');
  }
}
