const STORAGE_KEY = 'plocker_blocks';

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(STORAGE_KEY, (data) => {
    if (!data[STORAGE_KEY]) {
      chrome.storage.sync.set({ [STORAGE_KEY]: {} });
    }
  });
});

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
    return;
  }
  
  const [{ result: state }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => window.plockerPickerActive || false
  });
  
  const newState = !state;
  
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (active) => {
      window.plockerPickerActive = active;
    },
    args: [newState]
  });
  
  chrome.tabs.sendMessage(tab.id, { 
    type: 'TOGGLE_PICKER', 
    active: newState,
    domain: new URL(tab.url).hostname 
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PICKER_DEACTIVATED') {
    chrome.action.setBadgeText({ text: '', tabId: sender.tab.id });
  }
  
  if (message.type === 'GET_BLOCKED_ELEMENTS') {
    chrome.storage.sync.get(STORAGE_KEY, (data) => {
      const blocks = data[STORAGE_KEY]?.[message.domain] || [];
      sendResponse({ blocked: blocks });
    });
    return true;
  }
});