# Text To Hyperlink & Cloud Drive Auto-Fill

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE) [![Version](https://img.shields.io/badge/Version-1.0.21-blue.svg)](#)

> 🚀 Intelligently converts plain text URLs into clickable hyperlinks and provides **automatic code filling** for major cloud drive services.

## ✨ Features

### 🔗 Text to Hyperlink
Automatically transforms non-clickable text URLs into clickable links:

| Type | Example |
|------|---------|
| Standard URLs | `https://example.com` |
| Magnet Links | `magnet:?xt=...` |
| Other Protocols | `tg://`, `ed2k://`, `thunder://` |
| Protocol-less | `google.com`, `www.example.com` |

### 💾 Auto-Fill Cloud Drive Codes
When clicking a cloud drive link, the script automatically detects nearby **extraction codes** and **auto-fills & submits** on the drive page.

**Supported Drives:** Baidu · Aliyun · Lanzou · 123Pan · Quark · Chengtong · Tianyi (189)

### 🌊 Infinite Scroll & Auto-Pagination Support
The script uses **IntersectionObserver** + **MutationObserver** dual monitoring:
- ✅ Supports infinite scroll / waterfall layouts
- ✅ Supports auto-pagination / dynamic content loading
- ✅ Processes only visible elements for optimal performance

### ⚙️ Flexible Settings
Control via Tampermonkey menu:

| Setting | Description |
|---------|-------------|
| Global Linkify | Toggle link conversion globally |
| Global Drive | Toggle drive recognition globally |
| Site Linkify | Blacklist current site |
| Site Drive | Blacklist current site |

## 📥 Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) extension
2. [Click to install](https://github.com/dogchild/Text-to-Hyperlink/raw/refs/heads/main/text_to_hyperlink.user.js)

## 📖 Usage

Runs automatically after installation. Click the Tampermonkey icon to adjust settings.

---
**Privacy**: This script does not collect any user data.
