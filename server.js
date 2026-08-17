import express from 'express';
import ollama from 'ollama';
import { authenticateToken, handleLogin, USERS } from './auth.js';
import { toolsRegistry, tools } from './tools/registry.js';

const app = express();
const PORT = 3000;

app.use(express.json());
app.post('/api/login', handleLogin);
//app.use(authenticateToken);
app.use(express.static('public'));

// 1. Tool Implementations moved to lib/tools.js

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

app.post("/api/rag/ingest-folder", authenticateToken, async (req, res) => {
  const { folderPath } = req.body;

  if (!folderPath) {
    return res.status(400).json({ error: "folderPath parameter is required." });
  }

  try {
    const result = await RAGModule.ingestDirectory(folderPath);
    return res.json({ status: "success", chunksIngested: result.count });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Agent Web UI ready at http://localhost:${PORT}`);
});