const OpenAI = require('openai');

// AIMLAPI configuration
const baseURL = "https://api.aimlapi.com";
const apiKey = process.env.BOT_API;
const systemPrompt = "You are a emergency support agent. Be descriptive and helpful";

const api = new OpenAI({
  apiKey,
  baseURL,
});

const processMessage = async (req, res) => {
  const { message, conversationHistory } = req.body; // Expect these from the frontend

  try {
    const apiHistory = conversationHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));

    const completion = await api.chat.completions.create({
      model: "mistralai/Mistral-7B-Instruct-v0.2",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        ...apiHistory, // Include conversation history
        {
          role: "user",
          content: message,
        },
      ],
      temperature: 0.7,
      max_tokens: 256,
    });
     
    const botMessage = completion.choices[0].message.content;
    res.status(200).json({ role: 'bot', content: botMessage });

  } catch (error) {
    console.error('AIMLAPI Error:', error);
    res.status(500).json({ 
      role: 'bot', 
      content: 'Sorry, something went wrong. Please try again or contact support if the issue persists.' 
    });
  }
};

module.exports = processMessage;