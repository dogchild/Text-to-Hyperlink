# Text To Hyperlink & Cloud Drive Auto-Fill

A powerful Tampermonkey/Greasemonkey script that intelligently converts plain text URLs into clickable hyperlinks and provides **automatic extraction code filling** for major cloud drive services.

## ✨ Features

### 1. 🔗 Text to Hyperlink
Automatically transforms non-clickable text URLs on web pages into clickable links. Supports:
- **Standard URLs**: Links starting with `http://`, `https://`, `www.`
- **Magnet Links**: `magnet:?xt=...`
- **Other Protocols**: `tg://`, `ed2k://`, `thunder://`, etc.
- **IP Addresses**: Common IPv4 addresses.
- **Protocol-less URLs**: Smartly recognizes URLs without protocol headers (e.g., `google.com`) and supports a wide range of TLDs.

### 2. 💾 Auto-Fill Cloud Drive Codes
When you click on a supported cloud drive link, the script automatically searches for a nearby **extraction code/password**. Upon opening the drive page, it **automatically fills in the code** and attempts to submit it.

**Supported Cloud Drives:**
- Baidu Netdisk
- Aliyun Drive (Alipan)
- Lanzou Cloud
- 123 Pan
- Quark Cloud
- Chengtong Disk
- Tianyi Cloud (189)

### 3. ⚙️ Flexible Settings
Control the script via the Tampermonkey extension menu:
- **Global Toggle**: Enable/Disable features globally.
- **Site Blacklist**: Disable linkification or drive recognition on specific websites.
- **Independent Control**: Linkification and Drive Recognition features can be toggled separately.

## 📥 Installation
1. Install the [Tampermonkey](https://www.tampermonkey.net/) extension for your browser (Chrome, Edge, Firefox, Safari, etc.).
2. [Click here to install](#) (Link to your GreasyFork or GitHub release).

## 📖 Usage
- **Automatic**: The script runs automatically on all web pages after installation.
- **Menu Control**: Click the Tampermonkey icon in your browser toolbar and select this script to see options:
    - `✅ Global: Linkify Enabled` (Click to disable)
    - `✅ Global: Drive Recognition Enabled` (Click to disable)
    - `✅ Site: Linkify Enabled` (Click to blacklist current site)
    - `✅ Site: Drive Recognition Enabled` (Click to blacklist current site)

## 🛠️ About
This project is open source on GitHub. Stars and feedback are welcome!

---
**Note**: This script is for browsing assistance only and does not collect any private user data.
