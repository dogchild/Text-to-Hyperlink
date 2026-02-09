// ==UserScript==
// @name         Text to Hyperlink
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Convert plain text URLs to clickable links
// @author       dogchild
// @match        *://*/*
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    // --- Settings & Storage Keys ---
    const hostname = window.location.hostname;
    const KEYS = {
        BLACKLIST_LINKIFY: 'tm_linkify_blacklist',
        BLACKLIST_DRIVE: 'tm_linkify_drive_blacklist',
        GLOBAL_LINKIFY: 'tm_linkify_global_enabled',
        GLOBAL_DRIVE: 'tm_linkify_drive_global_enabled'
    };

    // --- Helpers ---
    const getValue = (key, def) => GM_getValue(key, def);
    const setValue = (key, val) => GM_setValue(key, val);

    // Global Settings
    const getGlobalLinkify = () => getValue(KEYS.GLOBAL_LINKIFY, true);
    const setGlobalLinkify = (val) => setValue(KEYS.GLOBAL_LINKIFY, val);

    const getGlobalDrive = () => getValue(KEYS.GLOBAL_DRIVE, true);
    const setGlobalDrive = (val) => setValue(KEYS.GLOBAL_DRIVE, val);

    // Site Settings (Blacklists)
    const getBlacklistLinkify = () => getValue(KEYS.BLACKLIST_LINKIFY, []);
    const setBlacklistLinkify = (list) => setValue(KEYS.BLACKLIST_LINKIFY, list);

    const getBlacklistDrive = () => getValue(KEYS.BLACKLIST_DRIVE, []);
    const setBlacklistDrive = (list) => setValue(KEYS.BLACKLIST_DRIVE, list);

    // Computed Status for Current Site
    const isLinkifyEnabled = () => getGlobalLinkify() && !getBlacklistLinkify().includes(hostname);
    const isDriveEnabled = () => getGlobalDrive() && !getBlacklistDrive().includes(hostname);

    // Toggle Helpers
    const toggleGlobalLinkify = () => { setGlobalLinkify(!getGlobalLinkify()); location.reload(); };
    const toggleGlobalDrive = () => { setGlobalDrive(!getGlobalDrive()); location.reload(); };

    const toggleSiteLinkify = () => {
        const list = getBlacklistLinkify();
        const index = list.indexOf(hostname);
        if (index > -1) list.splice(index, 1); // Enable
        else list.push(hostname); // Disable
        setBlacklistLinkify(list);
        location.reload();
    };

    const toggleSiteDrive = () => {
        const list = getBlacklistDrive();
        const index = list.indexOf(hostname);
        if (index > -1) list.splice(index, 1); // Enable
        else list.push(hostname); // Disable
        setBlacklistDrive(list);
        location.reload();
    };

    // I18n Helper
    const isChinese = navigator.language.startsWith('zh');
    const STRINGS = {
        globalLinkifyOn: isChinese ? '🚫 全局：超链接转换已关闭' : '🚫 Global: Linkify Disabled',
        globalLinkifyOff: isChinese ? '✅ 全局：超链接转换已开启' : '✅ Global: Linkify Enabled',
        globalDriveOn: isChinese ? '🚫 全局：网盘识别已关闭' : '🚫 Global: Drive Recognition Disabled',
        globalDriveOff: isChinese ? '✅ 全局：网盘识别已开启' : '✅ Global: Drive Recognition Enabled',
        siteLinkifyOn: isChinese ? `🚫 本站：超链接转换已关闭` : `🚫 Site: Linkify Disabled`,
        siteLinkifyOff: isChinese ? `✅ 本站：超链接转换已开启` : `✅ Site: Linkify Enabled`,
        siteDriveOn: isChinese ? `🚫 本站：网盘识别已关闭` : `🚫 Site: Drive Recognition Disabled`,
        siteDriveOff: isChinese ? `✅ 本站：网盘识别已开启` : `✅ Site: Drive Recognition Enabled`,
        disabledLog: isChinese ? '[Text-to-Hyperlink] 此站点已禁用链接转换' : '[Text-to-Hyperlink] Linkify disabled for this site.'
    };

    // Register Menu Commands
    function updateMenuCommand() {
        // 1. Global Linkify
        GM_registerMenuCommand(getGlobalLinkify() ? STRINGS.globalLinkifyOff : STRINGS.globalLinkifyOn, toggleGlobalLinkify);

        // 2. Global Drive
        GM_registerMenuCommand(getGlobalDrive() ? STRINGS.globalDriveOff : STRINGS.globalDriveOn, toggleGlobalDrive);

        // 3. Site Linkify
        const siteLinkifyBlacklisted = getBlacklistLinkify().includes(hostname);
        GM_registerMenuCommand(siteLinkifyBlacklisted ? STRINGS.siteLinkifyOn : STRINGS.siteLinkifyOff, toggleSiteLinkify);

        // 4. Site Drive
        const siteDriveBlacklisted = getBlacklistDrive().includes(hostname);
        GM_registerMenuCommand(siteDriveBlacklisted ? STRINGS.siteDriveOn : STRINGS.siteDriveOff, toggleSiteDrive);
    }

    // Initial Menu Registration
    updateMenuCommand();

    // Check Linkify Status (Drive status is checked inside linkifyTextNode and autoFill)
    if (!isLinkifyEnabled()) {
        console.log(STRINGS.disabledLog);
        // Note: We still run autoFillDrivePassword because it might be a target page opened from elsewhere
    }

    // New Configuration for Drives
    const DRIVE_RULES = [
        { name: 'baidu', regex: /pan\.baidu\.com/, codeParams: ['pwd', 'code', '提取码'] },
        { name: 'aliyun', regex: /alipan\.com|aliyundrive\.com/, codeParams: ['pwd', 'code', '提取码'] },
        { name: 'lanzou', regex: /lanzou.\.com|woozooo\.com/, codeParams: ['pwd', 'code', '提取码'] },
        { name: '123pan', regex: /123pan\.com/, codeParams: ['pwd', 'code', '提取码'] },
        { name: 'quark', regex: /pan\.quark\.cn/, codeParams: ['pwd', 'code', '提取码'] },
        { name: 'chengtong', regex: /ctfile\.com|pipipan\.com/, codeParams: ['pwd', 'code', '提取码'] },
        { name: 'tianyi', regex: /cloud\.189\.cn/, codeParams: ['pwd', 'code', '访问码'] }
    ];

    /**
     * Attempt to find extraction code near the link
     */
    function extractCode(text, linkEndIndex) {
        // Look ahead 20 chars for code pattern
        const sub = text.substring(linkEndIndex, linkEndIndex + 30);
        // Pattern: (code/pwd/提取码/访问码)[:\s]*([a-zA-Z0-9]{4})
        const codeMatch = sub.match(/(?:code|pwd|提取码|密码|访问码)\s*[:：]?\s*([a-zA-Z0-9]{4})/i);
        if (codeMatch && codeMatch[1]) {
            return codeMatch[1];
        }
        return null;
    }

    /**
     * Auto-fill logic for Cloud Drive pages
     */
    function autoFillDrivePassword() {
        const hash = location.hash;
        if (!hash || !hash.includes('pwd=')) return;

        const pwd = hash.split('pwd=')[1].split('&')[0];
        if (!pwd) return;

        console.log('[Text-to-Hyperlink] Auto-filling password:', pwd);

        // Heuristic Selectors
        const selectors = [
            '#accessCode', '#pwd', '#code', // ID
            'input[id*="code"]', 'input[id*="pwd"]', // Fuzzy ID
            'input[name="accessCode"]', 'input[name="pwd"]', // Name
            '.input-code', // Class
            'input[placeholder*="提取码"]', 'input[placeholder*="密码"]', 'input[placeholder*="Code"]', // Placeholder
            'input[type="password"]' // Fallback
        ];

        // Try to find the input
        let input = null;
        for (const sel of selectors) {
            input = document.querySelector(sel);
            if (input) break;
        }

        if (input) {
            input.value = pwd;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));

            // Attempt simple submit
            // Find nearby button
            // Heuristic keywords: 提取, 下载, 确定, Submit, OK
            setTimeout(() => {
                const buttons = document.querySelectorAll('button, a.btn, div.btn');
                for (const btn of buttons) {
                    const t = btn.innerText || '';
                    if (/提取|下载|确定|Submit|OK/.test(t)) {
                        btn.click();
                        break;
                    }
                }
            }, 500);
        }
    }

    // Run auto-fill on load (Check Drive Enabled Status)
    if (isDriveEnabled()) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', autoFillDrivePassword);
        } else {
            autoFillDrivePassword();
        }
    }

    // Configuration
    const CONFIG = {
        // Regex for various protocols
        // URL: http/https
        // Magnet: magnet:?xt=...
        // Custom: tg://, ms-windows-store://, ed2k://, thunder://
        // Protocol-less: www.xxx.com or xxx.com (common TLDs)
        // Strict tail matching: Only continue if followed by start of path/query/hash
        regex: /((?:https?:\/\/|magnet:\?xt=|tg:\/\/|ms-windows-store:\/\/|ed2k:\/\/|thunder:\/\/)[^\s<>"']+|(?:\b[a-z0-9.-]+\.(?:com|cn|net|org|edu|gov|io|me|info|biz|top|vip|cc|co|uk|jp|de|fr|ru|au|us|ca|br|it|es|nl|se|no|pl|fi|gr|tr|cz|ro|hu|dk|be|at|ch|pt|ie|mx|sg|my|th|vn|ph|id|sa|za|nz|tw|hk|kr|in|tk|ml|ga|cf|gq|tv|ws|xyz|site|win|club|online|fun|wang|space|shop|ltd|work|live|store|bid|loan|click|wiki|tech|cloud|art|love|press|website|trade|date|party|review|video|web|link|mobi|pro|app|dev|ly)|\bwww\.[a-z0-9.-]+)\b(?:[\/?#][^\s<>"']*)?)/gi,
        observeOptions: {
            root: null, // viewport
            rootMargin: '200px', // Pre-load slightly outside viewport
            threshold: 0 // Trigger as soon as any part is visible
        },
        processedAttribute: 'data-linkified'
    };

    /**
     * Text Walker to find text nodes not inside interactive elements
     */
    function getTextNodes(root) {
        const textNodes = [];
        const walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function (node) {
                    // Skip if parent is already a link or interactive element
                    const parent = node.parentNode;
                    if (!parent) return NodeFilter.FILTER_REJECT;

                    const tag = parent.tagName.toLowerCase();
                    const skipTags = ['a', 'script', 'style', 'textarea', 'input', 'button', 'select', 'option', 'code', 'pre'];
                    if (skipTags.includes(tag)) return NodeFilter.FILTER_REJECT;

                    // Skip contenteditable
                    if (parent.isContentEditable) return NodeFilter.FILTER_REJECT;

                    // Allow if parent is the root we are currently processing
                    if (parent === root) return NodeFilter.FILTER_ACCEPT;

                    // Skip if parent is already processed and it's NOT the root
                    if (parent.hasAttribute && parent.hasAttribute(CONFIG.processedAttribute)) return NodeFilter.FILTER_REJECT;

                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }
        return textNodes;
    }

    /**
     * Trim trailing punctuation from URL
     */
    function trimUrl(url) {
        let end = url.length - 1;
        const punctuation = /[,.;:!?"\)\]。]/; // Added Chinese period
        const openParen = '(';
        const closeParen = ')';

        // Simple balance check for parentheses
        // If we have balanced parens, we don't trim the last ')'
        // E.g. https://site.com/foo_(bar) -> keep ')'
        // E.g. (https://site.com/foo) -> trim ')'

        let openCount = (url.match(/\(/g) || []).length;
        let closeCount = (url.match(/\)/g) || []).length;

        while (end >= 0) {
            const char = url[end];
            if (punctuation.test(char)) {
                if (char === closeParen) {
                    if (closeCount > openCount) {
                        closeCount--;
                        end--;
                        continue;
                    } else {
                        // Balanced or more opens, likely part of URL
                        break;
                    }
                }
                end--;
            } else {
                break;
            }
        }
        return url.substring(0, end + 1);
    }

    /**
     * Convert text node to fragment with links
     */
    function linkifyTextNode(node) {
        try {
            const text = node.nodeValue;
            // Create a local regex to ensure thread safety (no lastIndex pollution)
            // matching valid URL patterns including those with protocols
            const regex = new RegExp(CONFIG.regex.source, 'gi');

            if (!text || !regex.test(text)) return;

            const fragment = document.createDocumentFragment();
            let lastIndex = 0;
            let match;
            let matchCount = 0;

            // Reset regex state (implicitly 0 for new instance)
            regex.lastIndex = 0;

            while ((match = regex.exec(text)) !== null) {
                let url = match[0];
                const originalUrl = url;

                // Trim trailing punctuation
                url = trimUrl(url);

                const matchIndex = match.index;
                // Safety check for infinite loops or weird regex behavior
                if (matchIndex < lastIndex) break;

                const preText = text.substring(lastIndex, matchIndex);

                // Add preceding text
                if (preText.length > 0) {
                    fragment.appendChild(document.createTextNode(preText));
                }

                // Check protocol
                let href = url;
                if (!/^[a-z]+:\/\/|magnet:/.test(url)) {
                    href = 'https://' + url;
                }

                // Check for Drive Code
                const matchEnd = matchIndex + originalUrl.length;
                // Only check text immediately following if drive is enabled
                if (isDriveEnabled() && matchEnd < text.length) {
                    // Check if it's a known drive
                    const isDrive = DRIVE_RULES.some(rule => rule.regex.test(url));
                    if (isDrive) {
                        const code = extractCode(text, matchEnd);
                        if (code) {
                            href += `#pwd=${code}`;
                            // Note: We don't remove the code from text, just append to href
                        }
                    }
                }

                // Create link
                const a = document.createElement('a');
                a.href = href;
                a.textContent = url;
                a.style.color = 'inherit';
                a.style.textDecoration = 'underline';
                a.target = '_blank';
                a.rel = 'noopener noreferrer';

                // Prevent recursive processing
                a.setAttribute(CONFIG.processedAttribute, 'true');

                fragment.appendChild(a);

                const remainingMatchPart = originalUrl.substring(url.length);
                if (remainingMatchPart.length > 0) {
                    fragment.appendChild(document.createTextNode(remainingMatchPart));
                }

                lastIndex = matchIndex + originalUrl.length;
                matchCount++;
            }

            // Add remaining text
            if (lastIndex < text.length) {
                fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
            }

            if (matchCount > 0) {
                return fragment;
            }
            return null;
        } catch (e) {
            console.error('Text to Hyperlink Error:', e);
            // Optional: Visual feedback for debug
            // document.body.style.border = '5px solid red';
            return null;
        }
    }

    /**
     * Process a container element
     */
    function processContainer(container) {
        if (container.hasAttribute(CONFIG.processedAttribute)) {
            return;
        }

        const id = container.id || container.tagName;

        container.setAttribute(CONFIG.processedAttribute, 'true');

        const textNodes = getTextNodes(container);

        // Batch process to avoid freezing UI
        // Simple chunking
        const chunkSize = 50;
        let index = 0;

        function processChunk() {
            const end = Math.min(index + chunkSize, textNodes.length);
            for (let i = index; i < end; i++) {
                const node = textNodes[i];
                // Double check if node is still in DOM
                if (!node.parentNode) continue;

                const newContent = linkifyTextNode(node);
                if (newContent) {
                    node.parentNode.replaceChild(newContent, node);
                }
            }
            index = end;
            if (index < textNodes.length) {
                // Schedule next chunk
                requestAnimationFrame(processChunk);
            }
        }

        if (textNodes.length > 0) {
            processChunk();
        }
    }

    // --- Observers ---

    // IntersectionObserver for visibility
    const intersectionObserver = new IntersectionObserver((entries) => {
        // Filter intersecting entries
        const visibleEntries = entries.filter(entry => entry.isIntersecting).map(entry => entry.target);

        // Sort by depth (deepest first) to ensure children are processed before parents
        // This allows the walker to skip already processed children via the attribute check
        visibleEntries.sort((a, b) => {
            // Calculate depth only when needed (caching could be better but this is likely fast enough for batch)
            const getDepth = (n) => {
                let d = 0;
                while (n.parentNode) {
                    n = n.parentNode;
                    d++;
                }
                return d;
            };
            return getDepth(b) - getDepth(a);
        });

        visibleEntries.forEach(target => {
            processContainer(target);
            intersectionObserver.unobserve(target);
        });
    }, CONFIG.observeOptions);


    // MutationObserver for dynamic content
    let timeout = null;
    const mutationObserver = new MutationObserver((mutations) => {
        // We use a set to track unique elements to re-observe/process
        const elementsToUpdate = new Set();

        mutations.forEach(mutation => {
            // Check if this mutation is caused by us
            // Heuristic: If addedNodes contains an 'A' tag with our attribute, it's likely us.
            let isSelfTriggered = false;

            // Check added nodes
            if (mutation.addedNodes.length > 0) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'A' && node.hasAttribute(CONFIG.processedAttribute)) {
                        isSelfTriggered = true;
                        break;
                    }
                }
            }

            if (isSelfTriggered) return;

            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Ignore debug log
                        if (node.id === 'tm-debug-log' || node.closest && node.closest('#tm-debug-log')) return;

                        elementsToUpdate.add(node);
                        // Also add children if needed, but IO will handle them if we just observe the root
                        const children = node.querySelectorAll && node.querySelectorAll(relevantTags);
                        if (children) children.forEach(c => elementsToUpdate.add(c));
                    } else if (node.nodeType === Node.TEXT_NODE) {
                        // If text is added, we need to process the parent
                        if (node.parentNode && node.parentNode.nodeType === Node.ELEMENT_NODE) {
                            // Ignore debug log
                            if (node.parentNode.id === 'tm-debug-log' || node.parentNode.closest('#tm-debug-log')) return;

                            elementsToUpdate.add(node.parentNode);
                        }
                    }
                });
            } else if (mutation.type === 'characterData') {
                // If text content changes directly
                if (mutation.target.nodeType === Node.TEXT_NODE && mutation.target.parentNode) {
                    if (mutation.target.parentNode.id === 'tm-debug-log' || mutation.target.parentNode.closest('#tm-debug-log')) return;
                    elementsToUpdate.add(mutation.target.parentNode);
                }
            }
        });

        if (elementsToUpdate.size > 0) {
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(() => {
                elementsToUpdate.forEach(el => {
                    const id = el.id || el.tagName;
                    // Reset processed state
                    if (el.removeAttribute) {
                        el.removeAttribute(CONFIG.processedAttribute);
                    }
                    // Re-observe
                    intersectionObserver.observe(el);
                });
            }, 200);
        }
    });

    // Start observing
    mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true // Watch for text changes
    });

    // Initial pass: Observe all existing elements
    const relevantTags = 'p, div, span, li, td, h1, h2, h3, h4, h5, h6, article, section, blockquote';
    // Initial pass: Observe all existing elements
    // Only if Linkify is enabled
    if (isLinkifyEnabled()) {
        const relevantTags = 'p, div, span, li, td, h1, h2, h3, h4, h5, h6, article, section, blockquote';
        document.querySelectorAll(relevantTags).forEach(el => {
            intersectionObserver.observe(el);
        });

        // Start mutation observer
        mutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true // Watch for text changes
        });
    }

})();
