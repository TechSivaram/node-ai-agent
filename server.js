import express from 'express';
import ollama from 'ollama';
import { authenticateToken, handleLogin, USERS } from './auth.js';

const app = express();
const PORT = 3000;

app.use(express.json());
app.post('/api/login', handleLogin);
//app.use(authenticateToken);
app.use(express.static('public'));

// 1. Tool Implementations (Local JavaScript execution)
const toolsRegistry = {
  getSystemMetrics: async (args, user) => {
    return { cpuUsage: 42, memoryUsage: '3.2GB / 16GB', status: 'Healthy' };
  },

  restartService: async (args, user) => {
    // Role-based authorization check
    if (user.role !== 'admin') {
      return {
        error: `Permission Denied: User '${user.username}' (${user.role}) cannot restart services.`,
      };
    }

    const serviceName = typeof args === 'string' ? args : args?.serviceName;
    return {
      service: serviceName,
      status: 'restarted',
      timestamp: new Date().toISOString(),
    };
  },
};

const tools = [
  {
    type: 'function',
    function: {
      name: 'getSystemMetrics',
      description: 'Get current system CPU and memory metrics.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'restartService',
      description: 'Restart a named system service (Admin only).',
      parameters: {
        type: 'object',
        properties: {
          serviceName: {
            type: 'string',
            description: "Name of the service to restart (e.g., 'redis').",
          },
        },
        required: ['serviceName'],
      },
    },
  },
];

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = USERS.find((u) => u.username === username);

  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  // Issue JWT Token containing user identity and role
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({ token, role: user.role, username: user.username });
});

// 3. Streaming Chat Endpoint (SSE)
app.post('/api/chat', authenticateToken, async (req, res) => {
  const { prompt, history = [] } = req.body;
  const currentUser = req.user;

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (type, payload) => {
    res.write(`data: ${JSON.stringify({ type, payload })}\n\n`);
  };

  const SYSTEM_PROMPT = `You are an AI assistant for user '${currentUser.username}' (Role: ${currentUser.role}). Use tools when required.`;

  let messages = history.length > 0 ? history : [{ role: 'system', content: SYSTEM_PROMPT }];
  messages.push({ role: 'user', content: prompt });

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
            result = await fn(args, currentUser);
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