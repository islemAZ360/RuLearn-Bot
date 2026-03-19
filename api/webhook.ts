import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin (for server-side)
if (!getApps().length) {
  try {
    // Use environment variable for service account or default credentials
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      : undefined;

    if (serviceAccount) {
      initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || 'n8n360-8ba3b'
      });
    } else {
      // Fallback to application default credentials
      initializeApp({
        projectId: 'n8n360-8ba3b'
      });
    }
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
    throw error;
  }
}

const db = getFirestore();

// Helper function to detect if text contains Cyrillic (Russian) characters
function containsCyrillic(text: string): boolean {
  return /[\u0400-\u04FF]/.test(text);
}

// Helper function to save data with proper error handling
async function saveToCollection(collectionName: string, data: any) {
  try {
    const ref = db.collection(collectionName).doc();
    await ref.set(data);
    return ref.id;
  } catch (error: any) {
    console.error(`Error saving to ${collectionName}:`, error);
    throw error;
  }
}

// Helper function to save/get pending items from Firestore (persistent across serverless invocations)
async function savePending(chatId: string, type: 'verbs' | 'words', items: {ru: string, ar: string}[]) {
  await db.collection('pendingSaves').doc(chatId).set({ type, items, timestamp: Date.now() });
}

async function getPending(chatId: string): Promise<{ type: 'verbs' | 'words', items: {ru: string, ar: string}[] } | null> {
  const doc = await db.collection('pendingSaves').doc(chatId).get();
  if (!doc.exists) return null;
  return doc.data() as any;
}

async function clearPending(chatId: string) {
  await db.collection('pendingSaves').doc(chatId).delete();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle GET request - return webhook status
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, message: 'Webhook is active' });
  }

  // Only accept POST requests from Telegram
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

    // Get config ID from query params (set when webhook was registered)
    const configId = req.query.configId as string;
    
    if (!configId) {
      console.error('No configId in webhook URL');
      return res.status(200).json({ ok: true });
    }

    // Find bot config by configId
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
      console.error('Invalid config data:', { botToken: !!botToken, userId: !!userId });
      return res.status(200).json({ ok: true });
    }

    // Update chatId if different (user might message from different chat)
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

    // System prompt for AI to act as a Russian language learning assistant
    const systemPrompt = `You are a Russian language learning assistant. Your primary role is to help users learn Russian. 
When a user sends you a message:
- If they write in Russian, translate it to ${targetLang} and explain any grammar points briefly.
- If they write in ${targetLang} or English, help them express it in Russian.
- Keep your responses focused on language learning.
- Be concise and helpful.
- Always respond in the context of Russian language learning.`;

    // Helper to call AI with system prompt
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

    // Normalize text for command matching (case-insensitive)
    const textLower = text.toLowerCase().trim();

    // Handle commands
    if (textLower === '/start' || textLower === '/help' || textLower === 'help') {
      const helpText = `Welcome! 🤖
Here is how I can help you:

1. **Normal Conversation**: Send any message and I will reply as a Russian language assistant.
2. **Translate & Save**: Send text ending with a period (e.g., привет.). I will translate it to **${targetLang}** and save it.
3. **Just Translate**: Send Russian text WITHOUT a period and I will translate it without saving.
4. **Extract Verbs**: Send text ending with v (e.g., я иду домой v).
5. **Extract Words**: Send text ending with w (e.g., я иду домой w).
6. **Save Extractions**: After extracting, send . to save!

**Commands**:
- /help: Show this menu
- all: Show saved sentences
- verbs: Show saved verbs
- words: Show saved words`;
      await sendMsg(helpText);
      return res.status(200).json({ ok: true });
    }

    // Show saved sentences (case-insensitive)
    if (textLower === 'all') {
      try {
        const q = db.collection('sentences').where('userId', '==', userId).orderBy('timestamp', 'desc').limit(20);
        const docs = await q.get();
        if (docs.empty) {
          await sendMsg('No sentences saved yet.');
        } else {
          const items = docs.docs.map(d => d.data());
          const reply = items.map(i => `${i.ru}\n${i.ar}`).join('\n\n');
          await sendMsg(`**Saved Sentences:**\n\n${reply}`.substring(0, 4000));
        }
      } catch (e: any) {
        console.error('Error fetching sentences:', e);
        // Check if it's an index error and provide helpful message
        if (e.code === 9 || e.message?.includes('index')) {
          await sendMsg('Database index is being created. Please try again in a few minutes.\n\nIf this persists, check the Firebase Console for missing indexes.');
        } else {
          await sendMsg('Failed to fetch sentences.');
        }
      }
      return res.status(200).json({ ok: true });
    }

    // Show saved verbs (case-insensitive)
    if (textLower === 'verbs') {
      try {
        const q = db.collection('verbs').where('userId', '==', userId).orderBy('timestamp', 'desc').limit(50);
        const docs = await q.get();
        if (docs.empty) {
          await sendMsg('No verbs saved yet.');
        } else {
          const items = docs.docs.map(d => d.data());
          const reply = items.map(i => `${i.ru} - ${i.ar}`).join('\n');
          await sendMsg(`**Saved Verbs:**\n\n${reply}`.substring(0, 4000));
        }
      } catch (e: any) {
        console.error('Error fetching verbs:', e);
        if (e.code === 9 || e.message?.includes('index')) {
          await sendMsg('Database index is being created. Please try again in a few minutes.');
        } else {
          await sendMsg('Failed to fetch verbs.');
        }
      }
      return res.status(200).json({ ok: true });
    }

    // Show saved words (case-insensitive)
    if (textLower === 'words') {
      try {
        const q = db.collection('words').where('userId', '==', userId).orderBy('timestamp', 'desc').limit(50);
        const docs = await q.get();
        if (docs.empty) {
          await sendMsg('No words saved yet.');
        } else {
          const items = docs.docs.map(d => d.data());
          const reply = items.map(i => `${i.ru} - ${i.ar}`).join('\n');
          await sendMsg(`**Saved Words:**\n\n${reply}`.substring(0, 4000));
        }
      } catch (e: any) {
        console.error('Error fetching words:', e);
        if (e.code === 9 || e.message?.includes('index')) {
          await sendMsg('Database index is being created. Please try again in a few minutes.');
        } else {
          await sendMsg('Failed to fetch words.');
        }
      }
      return res.status(200).json({ ok: true });
    }

    // Save pending items (persistent via Firestore)
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
          await sendMsg(`Saved ${savedCount} ${pending.type} to database! ✅`);
          await clearPending(`${chatId}`);
        } catch (e: any) {
          console.error('Batch save error:', e);
          await sendMsg('Failed to save items. Please try again.');
        }
      } else {
        await sendMsg('Nothing to save. Extract verbs or words first.');
      }
      return res.status(200).json({ ok: true });
    }

    // Extract verbs
    if (text.endsWith(' v') || text.endsWith(' V')) {
      const ruText = text.slice(0, -2).trim();
      const prompt = `Extract all verbs from the following text. Return ONLY a valid JSON array of objects, where each object has "ru" (the verb in infinitive/base form) and "ar" (the ${targetLang} translation). Do not include any other text or markdown formatting outside the JSON array.\n\nText: ${ruText}`;
      try {
        const response = await callAI(prompt, false);
        const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
        const verbs = JSON.parse(jsonStr);
        await savePending(`${chatId}`, 'verbs', verbs);
        const reply = verbs.map((v: any) => `${v.ru} - ${v.ar}`).join('\n');
        await sendMsg(`**Extracted Verbs (${targetLang}):**\n${reply}\n\nReply with . to save.`);
      } catch (e) {
        await sendMsg('Failed to extract verbs. AI returned invalid format.');
      }
      return res.status(200).json({ ok: true });
    }

    // Extract words
    if (text.endsWith(' w') || text.endsWith(' W')) {
      const ruText = text.slice(0, -2).trim();
      const prompt = `Extract the main words (nouns, adjectives, adverbs) from the following text. Return ONLY a valid JSON array of objects, where each object has "ru" (the word in base form) and "ar" (the ${targetLang} translation). Do not include any other text or markdown formatting outside the JSON array.\n\nText: ${ruText}`;
      try {
        const response = await callAI(prompt, false);
        const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
        const words = JSON.parse(jsonStr);
        await savePending(`${chatId}`, 'words', words);
        const reply = words.map((w: any) => `${w.ru} - ${w.ar}`).join('\n');
        await sendMsg(`**Extracted Words (${targetLang}):**\n${reply}\n\nReply with . to save.`);
      } catch (e) {
        await sendMsg('Failed to extract words. AI returned invalid format.');
      }
      return res.status(200).json({ ok: true });
    }

    // Translate and save (ends with .)
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
        await sendMsg(`**Translation (${targetLang}):**\n${translation.trim()}\n\n*Saved to database! ✅*`);
      } catch (e: any) {
        console.error('Translation error:', e);
        await sendMsg('Translation failed.');
      }
      return res.status(200).json({ ok: true });
    }

    // Russian text WITHOUT period -> translate only, do NOT save
    if (containsCyrillic(text)) {
      const prompt = `Translate the following Russian text to ${targetLang}. Return ONLY the ${targetLang} translation, nothing else.\n\nText: ${text}`;
      try {
        const translation = await callAI(prompt, false);
        await sendMsg(`**Translation (${targetLang}):**\n${translation.trim()}\n\n_💡 Add a period (.) at the end to translate and save._`);
      } catch (e) {
        await sendMsg('Translation failed. Please try again.');
      }
      return res.status(200).json({ ok: true });
    }

    // Default AI conversation (with system prompt for language learning context)
    try {
      const aiResponse = await callAI(text, true);
      await sendMsg(aiResponse.trim());
    } catch (e) {
      await sendMsg('AI Error. Please check your AI API settings.');
    }

    return res.status(200).json({ ok: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return res.status(200).json({ ok: true }); // Always return 200 to Telegram
  }
}
