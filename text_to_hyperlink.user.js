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
        regex: /((?:https?:\/\/|magnet:\?xt=|tg:\/\/|ms-windows-store:\/\/|ed2k:\/\/|thunder:\/\/)[^\s<>"']+)/gi,
        observeOptions: {
            root: null, // viewport
            rootMargin: '200px', // Pre-load slightly outside viewport
            threshold: 0.1
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

                    // Skip if already processed (though we check the container usually)
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
        const punctuation = /[,.;:!?")\]]/;
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
        const text = node.nodeValue;
        if (!text || !CONFIG.regex.test(text)) return;

        const fragment = document.createDocumentFragment();
        let lastIndex = 0;
        let match;

        // Reset regex state
        CONFIG.regex.lastIndex = 0;

        while ((match = CONFIG.regex.exec(text)) !== null) {
            let url = match[0];
            const originalUrl = url;

            // Trim trailing punctuation
            url = trimUrl(url);

            const matchIndex = match.index;
            const preText = text.substring(lastIndex, matchIndex);

            // Add preceding text
            if (preText.length > 0) {
                fragment.appendChild(document.createTextNode(preText));
            }

            // Create link
            const a = document.createElement('a');
            a.href = url;
            a.textContent = url;
            a.style.color = 'inherit';
            a.style.textDecoration = 'underline';
            a.target = '_blank';
            a.rel = 'noopener noreferrer';

            // Prevent recursive processing
            a.setAttribute(CONFIG.processedAttribute, 'true');

            fragment.appendChild(a);

            // Update lastIndex based on the potentially trimmed URL length
            // wait, match[0] is the FULL match. If we trimmed it, the remaining part is just text.
            // But we already added preText up to matchIndex. 
            // So we added the link. Now we need to handle the TRAILING part of the match that was trimmed.

            const trimmedCount = originalUrl.length - url.length;
            const remainingMatchPart = originalUrl.substring(url.length);

            if (remainingMatchPart.length > 0) {
                fragment.appendChild(document.createTextNode(remainingMatchPart));
            }

            lastIndex = matchIndex + originalUrl.length;
        }

        // Add remaining text
        if (lastIndex < text.length) {
            fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
        }

        return fragment;
    }

    /**
     * Process a container element
     */
    function processContainer(container) {
        if (container.hasAttribute(CONFIG.processedAttribute)) return;

        // Mark as processed immediately to prevent double processing
        // Note: Ideally we mark the text nodes or their direct parents, but marking the container is a heuristic.
        // For fine-grained control, we should just rely on the walker skipping 'a' tags.
        // But for performance, marking the container helps IntersectionObserver know what's done.
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
        // Debounce
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Observe the new element for visibility
                        // Optimization: Check if it's a large container or small element?
                        // Just observe it.
                        intersectionObserver.observe(node);

                        // Also check children if it's a huge tree inserted at once
                        const children = node.querySelectorAll('*');
                        children.forEach(child => intersectionObserver.observe(child));
                    }
                });
            });
        }, 200); // 200ms debounce
    });

    // Start observing
    mutationObserver.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Initial pass: Observe all existing elements
    // We target "blocks" usually, but observing everything might be heavy on memory for IO?
    // Optimization: Observe specific block-level elements or just body's direct children?
    // Let's observe all elements that might contain text.
    // A better approach for initial load:
    // Just run the walker on document.body but check visibility? 
    // Or just observe all elements. 
    // Let's try observing all leaf-ish elements or block elements.

    // Strategy: Observe everything, IO is generally efficient.
    // But observing 10k elements is bad.
    // Better strategy: Observe specific tags? p, div, span, li, td?
    const relevantTags = 'p, div, span, li, td, h1, h2, h3, h4, h5, h6, article, section, blockquote';
    document.querySelectorAll(relevantTags).forEach(el => {
        intersectionObserver.observe(el);
    });

})();
