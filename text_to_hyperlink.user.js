// ==UserScript==
// @name         Text To Hyperlink & Cloud Drive Auto-Fill
// @name:zh-CN   文本转超链接 + 网盘提取码自动填充
// @name:zh-TW   文本转超链接 + 网盘提取码自动填充
// @namespace    http://tampermonkey.net/
// @version      1.0.40
// @description  Convert plain text URLs to clickable links and auto-fill cloud drive extraction codes.
// @description:zh-CN 识别网页中的纯文本链接并转换为可点击的超链接，同时自动识别网盘链接并填充提取码。
// @description:zh-TW 识别网页中的纯文本链接并转换为可点击的超链接，同时自动识别网盘链接并填充提取码。
// @author       dogchild
// @license      MIT
// @match        *://*/*
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    // Enable debug mode for users to check logs in console
    const DEBUG_MODE = true;
    const log = (...args) => DEBUG_MODE && console.log('[Text-to-Hyperlink]', ...args);

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
        GM_registerMenuCommand(getGlobalLinkify() ? STRINGS.globalLinkifyOff : STRINGS.globalLinkifyOn, toggleGlobalLinkify);
        GM_registerMenuCommand(getGlobalDrive() ? STRINGS.globalDriveOff : STRINGS.globalDriveOn, toggleGlobalDrive);
        const siteLinkifyBlacklisted = getBlacklistLinkify().includes(hostname);
        GM_registerMenuCommand(siteLinkifyBlacklisted ? STRINGS.siteLinkifyOn : STRINGS.siteLinkifyOff, toggleSiteLinkify);
        const siteDriveBlacklisted = getBlacklistDrive().includes(hostname);
        GM_registerMenuCommand(siteDriveBlacklisted ? STRINGS.siteDriveOn : STRINGS.siteDriveOff, toggleSiteDrive);
    }

    updateMenuCommand();

    if (!isLinkifyEnabled()) {
        console.log(STRINGS.disabledLog);
    }

    const DRIVE_RULES = [
        { name: 'baidu', regex: /pan\.baidu\.com/, codeParams: ['pwd', 'code', '提取码'] },
        { name: 'aliyun', regex: /alipan\.com|aliyundrive\.com/, codeParams: ['pwd', 'code', '提取码'] },
        { name: 'lanzou', regex: /(?:lanzou|woozooo).*\.com/, codeParams: ['pwd', 'code', '提取码'] },
        { name: '123pan', regex: /123pan\.com/, codeParams: ['pwd', 'code', '提取码'] },
        { name: 'quark', regex: /pan\.quark\.cn/, codeParams: ['pwd', 'code', '提取码'] },
        { name: 'chengtong', regex: /ctfile\.com|pipipan\.com/, codeParams: ['pwd', 'code', '提取码'] },
        { name: 'tianyi', regex: /cloud\.189\.cn/, codeParams: ['pwd', 'code', '访问码'] }
    ];

    function extractCode(node, matchIndex, matchEnd) {
        const isElement = node.nodeType === Node.ELEMENT_NODE;
        const text = isElement ? (node.innerText || node.textContent) : node.nodeValue;
        const SEARCH_RANGE = 120;

        const getTextFromNode = (n) => {
            if (!n) return '';
            if (n.nodeType === Node.TEXT_NODE) return n.nodeValue;
            if (n.nodeType === Node.ELEMENT_NODE) {
                if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(n.tagName)) return '';
                return n.innerText || n.textContent || '';
            }
            return '';
        };

        const getSiblingText = (startNode, direction = 'next', maxSteps = 10) => {
            let current = startNode;
            let result = '';
            let steps = 0;

            while (current && steps < maxSteps) {
                current = direction === 'next' ? current.nextSibling : current.previousSibling;
                if (!current) break;
                if (current.nodeType === Node.TEXT_NODE && !current.nodeValue.trim()) continue;
                if (current.nodeType === Node.ELEMENT_NODE && current.tagName === 'BR') continue;
                const content = getTextFromNode(current);
                if (content.trim()) {
                    if (direction === 'next') result += '\n' + content;
                    else result = content + '\n' + result;
                    if (result.length > 50) break;
                    steps++;
                }
            }
            return result;
        };

        const codeRegex = /(?:code|pwd|提取码|密码|访问码)\s*[:：]?\s*([a-zA-Z0-9]{4})/gi;
        let textAfter = text.substring(matchEnd, matchEnd + SEARCH_RANGE);
        textAfter += getSiblingText(node, 'next');

        let parent = node.parentNode;
        let limit = 5;
        let pNode = node;

        while (parent && limit > 0) {
            if (!pNode.nextSibling) {
                textAfter += getSiblingText(parent, 'next');
            } else {
                textAfter += getSiblingText(parent, 'next');
            }
            pNode = parent;
            parent = parent.parentNode;
            limit--;
        }

        codeRegex.lastIndex = 0;
        const matchAfter = codeRegex.exec(textAfter);
        if (matchAfter) return matchAfter[1];

        let textBefore = text.substring(Math.max(0, matchIndex - SEARCH_RANGE), matchIndex);
        textBefore = getSiblingText(node, 'prev') + textBefore;

        parent = node.parentNode;
        limit = 5;

        while (parent && limit > 0) {
            textBefore = getSiblingText(parent, 'prev') + textBefore;
            parent = parent.parentNode;
            limit--;
        }

        codeRegex.lastIndex = 0;
        let bestBefore = null;
        let m;
        while ((m = codeRegex.exec(textBefore)) !== null) {
            bestBefore = m[1];
        }

        return bestBefore;
    }

    let hasFilledPassword = false;

    function autoFillDrivePassword() {
        if (hasFilledPassword) return;

        const hash = location.hash;
        if (!hash || !hash.includes('pwd=')) return;

        const pwd = hash.split('pwd=')[1].split('&')[0];
        if (!pwd) return;

        const selectors = [
            '#code_txt', '#accessCode', '#pwd', '#code',
            'input[id*="code"]', 'input[id*="pwd"]',
            'input[name="accessCode"]', 'input[name="pwd"]',
            '.input-code',
            'input[placeholder*="提取码"]', 'input[placeholder*="密码"]', 'input[placeholder*="Code"]',
            '.ant-input[type="text"]', 'input[type="password"]'
        ];

        const findInput = () => {
            for (const sel of selectors) {
                const el = document.querySelector(sel);
                if (el && isValidPasswordInput(el)) return el;
            }
            return null;
        };

        const isValidPasswordInput = (el) => {
            if (el.type === 'search') return false;
            const id = (el.id || '').toLowerCase();
            const cls = (el.className || '').toLowerCase();
            if (id.includes('search') || cls.includes('search')) return false;
            const ph = (el.placeholder || '').toLowerCase();
            if (ph.includes('搜索') || ph.includes('search') || ph.includes('查找')) return false;
            if (el.offsetParent === null && el.type !== 'hidden') return false;
            const parent = el.closest('form, div, section');
            if (parent) {
                const parentText = parent.innerText || '';
                if (/提取码|密码|访问码|code|pwd|password/i.test(parentText)) return true;
            }
            return true;
        };

        const fillAndSubmit = (input) => {
            if (hasFilledPassword) return;
            hasFilledPassword = true;

            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
            if (nativeInputValueSetter) {
                nativeInputValueSetter.call(input, pwd);
            } else {
                input.value = pwd;
            }

            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));

            const clickDelay = location.hostname.includes('189.cn') ? 1000 : 300;
            setTimeout(() => {
                const specificBtn = document.querySelector('#submitBtn');
                if (specificBtn) {
                    specificBtn.click();
                    return;
                }
                const buttons = document.querySelectorAll('button, a.btn, div.btn, .btn');
                for (const btn of buttons) {
                    const t = btn.innerText || '';
                    if (/提取|下载|确定|Submit|OK|查看|访问/.test(t)) {
                        btn.click();
                        break;
                    }
                }
            }, clickDelay);
        };

        let input = findInput();
        if (input) {
            fillAndSubmit(input);
            return;
        }

        const observer = new MutationObserver(() => {
            if (hasFilledPassword) {
                observer.disconnect();
                return;
            }
            const input = findInput();
            if (input) {
                observer.disconnect();
                fillAndSubmit(input);
            }
        });

        observer.observe(document.body || document.documentElement, {
            childList: true,
            subtree: true
        });

        setTimeout(() => {
            observer.disconnect();
        }, 15000);
    }

    if (isDriveEnabled()) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', autoFillDrivePassword);
        } else {
            autoFillDrivePassword();
        }
    }

    const CONFIG = {
        // v1.0.39: Reverted to cleaner Regex with specific Negative Lookbehind for boundary handling
        regex: /((?:https?:\/\/|magnet:\?xt=|tg:\/\/|ms-windows-store:\/\/|ed2k:\/\/|thunder:\/\/)[^\s<>"'（）]+|(?:\b|(?<![a-zA-Z0-9@._-]))[a-z0-9.-]+\.(?:com|cn|net|org|edu|gov|io|me|info|biz|top|vip|cc|co|uk|jp|de|fr|ru|au|us|ca|br|it|es|nl|se|no|pl|fi|gr|tr|cz|ro|hu|dk|be|at|ch|pt|ie|mx|sg|my|th|vn|ph|id|sa|za|nz|tw|hk|kr|in|tk|ml|ga|cf|gq|tv|ws|xyz|site|win|club|online|fun|wang|space|shop|ltd|work|live|store|bid|loan|click|wiki|tech|cloud|art|love|press|website|trade|date|party|review|video|web|link|mobi|pro|app|dev|ly)\b(?!@|-))|\bwww\.[a-z0-9.-]+(?:[\/?#][^\s<>"'（）]*)?/gi,
        observeOptions: {
            root: null,
            rootMargin: '200px',
            threshold: 0
        },
        processedAttribute: 'data-linkified'
    };

    function getTextNodes(root) {
        const textNodes = [];
        const walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function (node) {
                    const parent = node.parentNode;
                    if (!parent) return NodeFilter.FILTER_REJECT;

                    const tag = parent.tagName.toLowerCase();
                    const skipTags = ['a', 'script', 'style', 'textarea', 'input', 'button', 'select', 'option', 'pre'];
                    if (skipTags.includes(tag)) return NodeFilter.FILTER_REJECT;

                    if (parent.isContentEditable) return NodeFilter.FILTER_REJECT;

                    if (parent === root) return NodeFilter.FILTER_ACCEPT;

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

    function processExistingTags(root) {
        if (!isDriveEnabled()) return;

        const links = root.querySelectorAll ? root.querySelectorAll('a[href]') : [];
        for (const link of links) {
            if (link.hasAttribute(CONFIG.processedAttribute)) continue;
            const url = link.href;
            const isDrive = DRIVE_RULES.some(rule => rule.regex.test(url));
            if (!isDrive) continue;
            link.setAttribute(CONFIG.processedAttribute, 'true');
            if (url.includes('#pwd=')) continue;
            const code = extractCode(link, 0, (link.innerText || '').length);
            if (code) {
                link.href += `#pwd=${code}`;
            }
        }
    }

    function trimUrl(url) {
        let end = url.length - 1;
        const punctuation = /[,.;:!?"\)\]。]/;
        const closeParen = ')';
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

    function linkifyTextNode(node) {
        try {
            const text = node.nodeValue;
            const regex = new RegExp(CONFIG.regex.source, 'gi');

            if (!text || !regex.test(text)) return;

            const fragment = document.createDocumentFragment();
            let lastIndex = 0;
            let match;
            let matchCount = 0;

            regex.lastIndex = 0;

            while ((match = regex.exec(text)) !== null) {
                let url = match[0];
                const originalUrl = url;
                url = trimUrl(url);

                const matchIndex = match.index;
                if (matchIndex < lastIndex) break;

                const preText = text.substring(lastIndex, matchIndex);

                if (preText.length > 0) {
                    fragment.appendChild(document.createTextNode(preText));
                }

                let href = url;
                if (!/^[a-z]+:\/\/|magnet:/.test(url)) {
                    href = 'https://' + url;
                }

                if (isDriveEnabled()) {
                    const isDrive = DRIVE_RULES.some(rule => rule.regex.test(url));
                    if (isDrive) {
                        const matchEnd = matchIndex + originalUrl.length;
                        const code = extractCode(node, matchIndex, matchEnd);
                        if (code) {
                            href += `#pwd=${code}`;
                        }
                    }
                }

                const a = document.createElement('a');
                a.href = href;
                a.textContent = url;
                a.style.color = 'inherit';
                a.style.textDecoration = 'underline';
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                a.setAttribute(CONFIG.processedAttribute, 'true');

                fragment.appendChild(a);

                const remainingMatchPart = originalUrl.substring(url.length);
                if (remainingMatchPart.length > 0) {
                    fragment.appendChild(document.createTextNode(remainingMatchPart));
                }

                lastIndex = matchIndex + originalUrl.length;
                matchCount++;
            }

            if (lastIndex < text.length) {
                fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
            }

            if (matchCount > 0) {
                return fragment;
            }
            return null;
        } catch (e) {
            console.error('Text to Hyperlink Error:', e);
            return null;
        }
    }

    function processContainer(container) {
        // Critical change: We still check 'processedAttribute', but now we expect MutationObserver
        // to have aggressively cleared it from relevant ancestors if needed.
        if (container.hasAttribute(CONFIG.processedAttribute)) {
            return;
        }

        container.setAttribute(CONFIG.processedAttribute, 'true');

        const textNodes = getTextNodes(container);

        const chunkSize = 50;
        let index = 0;

        function processChunk() {
            const end = Math.min(index + chunkSize, textNodes.length);
            for (let i = index; i < end; i++) {
                const node = textNodes[i];
                if (!node.parentNode) continue;

                const newContent = linkifyTextNode(node);
                if (newContent) {
                    node.parentNode.replaceChild(newContent, node);
                }
            }
            index = end;
            if (index < textNodes.length) {
                requestAnimationFrame(processChunk);
            }
        }

        if (textNodes.length > 0) {
            processChunk();
        }
        processExistingTags(container);
    }

    // --- Observers ---
    const relevantTags = 'p, div, span, li, td, h1, h2, h3, h4, h5, h6, article, section, blockquote, font, u, cite, em, strong, b, i, code';

    const intersectionObserver = new IntersectionObserver((entries) => {
        const visibleEntries = entries.filter(entry => entry.isIntersecting).map(entry => entry.target);
        visibleEntries.forEach(target => {
            processContainer(target);
            intersectionObserver.unobserve(target);
        });
    }, CONFIG.observeOptions);


    let timeout = null;
    const mutationObserver = new MutationObserver((mutations) => {
        const elementsToUpdate = new Set();
        // New Set to track ancestors that need attribute clearing
        const ancestorsToClear = new Set();

        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if it's our own link (prevent infinite loop)
                        if (node.tagName === 'A' && node.hasAttribute(CONFIG.processedAttribute)) {
                            return;
                        }

                        elementsToUpdate.add(node);

                        // Critical Fix: Walk up the tree to check if any ancestor is marked processed
                        // If so, we must clear it to allow this new child to be processed.
                        // We check up to 10 levels or until body
                        let parent = node.parentNode;
                        let levels = 0;
                        while (parent && parent !== document.body && levels < 10) {
                            if (parent.hasAttribute(CONFIG.processedAttribute)) {
                                ancestorsToClear.add(parent);
                            }
                            parent = parent.parentNode;
                            levels++;
                        }

                    } else if (node.nodeType === Node.TEXT_NODE) {
                        if (node.parentNode && node.parentNode.nodeType === Node.ELEMENT_NODE) {
                            elementsToUpdate.add(node.parentNode);
                            // Also check ancestors for text node's parent
                            let parent = node.parentNode;
                            let levels = 0;
                            while (parent && parent !== document.body && levels < 10) {
                                if (parent.hasAttribute(CONFIG.processedAttribute)) {
                                    ancestorsToClear.add(parent);
                                }
                                parent = parent.parentNode;
                                levels++;
                            }

                        }
                    }
                });
            } else if (mutation.type === 'characterData') {
                if (mutation.target.nodeType === Node.TEXT_NODE && mutation.target.parentNode) {
                    elementsToUpdate.add(mutation.target.parentNode);
                }
            }
        });

        // 1. Clear ancestors first
        if (ancestorsToClear.size > 0) {
            ancestorsToClear.forEach(el => {
                el.removeAttribute(CONFIG.processedAttribute);
            });
        }

        // 2. Schedule updates (Lazy Load via IntersectionObserver)
        if (elementsToUpdate.size > 0) {
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(() => {
                elementsToUpdate.forEach(el => {
                    // Also clear attribute on the element itself if it was somehow marked
                    // (This ensures we don't skip it if we observe it)
                    if (el.removeAttribute) {
                        el.removeAttribute(CONFIG.processedAttribute);
                    }

                    // Instead of processing immediately, we recognize this is new content.
                    // We want to apply the same "Lazy Load" logic as the initial page load.
                    // So we observe the element (if relevant) and its children.

                    if (el.matches && el.matches(relevantTags)) {
                        intersectionObserver.observe(el);
                    }

                    if (el.querySelectorAll) {
                        el.querySelectorAll(relevantTags).forEach(child => {
                            intersectionObserver.observe(child);
                        });
                    }
                });
            }, 100);
        }
    });

    if (isLinkifyEnabled()) {
        document.querySelectorAll(relevantTags).forEach(el => {
            intersectionObserver.observe(el);
        });

        mutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    // Expose debug helpers
    if (typeof unsafeWindow !== 'undefined') {
        unsafeWindow.debugLinkify = () => {
            console.log('Linkify Debug: Checking...');
            console.log('Global Enabled:', isLinkifyEnabled());
            console.log('Hostname:', hostname);
            const example = document.querySelector('cite');
            if (example) {
                console.log('Found cite tag:', example);
                console.log('Processed attr:', example.getAttribute(CONFIG.processedAttribute));
            }
        };
        unsafeWindow.forceLinkify = () => {
            console.log('Forcing Linkify on Body...');
            document.body.removeAttribute(CONFIG.processedAttribute);
            processContainer(document.body);
        };
    }

})();
