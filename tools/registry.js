// Tool Implementations (Local JavaScript execution)
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

export { toolsRegistry, tools };
