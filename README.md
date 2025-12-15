# MQL5 Forum Blacklist Extension

A Chrome browser extension that allows you to blacklist users on the MQL5 forum, hiding their posts from view. Works across all language versions of the forum.

## Features

- 🚫 **User Blacklisting**: Add users to blacklist to hide their posts
- 🔍 **Multi-language Support**: Works on all MQL5 forum language versions (ru, en, etc.)
- 📊 **Statistics**: Track how many posts are hidden
- 💾 **Data Export/Import**: Backup and restore your blacklist
- 🔒 **Privacy First**: All data stored locally in your browser
- ⚡ **Fast Performance**: Minimal resource usage with efficient DOM observation

## Installation

### Method 1: Chrome Web Store (when published)
1. Visit the Chrome Web Store
2. Search for "MQL5 Forum Blacklist"
3. Click "Add to Chrome"

### Method 2: Developer Mode (Development)
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked"
5. Select the extension folder
6. The extension icon should appear in your toolbar

### Method 3: Manual Installation
1. Create a new folder on your computer
2. Copy all extension files to this folder
3. Open Chrome and go to `chrome://extensions/`
4. Enable "Developer mode"
5. Click "Load unpacked" and select your folder

## Usage

### Adding Users to Blacklist

#### Quick Add (Popup)
1. Click the extension icon in the toolbar
2. Enter the user login (nickname) to blacklist
3. Click "Add to Blacklist"
4. Refresh the forum page to see changes

Important:
- Preferred input is the user login (nickname) — the entire slug after `/users/` in the profile URL.
- Examples:
  - `https://www.mql5.com/en/users/trader_omega` → login: `trader_omega`
  - `https://www.mql5.com/ru/users/98765-trader_omega` → login: `98765-trader_omega`
- Full display name and full profile URL are also supported, but login (full slug) is the most reliable option.

#### From Forum Page
1. Navigate to any MQL5 forum page
2. Find a post from the user you want to blacklist
3. The extension will detect users automatically
4. Use the popup to add them to your blacklist

### Managing Blacklist

#### Options Page
1. Right-click the extension icon
2. Select "Options"
3. View all blacklisted users
4. Search and filter users
5. Remove individual users or clear all
6. Export/import blacklist data

#### Statistics
- View total number of blacklisted users
- See how many posts are currently hidden
- Track extension usage over time

### Data Management

#### Export Data
1. Open the options page
2. Click "Export Blacklist"
3. Save the JSON file to your computer

#### Import Data
1. Open the options page
2. Click "Import Blacklist"
3. Select a previously exported JSON file
4. Confirm the import action

## Technical Details

### Architecture
- **Manifest Version**: 3 (latest Chrome extension standard)
- **Content Scripts**: Injected into forum pages for DOM manipulation
- **Background Service**: Handles extension lifecycle and storage
- **Popup Interface**: Quick access to main features
- **Options Page**: Advanced settings and management

### Storage
- Uses Chrome Storage API for data persistence
- All data stored locally (no external servers)
- Efficient data structures for fast lookups
- Automatic data validation and cleanup

### Performance
- Minimal DOM observation overhead
- Efficient user detection algorithms
- Optimized for large blacklists (1000+ users)
- Low memory footprint

### Security
- No external network requests
- Local data storage only
- Input validation and sanitization
- Follows Chrome extension security best practices

## Compatibility

### Supported Browsers
- Google Chrome (version 88+)
- Microsoft Edge (Chromium-based)
- Other Chromium-based browsers (not extensively tested)

### Supported Forums
- All MQL5 forum language versions:
  - Russian: `https://www.mql5.com/ru/forum`
  - English: `https://www.mql5.com/en/forum`
  - Other language versions

### System Requirements
- Modern browser with Manifest V3 support
- Minimum 4GB RAM recommended
- No additional dependencies required

## Troubleshooting

### Extension Not Working
1. **Check Installation**: Ensure extension is properly loaded
2. **Refresh Page**: Reload the forum page after making changes
3. **Check Permissions**: Verify extension has required permissions
4. **Clear Cache**: Clear browser cache and extension data
5. **Restart Browser**: Close and reopen Chrome

### Users Not Being Hidden
1. **Verify Login**: Ensure correct user login (nickname) spelling (e.g. `98765-trader_omega` or `trader_omega`)
2. **Check Page Type**: Extension only works on forum pages
3. **Update Extension**: Check for extension updates
4. **Reset Settings**: Try resetting extension to defaults

### Performance Issues
1. **Large Blacklists**: Consider removing old entries
2. **Browser Performance**: Check overall browser health
3. **Extension Conflicts**: Disable other extensions temporarily
4. **Memory Usage**: Monitor browser memory consumption

### Data Loss
1. **Regular Backups**: Export blacklist data regularly
2. **Sync Issues**: Check Chrome sync settings
3. **Storage Limits**: Monitor storage usage
4. **Recovery**: Use imported backups when needed

## Development

### Project Structure
```
mql5-forum-blacklist/
├── manifest.json          # Extension configuration
├── content/               # Content scripts
│   └── content-script.js  # Main forum manipulation
├── popup/                 # Extension popup
│   ├── popup.html        # Popup interface
│   ├── popup.css         # Popup styling
│   └── popup.js          # Popup functionality
├── options/              # Options page
│   ├── options.html      # Settings interface
│   ├── options.css       # Settings styling
│   └── options.js        # Settings functionality
├── background/           # Background service
│   └── background.js     # Service worker
└── icons/                # Extension icons
    ├── icon16.svg        # 16x16 icon
    ├── icon48.svg        # 48x48 icon
    └── icon128.svg       # 128x128 icon
```

### Building from Source
1. Clone the repository
2. Make necessary modifications
3. Load in Chrome developer mode
4. Test thoroughly before distribution

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Support

For issues, feature requests, or questions:
1. Check the troubleshooting section above
2. Review existing issues on the project repository
3. Create a new issue with detailed information

## Changelog

### Version 1.0.0
- Initial release
- Basic blacklist functionality
- Multi-language support
- Import/export features
- Statistics tracking
- Material Design UI

---

**Note**: This extension is not affiliated with MetaQuotes Software Corp. or the official MQL5 forum. Use responsibly and in accordance with forum rules and terms of service.
