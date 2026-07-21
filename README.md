# P-Locker - Element Blocker

A Chrome extension that allows you to block and hide unwanted elements on any webpage with a simple click. Block ads, pop-ups, banners, or any other distracting elements to create a cleaner browsing experience.

## Features

- **Element Blocker**: Click any element on a webpage to block/hide it instantly
- **Multiple Blocking Modes**: Choose between hiding elements completely or making them transparent/click-through
- **Domain-Specific Blocking**: Blocks are saved per domain and persist across sessions
- **Easy Management**: View and manage all blocked elements per domain in the popup
- **Keyboard Shortcut**: Press `Esc` to exit picker mode
- **Visual Feedback**: Visual indicator when picking elements
- **Persistent Storage**: Uses Chrome's sync storage to save your blocks across devices

## Installation

### From Chrome Web Store (Recommended)

1. Visit the [P-Locker Chrome Web Store page](https://chrome.google.com/webstore/detail/p-locker-element-blocker/)
2. Click "Add to Chrome"
3. Confirm by clicking "Add extension" in the popup

### Manual Installation (Developer Mode)

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked"
5. Navigate to the folder where you cloned/downloaded this repository
6. Select the folder and click "Select"

## Usage

### Blocking Elements

1. Click the P-Locker extension icon in your Chrome toolbar
2. Click the "Pick Element" button in the popup
3. Your cursor will change to indicate picker mode is active
4. Hover over any element on the webpage - you'll see a dashed outline around it
5. Click on the element you want to block
6. The element will be blocked/hidden immediately
7. Click "Exit Picker" or press `Esc` to exit picker mode

### Managing Blocked Elements

1. Click the P-Locker extension icon to open the popup
2. The popup shows your blocked elements count, and a list of blocked elements
3. To unblock an element, click the "X" button next to it in the list
4. The blocked elements count will update automatically

### Blocking Modes

P-Locker offers two blocking modes:

1. **Hide** (default): Completely removes the element from view
2. **Transparent**: Makes the element transparent but still click-through (useful for elements that might break page functionality if completely hidden)

To change the blocking mode for an element, you would need to modify the extension code (this feature can be enhanced in future versions).

## How It Works

P-Locker works by:
1. Using a content script that runs on all webpages (`<all_urls>`)
2. When you activate the picker, it creates an overlay that highlights elements on hover
3. When you click an element, it captures the CSS selector and saves it to Chrome's storage
4. The content script continuously applies the blocking rules to matching elements
5. Blocked elements are either hidden (`display: none`) or made transparent/click-through based on mode

## Files Structure

- `manifest.json` - Extension manifest with permissions and file definitions
- `popup.html` - Popup interface HTML
- `popup.js` - Popup logic and UI interactions
- `content.js` - Content script that runs on webpages to detect and block elements
- `background.js` - Background/service worker for extension events
- `styles.css` - Styling for the popup interface

## Permissions Explained

P-Locker requests the following permissions:

- `activeTab`: To interact with the currently active tab when clicking the extension icon
- `storage`: To save and retrieve your blocked elements list
- `scripting`: To inject CSS and JavaScript into pages for the element picker and blocking functionality

## Privacy

P-Locker respects your privacy:
- All data (blocked elements lists) is stored locally in your browser using Chrome's storage API
- No data is sent to any external servers
- No tracking or analytics are implemented
- The extension only runs on webpages when you actively use it

## Development

To contribute to P-Locker:

1. Fork the repository
2. Create a new branch for your feature or bug fix
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Loading Unpacked Extension for Development

1. Make your changes to the extension files
2. Go to `chrome://extensions`
3. Ensure "Developer mode" is enabled
4. Click the refresh icon on the P-Locker extension card to reload your changes

## Troubleshooting

### Extension not working on certain sites?

Some sites have strict Content Security Policies (CSP) that may block the extension's scripts. P-Locker uses the `scripting` permission which should work on most sites, but highly restricted sites might still pose issues.

### Blocked elements coming back?

This can happen if:
- The webpage dynamically reloads or recreates the element
- You're looking at a different URL/path on the same domain
- Chrome storage was cleared

Try blocking the element again or using a more general CSS selector.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements

- Inspired by various ad-blocking and element-hiding extensions
- Built with vanilla JavaScript, HTML, and CSS
- Icons created with simple HTML/CSS (no external dependencies)

---

Made with ❤️ for a cleaner web experience