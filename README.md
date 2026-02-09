# 文本转超链接 + 网盘提取码自动填充

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE) [![Version](https://img.shields.io/badge/Version-1.0.21-blue.svg)](#)

> 🚀 智能识别网页中的纯文本链接并转换为可点击的超链接，同时为主流网盘提供**提取码自动填充**功能。

## ✨ 核心功能

### 🔗 文本转超链接
自动将网页上不可点击的纯文本链接转换为超链接：

| 类型 | 示例 |
|------|------|
| 标准 URL | `https://example.com` |
| 磁力链接 | `magnet:?xt=...` |
| 其他协议 | `tg://`, `ed2k://`, `thunder://` |
| 无协议网址 | `google.com`, `www.example.com` |

### 💾 网盘自动填码
点击网盘链接时，脚本自动识别附近的**提取码**并在打开页面后**自动填充提交**。

**支持网盘：** 百度网盘 · 阿里云盘 · 蓝奏云 · 123云盘 · 夸克网盘 · 城通网盘 · 天翼云盘

### 🌊 瀑布流 & 自动翻页支持
脚本使用 **IntersectionObserver** + **MutationObserver** 双重监听机制：
- ✅ 支持无限滚动/瀑布流页面
- ✅ 支持自动翻页/动态加载内容
- ✅ 仅处理可视区域，性能优异

### ⚙️ 灵活设置
通过 Tampermonkey 菜单控制：

| 设置项 | 说明 |
|--------|------|
| 全局超链接 | 一键开启/关闭链接转换 |
| 全局网盘识别 | 一键开启/关闭网盘功能 |
| 本站超链接 | 当前站点黑名单 |
| 本站网盘识别 | 当前站点黑名单 |

## 📥 安装

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 扩展
2. [点击安装脚本](https://github.com/dogchild/Text-to-Hyperlink/raw/refs/heads/main/text_to_hyperlink.user.js)

## 📖 使用

安装后自动运行。点击浏览器 Tampermonkey 图标可调整设置。

---
**隐私声明**：本脚本不收集任何用户数据。
