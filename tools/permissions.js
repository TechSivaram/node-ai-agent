/**
 * Role-Based Permission Configuration
 * Define which roles can access which tools
 */

export const ROLE_PERMISSIONS = {
  admin: {
    tools: ['getSystemMetrics', 'restartService','searchKnowledgeBase'],
    description: 'Full access to all tools and operations',
  },
  user: {
    tools: ['getSystemMetrics','searchKnowledgeBase'],
    description: 'Read-only access to system metrics',
  },
  developer: {
    tools: ['getSystemMetrics', 'listDirectory'],
    description: 'Access to system metrics and file browsing',
  },
  viewer: {
    tools: ['getSystemMetrics','searchKnowledgeBase'],
    description: 'Limited read-only access',
  },
};

/**
 * Check if a user role has permission to access a tool
 * @param {string} userRole - The user's role
 * @param {string} toolName - The name of the tool
 * @returns {boolean} - True if user has permission, false otherwise
 */
export function hasToolPermission(userRole, toolName) {
  const roleConfig = ROLE_PERMISSIONS[userRole];
  if (!roleConfig) {
    return false;
  }
  return roleConfig.tools.includes(toolName);
}

/**
 * Get all accessible tools for a given role
 * @param {string} userRole - The user's role
 * @returns {string[]} - Array of tool names accessible to this role
 */
export function getAccessibleTools(userRole) {
  const roleConfig = ROLE_PERMISSIONS[userRole];
  return roleConfig ? roleConfig.tools : [];
}

/**
 * Get permission denied message
 * @param {string} username - The username
 * @param {string} userRole - The user's role
 * @param {string} toolName - The tool name
 * @returns {object} - Error response object
 */
export function createPermissionDeniedError(username, userRole, toolName) {
  return {
    error: `Permission Denied: User '${username}' (${userRole}) cannot access '${toolName}' tool.`,
  };
}
