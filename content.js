const STORAGE_KEY = 'plocker_blocks';

let pickerActive = false;
let domain = window.location.hostname;
let hoverOverlay = null;
let blockedElements = new Map();
let pendingSelector = null;

function init() {
  loadBlockedElements().then(applyBlocks);
  chrome.runtime.onMessage.addListener(handleMessage);
}

function handleMessage(message, sender, sendResponse) {
  switch (message.type) {
    case 'TOGGLE_PICKER':
      togglePicker(message.active, message.domain);
      break;
    case 'UNBLOCK_ELEMENT':
      if (message.index !== undefined) {
        unblockElement(message.index);
      } else if (message.selector) {
        unblockElementBySelector(message.selector);
      }
      break;
    case 'GET_BLOCKED_ELEMENTS':
      sendResponse({ blocked: Array.from(blockedElements.values()) });
      break;
  }
  return true;
}

async function loadBlockedElements() {
  const { [STORAGE_KEY]: data } = await chrome.storage.sync.get(STORAGE_KEY);
  return data?.[domain] || [];
}

async function saveBlockedElements(blocks) {
  const { [STORAGE_KEY]: data } = await chrome.storage.sync.get(STORAGE_KEY);
  const allData = data || {};
  allData[domain] = blocks;
  await chrome.storage.sync.set({ [STORAGE_KEY]: allData });
}

function applyBlocks(blocks) {
  blocks.forEach((block, index) => {
    try {
      const el = document.querySelector(block.selector);
      if (el) {
        blockElementDOM(el, block.selector, block.mode || 'transparent', index);
      }
    } catch (e) {
      console.warn('P-Locker: Invalid selector, skipping:', block.selector);
    }
  });
}

function togglePicker(active, newDomain) {
  pickerActive = active;
  domain = newDomain || domain;
  
  if (pickerActive) {
    enablePicker();
  } else {
    disablePicker();
  }
}

function enablePicker() {
  document.addEventListener('mouseover', handleMouseOver, true);
  document.addEventListener('mouseout', handleMouseOut, true);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('keydown', handleKeyDown, true);
  createHoverOverlay();
}

function disablePicker() {
  document.removeEventListener('mouseover', handleMouseOver, true);
  document.removeEventListener('mouseout', handleMouseOut, true);
  document.removeEventListener('click', handleClick, true);
  document.removeEventListener('keydown', handleKeyDown, true);
  removeHoverOverlay();
  pendingSelector = null;
}

function createHoverOverlay() {
  hoverOverlay = document.createElement('div');
  hoverOverlay.id = 'plocker-hover-overlay';
  hoverOverlay.style.cssText = `
    position: fixed;
    pointer-events: none;
    z-index: 2147483647;
    border: 2px dashed #00d4aa;
    background: rgba(0, 212, 170, 0.1);
    border-radius: 4px;
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.3);
    transition: all 0.05s ease;
    display: none;
  `;
  document.documentElement.appendChild(hoverOverlay);
}

function removeHoverOverlay() {
  if (hoverOverlay) {
    hoverOverlay.remove();
    hoverOverlay = null;
  }
}

function handleMouseOver(e) {
  if (!pickerActive || e.target.id === 'plocker-hover-overlay') return;
  
  const el = e.target;
  if (isBlocked(el)) return;
  
  const rect = el.getBoundingClientRect();
  hoverOverlay.style.display = 'block';
  hoverOverlay.style.top = `${rect.top + window.scrollY}px`;
  hoverOverlay.style.left = `${rect.left + window.scrollX}px`;
  hoverOverlay.style.width = `${rect.width}px`;
  hoverOverlay.style.height = `${rect.height}px`;
  
  pendingSelector = generateSelector(el);
  
  showTooltip(el, pendingSelector);
}

function handleMouseOut(e) {
  if (!pickerActive) return;
  hoverOverlay.style.display = 'none';
  removeTooltip();
}

function handleClick(e) {
  if (!pickerActive) return;
  
  if (e.target.id === 'plocker-hover-overlay') return;
  
  e.preventDefault();
  e.stopPropagation();
  
  const el = e.target;
  const selector = generateSelector(el);
  
  if (isBlocked(el)) {
    unblockElementBySelector(selector);
  } else {
    blockElement(selector, el);
  }
  
  pendingSelector = null;
  removeTooltip();
}

function handleKeyDown(e) {
  if (e.key === 'Escape' && pickerActive) {
    togglePicker(false, domain);
    chrome.runtime.sendMessage({ type: 'PICKER_DEACTIVATED' });
  }
}

function showTooltip(el, selector) {
  removeTooltip();
  
  const tooltip = document.createElement('div');
  tooltip.id = 'plocker-tooltip';
  tooltip.style.cssText = `
    position: fixed;
    z-index: 2147483647;
    background: #1a1a2e;
    color: #00d4aa;
    padding: 6px 10px;
    border-radius: 4px;
    font-family: Monaco, Menlo, monospace;
    font-size: 11px;
    white-space: nowrap;
    pointer-events: none;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    border: 1px solid #00d4aa;
  `;
  tooltip.textContent = selector;
  
  const rect = el.getBoundingClientRect();
  tooltip.style.top = `${rect.top + window.scrollY - 30}px`;
  tooltip.style.left = `${rect.left + window.scrollX}px`;
  
  document.documentElement.appendChild(tooltip);
}

function removeTooltip() {
  const tooltip = document.getElementById('plocker-tooltip');
  if (tooltip) tooltip.remove();
}

function generateSelector(el) {
  if (el.id) return `#${el.id}`;
  
  const path = [];
  let current = el;
  
  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();
    
    if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/).filter(c => c && !c.startsWith('plocker-'));
      if (classes.length) {
        selector += '.' + classes.map(c => escapeSelector(c)).join('.');
      }
    }
    
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(c => c.tagName === current.tagName);
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }
    
    path.unshift(selector);
    current = parent;
    
    if (path.length >= 3) break;
  }
  
  return path.join(' > ');
}

function escapeSelector(str) {
  return str.replace(/([:\[\]\(\)#.])/g, '\\$1');
}

function isBlocked(el) {
  for (const [selector, data] of blockedElements) {
    try {
      if (document.querySelector(selector) === el) return true;
    } catch (e) {}
  }
  return false;
}

function getBlockedIndex(el) {
  for (const [selector, data] of blockedElements) {
    try {
      if (document.querySelector(selector) === el) return data.index;
    } catch (e) {}
  }
  return -1;
}

async function blockElement(selector, originalEl) {
  const blocks = await loadBlockedElements();
  const index = blocks.length;
  
  const blockData = {
    selector,
    mode: 'transparent',
    timestamp: Date.now(),
    url: window.location.href
  };
  
  blocks.push(blockData);
  await saveBlockedElements(blocks);
  
  blockElementDOM(originalEl, selector, 'transparent', index);
  
  showNotification('Element blocked');
}

function blockElementDOM(el, selector, mode, index) {
  try {
    if (!el) return;
    
    const originalStyle = el.style.cssText;
    const originalPointerEvents = el.style.pointerEvents;
    
    if (mode === 'hide') {
      el.style.setProperty('display', 'none', 'important');
    } else {
      el.style.setProperty('opacity', '0', 'important');
      el.style.setProperty('pointer-events', 'none', 'important');
    }
    
    blockedElements.set(selector, { 
      element: el, 
      mode, 
      index, 
      originalStyle,
      originalPointerEvents
    });
    
    el.dataset.plockerBlocked = 'true';
    el.dataset.plockerIndex = index;
    
  } catch (e) {
    console.error('P-Locker: Failed to block element', e);
  }
}

async function unblockElement(index) {
  const blocks = await loadBlockedElements();
  const block = blocks[index];
  if (!block) return;
  
  unblockElementDOM(block.selector);
  
  blocks.splice(index, 1);
  await saveBlockedElements(blocks);
  
  reindexBlocks(blocks);
  
  showNotification('Element unblocked');
}

function unblockElementBySelector(selector) {
  const index = getBlockedIndexBySelector(selector);
  if (index >= 0) {
    unblockElement(index);
  }
}

function getBlockedIndexBySelector(selector) {
  for (const [sel, data] of blockedElements) {
    if (sel === selector) return data.index;
  }
  return -1;
}

function unblockElementDOM(selector) {
  const data = blockedElements.get(selector);
  if (!data) return;
  
  const { element, originalStyle } = data;
  
  if (element && element.isConnected) {
    element.style.cssText = originalStyle;
    element.removeAttribute('data-plocker-blocked');
    element.removeAttribute('data-plocker-index');
  }
  
  blockedElements.delete(selector);
}

function reindexBlocks(blocks) {
  blockedElements.clear();
  blocks.forEach((block, index) => {
    try {
      const el = document.querySelector(block.selector);
      if (el) {
        blockedElements.set(block.selector, { 
          element: el, 
          mode: block.mode, 
          index,
          originalStyle: el.style.cssText,
          originalPointerEvents: el.style.pointerEvents
        });
        el.dataset.plockerIndex = index;
      }
    } catch (e) {}
  });
}

function showNotification(message) {
  const notif = document.createElement('div');
  notif.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #1a1a2e;
    color: #00d4aa;
    padding: 12px 20px;
    border-radius: 8px;
    font-family: system-ui;
    font-size: 13px;
    z-index: 2147483647;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    border: 1px solid #00d4aa;
    animation: slideIn 0.3s ease;
  `;
  notif.textContent = message;
  
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100px); opacity: 0; } }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(notif);
  
  setTimeout(() => {
    notif.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => notif.remove(), 300);
  }, 2000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_BLOCKED_ELEMENTS') {
    sendResponse({ blocked: Array.from(blockedElements.values()) });
  }
  return true;
});