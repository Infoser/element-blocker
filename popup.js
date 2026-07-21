const STORAGE_KEY = 'plocker_blocks';

let pickerActive = false;
let domain = '';
let currentTab = null;

document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;
  domain = new URL(tab.url).hostname;
  
  document.getElementById('domainName').textContent = domain;
  
  const pickerBtn = document.getElementById('pickerBtn');
  pickerBtn.addEventListener('click', togglePicker);
  
  await loadAndRenderBlocks();
});

async function loadAndRenderBlocks() {
  const { [STORAGE_KEY]: data } = await chrome.storage.sync.get(STORAGE_KEY);
  const blocks = data?.[domain] || [];
  renderBlocks(blocks);
  updateCount(blocks.length);
}

function renderBlocks(blocks) {
  const list = document.getElementById('blockList');
  
  if (blocks.length === 0) {
    list.innerHTML = '<div class="empty">No blocked elements on this domain</div>';
    return;
  }
  
  list.innerHTML = blocks.map((block, index) => `
    <div class="block-item" data-index="${index}">
      <div class="block-info">
        <div class="block-selector">${escapeHtml(block.selector)}</div>
        <div class="block-meta">
          <span class="block-tag">${block.mode || 'hide'}</span>
          <span>${formatTime(block.timestamp)}</span>
        </div>
      </div>
      <button class="unblock-btn" data-index="${index}" title="Unblock">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  `).join('');
  
  list.querySelectorAll('.unblock-btn').forEach(btn => {
    btn.addEventListener('click', handleUnblock);
  });
}

async function handleUnblock(e) {
  const index = parseInt(e.currentTarget.dataset.index);
  const { [STORAGE_KEY]: data } = await chrome.storage.sync.get(STORAGE_KEY);
  const blocks = data?.[domain] || [];
  
  if (blocks[index]) {
    chrome.tabs.sendMessage(currentTab.id, { 
      type: 'UNBLOCK_ELEMENT', 
      selector: blocks[index].selector 
    });
    
    blocks.splice(index, 1);
    await chrome.storage.sync.set({ [STORAGE_KEY]: { ...data, [domain]: blocks } });
    
    renderBlocks(blocks);
    updateCount(blocks.length);
  }
}

function togglePicker() {
  pickerActive = !pickerActive;
  const btn = document.getElementById('pickerBtn');
  btn.classList.toggle('active', pickerActive);
  btn.textContent = pickerActive ? 'Exit Picker' : 'Pick Element';
  
  chrome.tabs.sendMessage(currentTab.id, { 
    type: 'TOGGLE_PICKER', 
    active: pickerActive,
    domain 
  });
}

function updateCount(count) {
  document.getElementById('count').textContent = `${count} blocked`;
}

function formatTime(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
  return `${Math.floor(diff/86400000)}d ago`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'PICKER_DEACTIVATED') {
    pickerActive = false;
    const btn = document.getElementById('pickerBtn');
    btn.classList.remove('active');
    btn.textContent = 'Pick Element';
  }
});