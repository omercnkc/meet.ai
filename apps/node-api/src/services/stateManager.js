/**
 * In-memory state manager for LiveKit admission control requests.
 * Structure: Map<meetingId, Map<userId, request>>
 */

const joinRequests = new Map();

/**
 * Adds a join request for a specific user in a meeting
 * @param {string} meetingId 
 * @param {string} userId 
 * @param {Object} request 
 */
function addJoinRequest(meetingId, userId, request) {
  if (!joinRequests.has(meetingId)) {
    joinRequests.set(meetingId, new Map());
  }
  
  const meetingRequests = joinRequests.get(meetingId);
  meetingRequests.set(userId, { userId, ...request, timestamp: Date.now() });
}

/**
 * Removes a join request for a specific user in a meeting
 * @param {string} meetingId 
 * @param {string} userId 
 */
function removeJoinRequest(meetingId, userId) {
  if (joinRequests.has(meetingId)) {
    const meetingRequests = joinRequests.get(meetingId);
    meetingRequests.delete(userId);
    
    // Clean up empty meeting maps to prevent memory leaks over time
    if (meetingRequests.size === 0) {
      joinRequests.delete(meetingId);
    }
  }
}

/**
 * Gets all pending join requests for a meeting
 * @param {string} meetingId 
 * @returns {Array} Array of pending requests
 */
function getPendingRequests(meetingId) {
  if (joinRequests.has(meetingId)) {
    const meetingRequests = joinRequests.get(meetingId);
    return Array.from(meetingRequests.values());
  }
  return [];
}

module.exports = {
  addJoinRequest,
  removeJoinRequest,
  getPendingRequests
};
