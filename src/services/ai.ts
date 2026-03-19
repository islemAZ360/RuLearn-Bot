export type Message = { role: 'user' | 'ai' | 'system', content: string };

export async function callAI(
  input: string | Message[],
  onChunk?: (chunk: string) => void
) {
  const apiKey = localStorage.getItem('ai_api_key') || '';
  let baseUrl = localStorage.getItem('ai_base_url') || 'https://api.kiro.cheap';
  
  // Convert old proxy path to direct URL
  if (baseUrl === '/api/ai') {
    baseUrl = 'https://api.kiro.cheap';
  }
  
  const model = localStorage.getItem('ai_model') || 'claude-opus-4-6';

  const messages: Message[] = typeof input === 'string' 
    ? [{ role: 'user', content: input }] 
    : input;

  // Format messages for OpenAI API (change 'ai' to 'assistant')
  const formattedMessages = messages.map(m => ({
    role: m.role === 'ai' ? 'assistant' : m.role,
    content: m.content
  }));

  try {
    // Use our Vercel proxy to avoid CORS issues
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        baseUrl: baseUrl,
        model: model,
        messages: formattedMessages,
        max_tokens: 2048,
        stream: !!onChunk
      })
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`API Error: ${res.status} - ${errorText}`);
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.delta?.content || '';
      if (onChunk) onChunk(content);
      return content;
    }

    if (onChunk && res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
      let fullText = '';
      let buffer = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep the last incomplete line in the buffer
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;
            
            if (trimmedLine === 'data: [DONE]') {
              return fullText;
            }
            if (trimmedLine.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(trimmedLine.replace(/^data: /, ''));
                const content = parsed.choices?.[0]?.delta?.content || '';
                if (content) {
                  fullText += content;
                  onChunk(content);
                }
              } catch (e) {
                // Ignore parse errors for incomplete chunks
              }
            }
          }
        }
      }
      return fullText;
    } else {
      const data = await res.json();
      return data.choices?.[0]?.message?.content || '';
    }
  } catch (error: any) {
    console.error("AI Error:", error);
    if (error.message.includes('Failed to fetch')) {
      throw new Error(`Network Error. Please check your internet connection.`);
    }
    throw new Error(`Failed to communicate with AI: ${error.message}`);
  }
}
