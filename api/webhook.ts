import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin (for server-side)
if (!getApps().length) {
  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      : undefined;

    if (serviceAccount) {
      initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || 'n8n360-8ba3b'
      });
    } else {
      initializeApp({ projectId: 'n8n360-8ba3b' });
    }
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
    throw error;
  }
}

const db = getFirestore();

// Helper: detect Cyrillic text
function containsCyrillic(text: string): boolean {
  return /[\u0400-\u04FF]/.test(text);
}

// Helper: save to Firestore
async function saveToCollection(collectionName: string, data: any) {
  const ref = db.collection(collectionName).doc();
  await ref.set(data);
  return ref.id;
}

// Helper: persistent pending saves via Firestore
async function savePending(chatId: string, type: 'verbs' | 'words', items: {ru: string, ar: string}[]) {
  await db.collection('pendingSaves').doc(chatId).set({ type, items, timestamp: Date.now() });
}

async function getPending(chatId: string): Promise<{ type: 'verbs' | 'words', items: {ru: string, ar: string}[] } | null> {
  const doc = await db.collection('pendingSaves').doc(chatId).get();
  if (!doc.exists) return null;
  return doc.data() as any;
}

async function clearPending(chatId: string) {
  try { await db.collection('pendingSaves').doc(chatId).delete(); } catch(e) {}
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, message: 'Webhook is active' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const update = req.body;
    
    if (!update.message) {
      return res.status(200).json({ ok: true });
    }

    const chatId = update.message.chat.id;
    const text = (update.message.text || '').trim();
    const username = update.message.from?.first_name || 'User';

    if (!text) {
      return res.status(200).json({ ok: true });
    }

    console.log(`Message from ${username} (${chatId}): ${text}`);

    const configId = req.query.configId as string;
    
    if (!configId) {
      console.error('No configId in webhook URL');
      return res.status(200).json({ ok: true });
    }

    const configRef = db.collection('botConfigs').doc(configId);
    const configSnap = await configRef.get();
    
    if (!configSnap.exists) {
      console.error('Config not found:', configId);
      return res.status(200).json({ ok: true });
    }

    const config = configSnap.data() as any;
    const botToken = config.botToken;
    const userId = config.userId;

    if (!botToken || !userId) {
      return res.status(200).json({ ok: true });
    }

    if (config.chatId !== chatId.toString()) {
      await configRef.update({ chatId: chatId.toString() });
    }

    const sendMsg = async (replyText: string) => {
      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: replyText,
            parse_mode: 'Markdown',
          }),
        });
      } catch (e: any) {
        console.error('Send message error:', e);
      }
    };

    const targetLang = config.translationLanguage || 'Arabic';
    const aiApiKey = config.aiApiKey || '';
    const aiBaseUrl = config.aiBaseUrl || 'https://api.kiro.cheap';
    const aiModel = config.aiModel || 'claude-opus-4-6';

    const systemPrompt = `You are a Russian language learning assistant. Your role is to help users learn Russian.
- If they write in Russian, translate it to ${targetLang} and explain grammar briefly.
- If they write in ${targetLang} or English, help them express it in Russian.
- Keep responses focused on language learning. Be concise and helpful.`;

    const callAI = async (prompt: string, useSystemPrompt: boolean = true): Promise<string> => {
      if (!aiApiKey) throw new Error('No AI API key');
      
      const messages: any[] = [];
      if (useSystemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      const response = await fetch(`${aiBaseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aiApiKey}`,
        },
        body: JSON.stringify({
          model: aiModel,
          messages,
          max_tokens: 2048,
        }),
      });

      if (!response.ok) throw new Error('AI API error');
      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    };

    const textLower = text.toLowerCase().trim();

    // ──────────────────────────────────────────────
    // /start and /help — Beautiful formatted message
    // ──────────────────────────────────────────────
    if (textLower === '/start' || textLower === '/help' || textLower === 'help') {
      const helpText = `🤖 *RuLearn Bot* — Your Russian Learning Assistant

━━━━━━━━━━━━━━━━━━━

📝 *How to use:*

🔤 *Translate only:*
Send any Russian text → instant translation
Example: \`привет\`

💾 *Translate & Save:*
Add a period \`.\` at the end → translate + save
Example: \`привет.\`

🔵 *Extract Verbs:*
Add \`v\` at the end → extract all verbs
Example: \`я иду домой и читаю книгу v\`

🟢 *Extract Nouns:*
Add \`n\` at the end → extract all nouns
Example: \`я иду домой и читаю книгу n\`

🟡 *Extract Words:*
Add \`w\` at the end → extract all words
Example: \`я иду домой и читаю книгу w\`

━━━━━━━━━━━━━━━━━━━

📚 *View saved data:*
• \`all\` — Show saved sentences
• \`verbs\` — Show saved verbs
• \`words\` — Show saved words

🗑 *Delete items:*
• \`del verb [word]\` — Delete a verb
• \`del word [word]\` — Delete a word
• \`del sentence [text]\` — Delete a sentence

💬 *Chat:* Send any non-Russian text to chat with AI assistant

━━━━━━━━━━━━━━━━━━━
🌍 Translation language: *${targetLang}*`;
      await sendMsg(helpText);
      return res.status(200).json({ ok: true });
    }

    // ──────────────────────────────────────────────
    // Delete commands: del verb/word/sentence [text]
    // ──────────────────────────────────────────────
    if (textLower.startsWith('del verb ') || textLower.startsWith('del word ') || textLower.startsWith('del sentence ')) {
      const parts = text.split(' ');
      const type = parts[1].toLowerCase(); // verb, word, sentence
      const searchText = parts.slice(2).join(' ').trim();
      
      if (!searchText) {
        await sendMsg('⚠️ Please specify the text to delete.\nExample: `del verb читать`');
        return res.status(200).json({ ok: true });
      }

      // Map to collection name
      const collectionMap: Record<string, string> = {
        'verb': 'verbs',
        'word': 'words', 
        'sentence': 'sentences'
      };
      const collectionName = collectionMap[type];

      if (!collectionName) {
        await sendMsg('⚠️ Invalid type. Use: `del verb`, `del word`, or `del sentence`');
        return res.status(200).json({ ok: true });
      }

      try {
        const q = db.collection(collectionName)
          .where('userId', '==', userId)
          .where('ru', '==', searchText);
        const docs = await q.get();

        if (docs.empty) {
          await sendMsg(`❌ Not found: "${searchText}" in ${collectionName}`);
        } else {
          let deletedCount = 0;
          for (const doc of docs.docs) {
            await doc.ref.delete();
            deletedCount++;
          }
          await sendMsg(`🗑 Deleted ${deletedCount} item(s) from *${collectionName}*: "${searchText}"`);
        }
      } catch (e: any) {
        console.error('Delete error:', e);
        await sendMsg('❌ Failed to delete. Please try again.');
      }
      return res.status(200).json({ ok: true });
    }

    // ──────────────────────────────────────────────
    // Show saved sentences (case-insensitive)
    // ──────────────────────────────────────────────
    if (textLower === 'all') {
      try {
        const q = db.collection('sentences').where('userId', '==', userId).orderBy('timestamp', 'desc').limit(20);
        const docs = await q.get();
        if (docs.empty) {
          await sendMsg('📭 No sentences saved yet.\nSend Russian text ending with `.` to save!');
        } else {
          const items = docs.docs.map(d => d.data());
          const reply = items.map((i, idx) => `${idx + 1}. 🇷🇺 ${i.ru}\n    🌍 ${i.ar}`).join('\n\n');
          await sendMsg(`📚 *Saved Sentences (${items.length}):*\n\n${reply}`.substring(0, 4000));
        }
      } catch (e: any) {
        console.error('Error fetching sentences:', e);
        if (e.code === 9 || e.message?.includes('index')) {
          await sendMsg('⏳ Database index is being created. Please try again in 1-2 minutes.');
        } else {
          await sendMsg('❌ Failed to fetch sentences.');
        }
      }
      return res.status(200).json({ ok: true });
    }

    // ──────────────────────────────────────────────
    // Show saved verbs
    // ──────────────────────────────────────────────
    if (textLower === 'verbs') {
      try {
        const q = db.collection('verbs').where('userId', '==', userId).orderBy('timestamp', 'desc').limit(50);
        const docs = await q.get();
        if (docs.empty) {
          await sendMsg('📭 No verbs saved yet.\nSend Russian text ending with `v` to extract verbs!');
        } else {
          const items = docs.docs.map(d => d.data());
          const reply = items.map((i, idx) => `${idx + 1}. 🔵 ${i.ru} — ${i.ar}`).join('\n');
          await sendMsg(`📚 *Saved Verbs (${items.length}):*\n\n${reply}`.substring(0, 4000));
        }
      } catch (e: any) {
        console.error('Error fetching verbs:', e);
        if (e.code === 9 || e.message?.includes('index')) {
          await sendMsg('⏳ Database index is being created. Please try again in 1-2 minutes.');
        } else {
          await sendMsg('❌ Failed to fetch verbs.');
        }
      }
      return res.status(200).json({ ok: true });
    }

    // ──────────────────────────────────────────────
    // Show saved words
    // ──────────────────────────────────────────────
    if (textLower === 'words') {
      try {
        const q = db.collection('words').where('userId', '==', userId).orderBy('timestamp', 'desc').limit(50);
        const docs = await q.get();
        if (docs.empty) {
          await sendMsg('📭 No words saved yet.\nSend Russian text ending with `n` (nouns) or `w` (all words)!');
        } else {
          const items = docs.docs.map(d => d.data());
          const reply = items.map((i, idx) => `${idx + 1}. 🟢 ${i.ru} — ${i.ar}`).join('\n');
          await sendMsg(`📚 *Saved Words/Nouns (${items.length}):*\n\n${reply}`.substring(0, 4000));
        }
      } catch (e: any) {
        console.error('Error fetching words:', e);
        if (e.code === 9 || e.message?.includes('index')) {
          await sendMsg('⏳ Database index is being created. Please try again in 1-2 minutes.');
        } else {
          await sendMsg('❌ Failed to fetch words.');
        }
      }
      return res.status(200).json({ ok: true });
    }

    // ──────────────────────────────────────────────
    // Save pending items with "."
    // ──────────────────────────────────────────────
    if (text === '.') {
      const pending = await getPending(`${chatId}`);
      if (pending) {
        try {
          let savedCount = 0;
          for (const item of pending.items) {
            await saveToCollection(pending.type, {
              ru: item.ru,
              ar: item.ar,
              timestamp: Date.now(),
              userId
            });
            savedCount++;
          }
          await sendMsg(`✅ Saved ${savedCount} ${pending.type} to database!`);
          await clearPending(`${chatId}`);
        } catch (e: any) {
          console.error('Batch save error:', e);
          await sendMsg('❌ Failed to save items. Please try again.');
        }
      } else {
        await sendMsg('ℹ️ Nothing to save. Extract verbs or words first.');
      }
      return res.status(200).json({ ok: true });
    }

    // ──────────────────────────────────────────────
    // Extract VERBS: text ending with " v" or " V"
    // Extracts ONLY verbs, auto-saves to "verbs" collection
    // ──────────────────────────────────────────────
    if (text.endsWith(' v') || text.endsWith(' V')) {
      const ruText = text.slice(0, -2).trim();
      const prompt = `You are a Russian language expert. From the following Russian text, extract ONLY the VERBS (действия/глаголы). Do NOT include nouns, adjectives, or adverbs. Only verbs.

For each verb, provide:
- "ru": the verb in its infinitive form (инфинитив)
- "ar": the ${targetLang} translation

Return ONLY a valid JSON array. No markdown, no explanation, no other text.
Example output: [{"ru": "читать", "ar": "يقرأ"}, {"ru": "идти", "ar": "يذهب"}]

Text: ${ruText}`;
      try {
        const response = await callAI(prompt, false);
        const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
        const verbs = JSON.parse(jsonStr);
        
        if (!Array.isArray(verbs) || verbs.length === 0) {
          await sendMsg('ℹ️ No verbs found in this text.');
          return res.status(200).json({ ok: true });
        }

        // Auto-save to database
        let savedCount = 0;
        for (const item of verbs) {
          await saveToCollection('verbs', {
            ru: item.ru,
            ar: item.ar,
            timestamp: Date.now(),
            userId
          });
          savedCount++;
        }
        
        const reply = verbs.map((v: any, i: number) => `${i + 1}. 🔵 ${v.ru} — ${v.ar}`).join('\n');
        await sendMsg(`🔵 *Extracted Verbs (${verbs.length}):*\n\n${reply}\n\n✅ Auto-saved to database!`);
      } catch (e) {
        console.error('Verb extraction error:', e);
        await sendMsg('❌ Failed to extract verbs. Please try again.');
      }
      return res.status(200).json({ ok: true });
    }

    // ──────────────────────────────────────────────
    // Extract NOUNS: text ending with " n" or " N"
    // Extracts ONLY nouns, auto-saves to "words" collection
    // ──────────────────────────────────────────────
    if (text.endsWith(' n') || text.endsWith(' N')) {
      const ruText = text.slice(0, -2).trim();
      const prompt = `You are a Russian language expert. From the following Russian text, extract ONLY the NOUNS (существительные/أسماء). Do NOT include verbs, adjectives, or adverbs. Only nouns.

For each noun, provide:
- "ru": the noun in its nominative singular form (именительный падеж)
- "ar": the ${targetLang} translation

Return ONLY a valid JSON array. No markdown, no explanation, no other text.
Example output: [{"ru": "книга", "ar": "كتاب"}, {"ru": "дом", "ar": "منزل"}]

Text: ${ruText}`;
      try {
        const response = await callAI(prompt, false);
        const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
        const nouns = JSON.parse(jsonStr);
        
        if (!Array.isArray(nouns) || nouns.length === 0) {
          await sendMsg('ℹ️ No nouns found in this text.');
          return res.status(200).json({ ok: true });
        }

        // Auto-save to "words" collection
        let savedCount = 0;
        for (const item of nouns) {
          await saveToCollection('words', {
            ru: item.ru,
            ar: item.ar,
            timestamp: Date.now(),
            userId
          });
          savedCount++;
        }
        
        const reply = nouns.map((n: any, i: number) => `${i + 1}. 🟢 ${n.ru} — ${n.ar}`).join('\n');
        await sendMsg(`🟢 *Extracted Nouns (${nouns.length}):*\n\n${reply}\n\n✅ Auto-saved to database!`);
      } catch (e) {
        console.error('Noun extraction error:', e);
        await sendMsg('❌ Failed to extract nouns. Please try again.');
      }
      return res.status(200).json({ ok: true });
    }

    // ──────────────────────────────────────────────
    // Extract ALL WORDS: text ending with " w" or " W"
    // Extracts nouns + adjectives + adverbs, auto-saves to "words"
    // ──────────────────────────────────────────────
    if (text.endsWith(' w') || text.endsWith(' W')) {
      const ruText = text.slice(0, -2).trim();
      const prompt = `You are a Russian language expert. From the following Russian text, extract the main words: nouns, adjectives, and adverbs. Do NOT include verbs (глаголы).

For each word, provide:
- "ru": the word in its base/dictionary form
- "ar": the ${targetLang} translation

Return ONLY a valid JSON array. No markdown, no explanation, no other text.
Example output: [{"ru": "книга", "ar": "كتاب"}, {"ru": "красивый", "ar": "جميل"}]

Text: ${ruText}`;
      try {
        const response = await callAI(prompt, false);
        const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
        const words = JSON.parse(jsonStr);
        
        if (!Array.isArray(words) || words.length === 0) {
          await sendMsg('ℹ️ No words found in this text.');
          return res.status(200).json({ ok: true });
        }

        // Auto-save to "words" collection
        let savedCount = 0;
        for (const item of words) {
          await saveToCollection('words', {
            ru: item.ru,
            ar: item.ar,
            timestamp: Date.now(),
            userId
          });
          savedCount++;
        }
        
        const reply = words.map((w: any, i: number) => `${i + 1}. 🟡 ${w.ru} — ${w.ar}`).join('\n');
        await sendMsg(`🟡 *Extracted Words (${words.length}):*\n\n${reply}\n\n✅ Auto-saved to database!`);
      } catch (e) {
        console.error('Word extraction error:', e);
        await sendMsg('❌ Failed to extract words. Please try again.');
      }
      return res.status(200).json({ ok: true });
    }

    // ──────────────────────────────────────────────
    // Translate and save (ends with ".")
    // ──────────────────────────────────────────────
    if (text.endsWith('.') && text.length > 1) {
      const ruText = text.slice(0, -1).trim();
      const prompt = `Translate the following text to ${targetLang}. Return ONLY the ${targetLang} translation, nothing else.\n\nText: ${ruText}`;
      try {
        const translation = await callAI(prompt, false);
        await saveToCollection('sentences', {
          ru: ruText,
          ar: translation.trim(),
          timestamp: Date.now(),
          userId
        });
        await sendMsg(`🌍 *Translation:*\n🇷🇺 ${ruText}\n🔹 ${translation.trim()}\n\n✅ Saved to database!`);
      } catch (e: any) {
        console.error('Translation error:', e);
        await sendMsg('❌ Translation failed.');
      }
      return res.status(200).json({ ok: true });
    }

    // ──────────────────────────────────────────────
    // Russian text WITHOUT period → translate only, do NOT save
    // ──────────────────────────────────────────────
    if (containsCyrillic(text)) {
      const prompt = `Translate the following Russian text to ${targetLang}. Return ONLY the ${targetLang} translation, nothing else.\n\nText: ${text}`;
      try {
        const translation = await callAI(prompt, false);
        await sendMsg(`🌍 *Translation:*\n🇷🇺 ${text}\n🔹 ${translation.trim()}\n\n💡 _Add a period (.) at the end to save to database._`);
      } catch (e) {
        await sendMsg('❌ Translation failed. Please try again.');
      }
      return res.status(200).json({ ok: true });
    }

    // ──────────────────────────────────────────────
    // Default: AI conversation
    // ──────────────────────────────────────────────
    try {
      const aiResponse = await callAI(text, true);
      await sendMsg(aiResponse.trim());
    } catch (e) {
      await sendMsg('❌ AI Error. Please check your AI API settings.');
    }

    return res.status(200).json({ ok: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return res.status(200).json({ ok: true });
  }
}
