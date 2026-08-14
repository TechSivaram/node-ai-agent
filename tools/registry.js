// Tool Implementations (Local JavaScript execution)
import { hasToolPermission, createPermissionDeniedError } from './permissions.js';

const toolsRegistry = {
  getSystemMetrics: async (args, user) => {
    if (!hasToolPermission(user.role, 'getSystemMetrics')) {
      return createPermissionDeniedError(user.username, user.role, 'getSystemMetrics');
    }
    return { cpuUsage: 42, memoryUsage: '3.2GB / 16GB', status: 'Healthy' };
  },

  restartService: async (args, user) => {
    if (!hasToolPermission(user.role, 'restartService')) {
      return createPermissionDeniedError(user.username, user.role, 'restartService');
    }

    const serviceName = typeof args === 'string' ? args : args?.serviceName;
    return {
      service: serviceName,
      status: 'restarted',
      timestamp: new Date().toISOString(),
    };
  },

  listDirectory: async (args, user) => {
    if (!hasToolPermission(user.role, 'listDirectory')) {
      return createPermissionDeniedError(user.username, user.role, 'listDirectory');
    }

    const dir = typeof args === 'string' ? args : args?.dir || '.';
    try {
      const fs = await import('fs/promises');
      const files = await fs.readdir(dir);
      return { directory: dir, files, count: files.length };
    } catch (err) {
      return { error: `Failed to read directory: ${err.message}` };
    }
  },
};

const tools = [
  {
    type: 'function',
    function: {
      name: 'getSystemMetrics',
      description: 'Get current system CPU and memory metrics. Available to all authenticated users.',
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
  {
    type: 'function',
    function: {
      name: 'listDirectory',
      description: 'List files in a given directory (Developers and Admins only).',
      parameters: {
        type: 'object',
        properties: {
          dir: {
            type: 'string',
            description: "Directory path to inspect, for example '.' or './public'.",
          },
        },
        required: ['dir'],
      },
    },
  },
];

export { toolsRegistry, tools };
