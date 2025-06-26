const axios = require('axios');

// In-memory store for user usage
const userUsage = new Map();

// AIMLAPI configuration
const baseURL = process.env.AIMLAPI_BASE_URL || 'https://api.aimlapi.com/v1';
const apiKey = process.env.BOT_API;
const systemPrompt = "You are an emergency support agent. Be descriptive and helpful";
const maxUsage = parseInt(process.env.MAX_USAGE, 10) || 2; // Default to 2 calls

// Validate environment variables
if (!apiKey || !baseURL || !process.env.AIMLAPI_MODEL) {
  console.error('Missing environment variables:', {
    BOT_API: !!apiKey,
    AIMLAPI_BASE_URL: !!baseURL,
    AIMLAPI_MODEL: !!process.env.AIMLAPI_MODEL,
  });
  throw new Error('Missing required environment variables');
}

const processMessage = async (req, res) => {
  const { message, conversationHistory } = req.body;
  const userIp = req.ip || req.connection.remoteAddress; // Get user IP

  // Validate input
  if (!message || !Array.isArray(conversationHistory)) {
    console.error('Invalid request:', { message, conversationHistory, userIp });
    return res.status(400).json({
      role: 'bot',
      content: 'Invalid request: message and conversationHistory are required.',
    });
  }

  try {
    // Check usage limit
    const currentUsage = userUsage.get(userIp) || 0;
    if (currentUsage >= maxUsage) {
      console.warn('Usage limit exceeded:', { userIp, currentUsage, maxUsage });
      return res.status(429).json({
        role: 'bot',
        content: `You have reached the usage limit of ${maxUsage} requests. Please try again later or contact support.`,
      });
    }

    
    // Map conversation history to AIMLAPI format
    const apiHistory = conversationHistory
      .filter(msg => msg && typeof msg === 'object' && msg.role && msg.content && msg.role !== 'bot')
      .map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      }));

    const requestPayload = {
      model: process.env.AIMLAPI_MODEL || 'mistralai/Mixtral-8x7B-Instruct-v0.1',
      messages: [
        {
          role: 'assistant',
          content: systemPrompt + (conversationHistory.length === 1 ? '\n\n' + message : ''),
        },
        ...apiHistory,
        {
          role: 'user',
          content: message,
        },
      ],
      temperature: 0.7,
      max_tokens: 256,
    };
    console.log('Request Payload:', JSON.stringify(requestPayload, null, 2));

    const retryRequest = async (fn, retries = 3, delay = 1000) => {
      for (let i = 0; i < retries; i++) {
        try {
          return await fn();
        } catch (error) {
          console.error(`Retry ${i + 1}/${retries} failed:`, error.message, error.response?.data || 'No response body');
          if (i === retries - 1) throw error;
          if (error.response?.status === 429 || error.response?.status === 400) {
            await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
          } else {
            throw error;
          }
        }
      }
    };

    const response = await retryRequest(() =>
      axios.post(
        `${baseURL}/chat/completions`,
        requestPayload,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      )
    );

    console.log('AIMLAPI Response:', response.data);
    const botMessage = response.data.choices[0].message.content;

    // Increment usage only on successful response
    userUsage.set(userIp, currentUsage + 1);
    console.log('Usage updated:', { userIp, newUsage: currentUsage + 1 });

    res.status(200).json({ role: 'bot', content: botMessage });
  } catch (error) {
    console.error('AIMLAPI Error:', error.message, error.response?.data || 'No response body');
    if (error.response?.status === 429) {
      return res.status(429).json({
        role: 'bot',
        content: 'Rate limit exceeded for AIMLAPI. Please try again later.',
      });
    }
    if (error.response?.data?.meta?.some(e => e.code === 'invalid_union_discriminator') || error.response?.data?.some(e => e.error?.message.includes('Invalid role'))) {
      return res.status(400).json({
        role: 'bot',
        content: 'Invalid request format. Please try again or contact support.',
      });
    }
    return res.status(500).json({
      role: 'bot',
      content: 'Sorry, something went wrong. Please try again or contact support.',
    });
  }
};

module.exports = processMessage;