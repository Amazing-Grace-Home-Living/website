// background.js – placeholder for Chrome/Edge/Opera extension
// This file will be used as the background script for the custom browser extension.
// Add your extension logic here (e.g., message listeners, API calls, UI interactions).

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Example: forward a request to your LiteLLM server
  if (request.type === 'liteLLM') {
    fetch(request.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // If you store the API key in VS Code secret storage, you can retrieve it via a
        // native messaging host or other secure method. Here we just forward it.
        'Authorization': `Bearer ${request.apiKey}`,
      },
      body: JSON.stringify(request.payload),
    })
      .then(res => res.json())
      .then(data => sendResponse({data}))
      .catch(err => sendResponse({error: err.message}));
    return true; // keep the message channel open for async response
  }
});
