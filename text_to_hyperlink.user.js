// ==UserScript==
// @name         Text to Hyperlink
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Convert plain text URLs to clickable links
// @author       You
// @match        *://*/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

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
    document.querySelectorAll(relevantTags).forEach(el => {
        intersectionObserver.observe(el);
    });

})();
