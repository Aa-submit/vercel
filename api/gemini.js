export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const { messages, model = "gemini-pro" } = req.body;

    if (!apiKey) {
      return res.status(500).json({ error: '请配置 GEMINI_API_KEY' });
    }
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages 参数必须是数组' });
    }

    // 转换 OpenAI 格式为 Gemini 格式
    const contents = messages.map(msg => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }]
    }));

    // 转发请求到 Gemini API
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
      }
    );

    const data = await resp.json();

    // 转换 Gemini 响应为 OpenAI 格式（适配 Cherry Studio）
    const openAIResponse = {
      id: `chatcmpl-${Date.now()}`,
      object: "chat.completion",
      created: Date.now(),
      model: model,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: data.candidates?.[0]?.content?.parts?.[0]?.text || "无响应"
          },
          finish_reason: "stop"
        }
      ],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    };

    res.status(200).json(openAIResponse);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
