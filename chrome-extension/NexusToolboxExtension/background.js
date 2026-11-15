// background.js – service worker for Nexus Toolbox extension
// Manifest V3 uses an ES module service worker. Ensure "type": "module" in manifest if needed.
import { runTool } from './src/agent-tools.js';

// Listen for messages from the panel or other parts of the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'runTool') {
    const { name, args } = message;
    runTool(name, args).then(result => {
      sendResponse({ result });
    }).catch(err => {
      sendResponse({ result: { success: false, error: err.message } });
    });
    // Return true to indicate we will respond asynchronously
    return true;
  }
  // Ignore other messages
  return false;
});
