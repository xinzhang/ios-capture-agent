/**
 * Electron-compatible HTTPS agent
 *
 * Electron's networking layer can interfere with Node.js HTTP clients.
 * This module creates a custom HTTPS agent that works properly in Electron's environment.
 */

import https from 'https';

/**
 * Create an HTTPS agent compatible with Electron
 */
export const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 1000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000,
});

console.log('🔧 Electron-compatible HTTPS agent created');

export default {
  httpsAgent,
};
