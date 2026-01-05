# Quantercise Mental Math Chrome Extension

Sharpen your mental math skills with timed arithmetic drills. This Chrome extension brings the Quick Drill mode from [quantercise.com](https://quantercise.com) right to your browser.

## Features

- **Quick Drill Mode**: 2 minutes of unlimited arithmetic problems
- **Four Operations**: Addition, subtraction, multiplication, and division
- **No Penalties**: Focus on speed without fear of wrong answers hurting your score
- **Sound Effects**: Audio feedback for correct, incorrect, and skipped answers
- **Dark/Light Theme**: Automatic system theme detection with manual override
- **Progress Tracking**: Best score, last score, and total drills completed
- **Keyboard Shortcuts**: Fast navigation for power users

## Benchmark Levels

- **Excellent**: 70+ points
- **Good**: 55+ points
- **Passing**: 40+ points

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Submit answer |
| `Tab` | Skip question |
| `Escape` | Open exit modal |
| `Space` | Skip countdown (during countdown only) |

## Installation

### From Chrome Web Store
*(Coming soon)*

### Manual Installation (Developer Mode)

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right corner)
4. Click **Load unpacked**
5. Select the `quantercise-mental-math-extension` folder
6. The extension icon will appear in your toolbar

## Usage

1. Click the Quantercise icon in your Chrome toolbar
2. Watch the tutorial animation to understand the interface
3. Click **Start Drill** to begin
4. Answer as many problems as you can in 2 minutes
5. View your results and try to beat your best score!

## Problem Generation

- **Addition**: Two numbers between 2-99
- **Subtraction**: Results are always non-negative
- **Multiplication**: One number 2-12, one number 2-99
- **Division**: Always produces integer results (max dividend 144, max divisor 12)

## Technical Details

- **Manifest Version**: 3 (Chrome Extension)
- **Permissions**: `storage` only (for saving preferences and scores)
- **No external requests**: All functionality is local
- **Vanilla JavaScript**: No frameworks or build tools required

## File Structure

```
quantercise-mental-math-extension/
├── manifest.json          # Chrome extension manifest
├── popup/
│   ├── popup.html         # Main UI structure
│   ├── popup.css          # Styling with theme system
│   └── popup.js           # Application logic
├── utils/
│   ├── constants.js       # Configuration and presets
│   ├── generator.js       # Problem generation
│   ├── storage.js         # Chrome storage wrapper
│   └── sounds.js          # Web Audio API sounds
├── assets/
│   ├── icon-16.png        # Toolbar icon
│   ├── icon-48.png        # Extension management icon
│   └── icon-128.png       # Chrome Web Store icon
├── README.md              # This file
└── PRIVACY.md             # Privacy policy
```

## Contributing

This is an open-source project. Contributions, issues, and feature requests are welcome!

## License

MIT License - feel free to use this code for your own projects.

## Credits

Based on the mental math training platform at [quantercise.com](https://quantercise.com).
