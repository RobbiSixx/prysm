# 📝 Changelog

All notable changes to the Prysm scraper will be documented in this file.

## [1.2.0] - 2024-04-03

### Added

- 📸 Added image scraping functionality
- 📥 Added image downloading capability
- 🗃️ Images are now included in the JSON output
- 🔧 New CLI options for controlling image scraping:
  - `--scrapeImages`: Enable image extraction
  - `--downloadImages`: Download images locally
  - `--maxImages`: Control maximum images extracted
  - `--minImageSize`: Filter out images smaller than specified size

## [1.0.1] - 2024-04-03

### Added

- 📦 Published package to npm under @pinkpixel organization
- 🏷️ Added npm version and license badges to README
- 📄 Added .npmignore file to exclude development files from the package

## [1.1.0] - 2024-04-02

### Added

- 🔍 Integrated multi-page scraping directly into main CLI
- ⚙️ Added `--pages` parameter to specify number of pages to scrape
- 🔗 Added `--linkSelector` option for custom link selection
- 🌐 Added `--allDomains` flag to follow links across domains
- 🧠 Added 14 specialized scroll strategies for comprehensive content extraction:
  - Standard scroll
  - Chunk scroll (10% increments)
  - Reverse scroll (bottom to top)
  - Pulse scroll (down then slightly up)
  - Zigzag scroll (with horizontal movement)
  - Step scroll (small viewport increments)
  - Bounce scroll (full page bouncing)
  - Hover scroll (mouse movement simulation)
  - Random scroll (random positions)
  - Corner scroll (hits viewport corners)
  - Diagonal scroll (diagonal pattern)
  - Spiral scroll (spiral pattern)
  - Swipe scroll (keyboard-based)
  - Resize scroll (viewport resizing)

### Changed

- 🔄 Optimized default scroll parameters (maxScrolls: 100, scrollDelay: 1000)
- 📊 Simplified results output to focus on essential information
- 🚀 Improved progress indication with dot-based progress bar
- ⚡ Enhanced content extraction to accumulate results across multiple pagination attempts
- 🧩 Restructured pagination handling to maximize content discovery

### Removed

- 🗑️ Removed redundant multi_scrape.js script
- 🔇 Removed verbose logging for cleaner output

### Fixed

- 🐛 Fixed duplicate "Starting scraper" messages
- 🔧 Fixed scroll strategy implementation for better dynamic content capture
- 🧪 Fixed content deduplication to maintain unique items

## [1.0.0] - 2024-03-15

### Added

- 🌐 Initial release of Prysm web scraper
- 🧠 Structure-aware content extraction
- 🕵️‍♂️ Cloudflare bypass capability
- 🚫 Resource blocking for improved performance
- 🔄 Basic pagination handling
- 🌐 REST API for remote control
- 📑 Basic CLI interface

### Fixed

- Initial version - no fixes 