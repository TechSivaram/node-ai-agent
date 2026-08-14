import express from 'express';
import ollama from 'ollama';

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

// 1. Tool Implementations (Local JavaScript execution)
const toolsRegistry = {
  getSystemMetrics: async () => {
    return { cpuUsage: 42, memoryUsage: "3.2GB / 16GB", status: "Healthy" };
  },
  restartService: async (args) => {
    // Defensive parsing for local model parameter outputs
    const serviceName = typeof args === 'string' ? args : args?.serviceName;
    return { service: serviceName, status: "restarted", timestamp: new Date().toISOString() };
  }
};

// 2. Schema Declarations (OpenAI Function format)
const tools = [
  {
    type: 'function',
    function: {
      name: 'getSystemMetrics',
      description: 'Get current system CPU and memory metrics.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'restartService',
      description: 'Restart a named system service when needed.',
      parameters: {
        type: 'object',
        properties: {
          serviceName: {
            type: 'string',
            description: "Name of the service to restart (e.g., 'redis', 'postgres').",
          },
        },
        required: ['serviceName'],
      },
    },
  },
];

// 3. Streaming Chat Endpoint (SSE)
app.post('/api/chat', async (req, res) => {
  const { prompt } = req.body;

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (type, payload) => {
    res.write(`data: ${JSON.stringify({ type, payload })}\n\n`);
  };

  const SYSTEM_PROMPT = `You are a helpful AI system assistant.
You have access to tools. Use tools only when required to fulfill the user's prompt.
When no tool is needed or after reviewing tool output, provide a clear answer in proper format.`;

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: prompt }
  ];

  let turns = 0;
  const MAX_TURNS = 5;

  try {
    while (turns < MAX_TURNS) {
      turns++;

      // Request inference from local Ollama instance
      const response = await ollama.chat({
        model: 'llama3.2',
        messages: messages,
        tools: tools,
      });

      messages.push(response.message);
      const toolCalls = response.message.tool_calls;

      // Model finished reasoning -> send final text answer
      if (!toolCalls || toolCalls.length === 0) {
        sendEvent('message', response.message.content);
        break;
      }

      // Model requested tool executions
      for (const call of toolCalls) {
        const name = call.function.name;
        const args = call.function.arguments;

        // Stream action update to browser
        sendEvent('action', `Executing: ${name}(${JSON.stringify(args)})`);

        const fn = toolsRegistry[name];
        let result;

        if (!fn) {
          result = { error: `Tool '${name}' not recognized.` };
        } else {
          try {
            result = await fn(args);
          } catch (err) {
            result = { error: err.message };
          }
        }

        // Stream tool result back to browser
        sendEvent('action_output', JSON.stringify(result));

        // Feed function result into message history for the next iteration
        messages.push({
          role: 'tool',
          content: JSON.stringify(result),
        });
      }
    }
  } catch (error) {
    sendEvent('error', error.message);
  } finally {
    sendEvent('done', true);
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Agent Web UI ready at http://localhost:${PORT}`);
});