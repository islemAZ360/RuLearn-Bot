import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin (for server-side)
if (!getApps().length) {
  // Use environment variable for service account or default credentials
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : undefined;

  initializeApp(serviceAccount ? {
    credential: cert(serviceAccount)
  } : {
    projectId: 'n8n360-8ba3b'
  });
}

const db = getFirestore();

// Pending saves storage (in-memory, per request)
const pendingSaves: Record<string, { type: 'verbs' | 'words', items: {ru: string, ar: string}[] }> = {};

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

    // Helper to call AI
    const callAI = async (prompt: string): Promise<string> => {
      if (!aiApiKey) throw new Error('No AI API key');
      
      const response = await fetch(`${aiBaseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aiApiKey}`,
        },
        body: JSON.stringify({
          model: aiModel,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2048,
        }),
      });

      if (!response.ok) throw new Error('AI API error');
      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    };

    // Handle commands
    if (text === '/start' || text === '/help' || text === 'help') {
      const helpText = `Welcome! 🤖
Here is how I can help you:

1. **Normal Conversation**: Send any message and I will reply as an AI assistant.
2. **Translate & Save**: Send text ending with a period (e.g., привет.). I will translate it to **${targetLang}** and save it.
3. **Extract Verbs**: Send text ending with v (e.g., я иду домой v).
4. **Extract Words**: Send text ending with w (e.g., я иду домой w).
5. **Save Extractions**: After extracting, send . to save!

**Commands**:
- /help: Show this menu
- all: Show saved sentences
- verbs: Show saved verbs
- words: Show saved words`;
      await sendMsg(helpText);
      return res.status(200).json({ ok: true });
    }

    // Show saved sentences
    if (text === 'all') {
      const q = db.collection('sentences').where('userId', '==', userId).orderBy('timestamp', 'desc').limit(20);
      const docs = await q.get();
      if (docs.empty) {
        await sendMsg('No sentences saved yet.');
      } else {
        const items = docs.docs.map(d => d.data());
        const reply = items.map(i => `${i.ru}\n${i.ar}`).join('\n\n');
        await sendMsg(`**Saved Sentences:**\n\n${reply}`.substring(0, 4000));
      }
      return res.status(200).json({ ok: true });
    }

    // Show saved verbs
    if (text === 'verbs') {
      const q = db.collection('verbs').where('userId', '==', userId).orderBy('timestamp', 'desc').limit(50);
      const docs = await q.get();
      if (docs.empty) {
        await sendMsg('No verbs saved yet.');
      } else {
        const items = docs.docs.map(d => d.data());
        const reply = items.map(i => `${i.ru} - ${i.ar}`).join('\n');
        await sendMsg(`**Saved Verbs:**\n\n${reply}`.substring(0, 4000));
      }
      return res.status(200).json({ ok: true });
    }

    // Show saved words
    if (text === 'words') {
      const q = db.collection('words').where('userId', '==', userId).orderBy('timestamp', 'desc').limit(50);
      const docs = await q.get();
      if (docs.empty) {
        await sendMsg('No words saved yet.');
      } else {
        const items = docs.docs.map(d => d.data());
        const reply = items.map(i => `${i.ru} - ${i.ar}`).join('\n');
        await sendMsg(`**Saved Words:**\n\n${reply}`.substring(0, 4000));
      }
      return res.status(200).json({ ok: true });
    }

    // Save pending items
    if (text === '.') {
      const pendingKey = `${chatId}`;
      const pending = pendingSaves[pendingKey];
      if (pending) {
        const batch = db.batch();
        for (const item of pending.items) {
          const ref = db.collection(pending.type).doc();
          batch.set(ref, {
            ru: item.ru,
            ar: item.ar,
            timestamp: Date.now(),
            userId
          });
        }
        await batch.commit();
        await sendMsg(`Saved ${pending.items.length} ${pending.type} to database! ✅`);
        delete pendingSaves[pendingKey];
      } else {
        await sendMsg('Nothing to save. Extract verbs or words first.');
      }
      return res.status(200).json({ ok: true });
    }

    // Extract verbs
    if (text.endsWith(' v')) {
      const ruText = text.slice(0, -2).trim();
      const prompt = `Extract all verbs from the following text. Return ONLY a valid JSON array of objects, where each object has "ru" (the verb in infinitive/base form) and "ar" (the ${targetLang} translation). Do not include any other text or markdown formatting outside the JSON array.\n\nText: ${ruText}`;
      try {
        const response = await callAI(prompt);
        const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
        const verbs = JSON.parse(jsonStr);
        pendingSaves[`${chatId}`] = { type: 'verbs', items: verbs };
        const reply = verbs.map((v: any) => `${v.ru} - ${v.ar}`).join('\n');
        await sendMsg(`**Extracted Verbs (${targetLang}):**\n${reply}\n\nReply with . to save.`);
      } catch (e) {
        await sendMsg('Failed to extract verbs. AI returned invalid format.');
      }
      return res.status(200).json({ ok: true });
    }

    // Extract words
    if (text.endsWith(' w')) {
      const ruText = text.slice(0, -2).trim();
      const prompt = `Extract the main words (nouns, adjectives, adverbs) from the following text. Return ONLY a valid JSON array of objects, where each object has "ru" (the word in base form) and "ar" (the ${targetLang} translation). Do not include any other text or markdown formatting outside the JSON array.\n\nText: ${ruText}`;
      try {
        const response = await callAI(prompt);
        const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
        const words = JSON.parse(jsonStr);
        pendingSaves[`${chatId}`] = { type: 'words', items: words };
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
        const translation = await callAI(prompt);
        await db.collection('sentences').add({
          ru: ruText,
          ar: translation.trim(),
          timestamp: Date.now(),
          userId
        });
        await sendMsg(`**Translation (${targetLang}):**\n${translation.trim()}\n\n*Saved to database! ✅*`);
      } catch (e) {
        await sendMsg('Translation failed.');
      }
      return res.status(200).json({ ok: true });
    }

    // Default AI conversation
    try {
      const aiResponse = await callAI(text);
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
