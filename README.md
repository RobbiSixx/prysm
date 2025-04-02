![Prysm Logo](https://res.cloudinary.com/di7ctlowx/image/upload/v1743577195/logo_iu7ob8.png)

# 🔍 Prysm – Structure-Aware Web Scraper for Anything on the Internet

Prysm is a blazing-smart Puppeteer-based web scraper that doesn't just extract — it *understands* structure. From recipes and documentation to ecommerce listings and blogs, Prysm dynamically adapts to the page and gets what matters — fast.

---

## ⚡ Features

- 🧠 **AI-style Structure Detection**: Recipes, articles, docs, products, blogs — identified and extracted with precision.
- 🕵️‍♂️ **Cloudflare Bypass**: Defeats the orange wall with stealth plugins and anti-bot evasion.
- 🚫 **Resource Blocking**: Faster scrapes with image/script/fonts tracking turned off.
- 🔄 **Smart Pagination**: Scroll, click, or URL pattern — handled automatically or manually.
- 🧪 **Test Suite**: A built-in command-line test runner with category presets and results output.
- 🛠 **Pluggable & Modular**: Add your own extractors, test sites, or pagination styles in seconds.

---

## 🚀 Quick Start

npm install

---

## 🧪 Modes

- `all` – Run all known test sites
- `quick` – One from each category
- `recipe`, `article`, `product`, `ecommerce`, etc.
- Or just the name of a specific site

---

## 📁 Output

All results are saved in the `main_results` folder, with individual JSON dumps for each run and a summary report.

---

## 📦 Structure

- `main_scraper.js` – The orchestrator
- `mainExtractor.js` – Core multi-strategy extraction engine
- `cloudflareBypass.js` – Evasion tactics and header masking
- `paginationStrategies.js` – Infinite scroll, click-to-load, URL pagination
- `resourceBlocker.js` – Optional performance boost via request blocking
- `test_scraper.js` – CLI runner with presets and JSON output
- `helpers.js` – Common utility functions

---

## 🧬 Why Prysm?

Because scraping is more than grabbing HTML — it's about interpreting structure, dodging traps, and doing it at scale. Prysm gives you that edge.

---

## 🛡 Disclaimer

This project is for educational and ethical scraping only. Respect robots.txt and copyright laws.

---

## 🤝 Contributing

Contributions are welcome! If you'd like to improve the scraper:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

✨ Dream it, Pixel it | Made with ❤️ by Pink Pixel