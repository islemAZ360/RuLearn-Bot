import type { VercelRequest, VercelResponse } from '@vercel/node';

// This webhook receives messages from Telegram automatically
// No need to keep a phone or browser open!

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only accept POST requests from Telegram
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true, message: 'Webhook is active' });
  }

  try {
    const update = req.body;
    
    // Get bot token from environment or use default
    const botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    
    if (!botToken) {
      console.error('No bot token configured');
      return res.status(200).json({ ok: true });
    }

    // Handle incoming message
    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text || '';
      const userId = update.message.from?.id;
      const username = update.message.from?.username || 'User';

      console.log(`Message from ${username} (${userId}): ${text}`);

      // Get AI API settings from environment
      const aiApiKey = process.env.AI_API_KEY || '';
      const aiBaseUrl = process.env.AI_BASE_URL || 'https://api.kiro.cheap';
      const aiModel = process.env.AI_MODEL || 'claude-opus-4-6';

      let replyText = '';

      if (aiApiKey) {
        // Call AI API
        try {
          const aiResponse = await fetch(`${aiBaseUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${aiApiKey}`,
            },
            body: JSON.stringify({
              model: aiModel,
              messages: [{ role: 'user', content: text }],
              max_tokens: 1024,
            }),
          });

          if (aiResponse.ok) {
            const data = await aiResponse.json();
            replyText = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
          } else {
            replyText = 'Sorry, AI service is temporarily unavailable.';
          }
        } catch (aiError) {
          console.error('AI Error:', aiError);
          replyText = 'Sorry, I encountered an error processing your request.';
        }
      } else {
        // Simple echo if no AI configured
        replyText = `Hello ${username}! I received your message: "${text}"\n\nTo enable AI responses, configure AI_API_KEY in Vercel environment variables.`;
      }

      // Send reply via Telegram API
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: replyText,
          parse_mode: 'Markdown',
        }),
      });
    }

    return res.status(200).json({ ok: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return res.status(200).json({ ok: true }); // Always return 200 to Telegram
  }
}
