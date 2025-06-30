class WebRefactorContent {
    constructor() {
        this.interactiveDetector = new InteractiveElementDetector();
        this.domAnalyzer = new DOMAnalyzer();
        this.commandExecutor = new CommandExecutor();
        this.visualEnhancer = new VisualEnhancer();
        this.mutationObserver = null;
        this.originalState = null;
        
        this.setupMessageListener();
        this.initializeMutationObserver();
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true; // Keep message channel open for async response
        });
    }

    async handleMessage(message, sender, sendResponse) {
        try {
            switch (message.action) {
                case 'ping':
                    console.log('🏓 Received ping, sending pong...');
                    sendResponse({ pong: true });
                    return; // Return early for ping to avoid async handling
                case 'extractContent':
                    await this.handleExtractContent(sendResponse);
                    break;
                case 'executeCommands':
                    await this.handleExecuteCommands(message.commands, sendResponse);
                    break;
                case 'reset':
                    await this.handleReset(message.originalState, sendResponse);
                    break;
                case 'getDebugLogs':
                    await this.handleGetDebugLogs(sendResponse);
                    break;
                case 'capturePageWithPrivacy':
                    await this.handleCapturePageWithPrivacy(message, sendResponse);
                    break;
                case 'applyEnhancements':
                    await this.handleApplyEnhancements(message.commands, sendResponse);
                    break;
                case 'EXECUTE_ANALYSIS_RESULT':
                    await this.handleExecuteAnalysisResult(message.payload, sendResponse);
                    break;
                case 'makeProxyRequest':
                    await this.handleMakeProxyRequest(message, sendResponse);
                    break;
                default:
                    sendResponse({ success: false, error: 'Unknown action' });
            }
        } catch (error) {
            console.error('Content script message handler error:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    async handleExtractContent(sendResponse) {
        try {
            // Store original state for reset functionality
            this.originalState = this.domAnalyzer.captureOriginalState();
            
            // Detect interactive elements
            const interactiveElements = this.interactiveDetector.detectInteractiveElements();
            
            // Analyze page content
            const analysis = this.domAnalyzer.analyzePage(interactiveElements);
            
            sendResponse({
                success: true,
                data: {
                    analysis,
                    interactiveElements,
                    originalState: this.originalState
                }
            });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }

    async handleExecuteCommands(commands, sendResponse) {
        try {
            // ALWAYS capture original state before ANY modifications
            // This ensures restore functionality works for both direct refactor and auto-apply
            if (!this.originalState) {
                this.originalState = this.domAnalyzer.captureOriginalState();
                console.log('📸 Captured original state before command execution');
            }
            
            // Record HTML before modification
            const beforeHTML = document.documentElement.outerHTML;
            console.log('=== HTML Before Page Modification ===');
            console.log('URL:', window.location.href);
            console.log('Time:', new Date().toISOString());
            console.log('HTML Length:', beforeHTML.length);
            console.log('First 1000 characters:', beforeHTML.substring(0, 1000));
            
            // Save complete HTML to localStorage for later analysis
            try {
                localStorage.setItem('webrefactor_before_html', beforeHTML);
                localStorage.setItem('webrefactor_before_time', new Date().toISOString());
            } catch (e) {
                console.warn('Unable to save to localStorage:', e);
            }
            
            let results;
            try {
                results = await this.commandExecutor.executeCommands(commands);
            } catch (commandError) {
                // Check if this is a white page error - if so, attempt automatic rollback
                if (commandError.message.includes('White page detected')) {
                    console.error('🚨 WHITE PAGE ERROR - Attempting automatic rollback...');
                    
                    try {
                        // Restore original state
                        this.visualEnhancer.destroy();
                        this.domAnalyzer.restoreOriginalState(this.originalState);
                        
                        console.log('✅ Automatic rollback completed successfully');
                        
                        // Return error with rollback info
                        sendResponse({ 
                            success: false, 
                            error: `${commandError.message}\n\n🔄 Automatic rollback was performed to restore the page to its original state.`,
                            rollbackPerformed: true
                        });
                        return;
                    } catch (rollbackError) {
                        console.error('❌ Automatic rollback failed:', rollbackError);
                        sendResponse({ 
                            success: false, 
                            error: `${commandError.message}\n\n❌ Automatic rollback also failed: ${rollbackError.message}\n\nPlease refresh the page to restore functionality.`,
                            rollbackFailed: true
                        });
                        return;
                    }
                } else {
                    // Re-throw other errors
                    throw commandError;
                }
            }
            
            // Record HTML after modification
            setTimeout(() => {
                const afterHTML = document.documentElement.outerHTML;
                console.log('=== HTML After Page Modification ===');
                console.log('URL:', window.location.href);
                console.log('Time:', new Date().toISOString());
                console.log('HTML Length:', afterHTML.length);
                console.log('First 1000 characters:', afterHTML.substring(0, 1000));
                console.log('HTML length change:', afterHTML.length - beforeHTML.length);
                
                // Save complete HTML to localStorage
                try {
                    localStorage.setItem('webrefactor_after_html', afterHTML);
                    localStorage.setItem('webrefactor_after_time', new Date().toISOString());
                    localStorage.setItem('webrefactor_commands', JSON.stringify(commands));
                } catch (e) {
                    console.warn('Unable to save to localStorage:', e);
                }
                
                // Legacy white page check (should not trigger now due to new detection)
                const hasVisibleContent = document.body && 
                    document.body.innerText.trim().length > 0 &&
                    document.body.offsetHeight > 0;
                
                if (!hasVisibleContent) {
                    console.error('⚠️ Legacy warning: Page may show a blank screen!');
                    console.error('Body content:', document.body ? document.body.innerHTML.substring(0, 500) : 'Body does not exist');
                    console.error('Body text length:', document.body ? document.body.innerText.trim().length : 0);
                    console.error('Body height:', document.body ? document.body.offsetHeight : 0);
                }
            }, 100); // Delay 100ms to ensure DOM updates are complete
            
            sendResponse({ success: true, data: { results, executed: commands.length } });
        } catch (error) {
            console.error('Error executing commands:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    async handleReset(originalState, sendResponse) {
        try {
            if (originalState) {
                this.originalState = originalState;
            }
            
            if (!this.originalState) {
                // Try to get from localStorage as fallback
                const beforeHtml = localStorage.getItem('webrefactor_before_html');
                if (beforeHtml) {
                    this.originalState = {
                        html: beforeHtml,
                        timestamp: Date.now(),
                        url: window.location.href
                    };
                    console.log('📸 Recovered original state from localStorage');
                } else {
                    throw new Error('No original state available to restore. Please refresh the page.');
                }
            }

            this.visualEnhancer.destroy();
            this.domAnalyzer.restoreOriginalState(this.originalState);
            
            // Clear the stored state after successful restore
            this.originalState = null;
            
            sendResponse({ success: true, data: { message: 'Page has been restored to original state' } });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }

    async handleCapturePageWithPrivacy(message, sendResponse) {
        try {
            // NOTE: html2canvas is assumed to be available
            // In a real scenario, it would need to be injected or bundled.
            if (typeof html2canvas === 'undefined') {
                throw new Error('html2canvas is not available.');
            }
            
            // Extract page content first
            const interactiveElements = this.interactiveDetector.detectInteractiveElements();
            const analysis = this.domAnalyzer.analyzePage(interactiveElements);
            this.originalState = this.domAnalyzer.captureOriginalState();

            const canvas = await html2canvas(document.body, {
                useCORS: true,
                logging: false,
                width: window.innerWidth,
                height: window.innerHeight,
                x: window.scrollX,
                y: window.scrollY,
            });

            // For simplicity, we are not implementing the blurring part here,
            // as it would require a significant amount of code for OCR/text detection.
            // We will send the raw screenshot as per the simplified design.
            const screenshotDataUrl = canvas.toDataURL('image/jpeg', message.quality || 0.8);
            
            sendResponse({
                success: true,
                data: {
                    screenshot: screenshotDataUrl,
                    pageContent: {
                        analysis,
                        interactiveElements,
                        originalState: this.originalState
                    }
                }
            });

        } catch (error) {
            console.error('Capture page error:', error);
            sendResponse({ success: false, error: 'Failed to capture page: ' + error.message });
        }
    }

    async handleApplyEnhancements(commands, sendResponse) {
        try {
            await this.visualEnhancer.applyCommands(commands);
            sendResponse({ success: true, data: { status: 'Enhancements applied' } });
        } catch (error) {
            console.error('Apply enhancements error:', error);
            sendResponse({ success: false, error: 'Failed to apply enhancements: ' + error.message });
        }
    }

    async handleExecuteAnalysisResult(payload, sendResponse) {
        try {
            const { actions } = payload;

            if (!actions || !Array.isArray(actions)) {
                throw new Error("Invalid or missing 'actions' array in payload.");
            }

            for (const action of actions) {
                const elements = document.querySelectorAll(action.selector);

                if (elements.length === 0) {
                    console.warn(`Action skipped: No element found for selector "${action.selector}"`);
                    continue;
                }

                elements.forEach(element => {
                    switch (action.type) {
                        case 'HIGHLIGHT':
                            console.log('Highlighting instruction:', action.text);
                            element.style.border = '3px solid red';
                            element.style.backgroundColor = 'yellow';
                            break;
                        case 'ADD_TEXT':
                            element.innerHTML += '<strong>' + action.text + '</strong>';
                            break;
                        default:
                            console.warn(`Unknown action type: ${action.type}`);
                    }
                });
            }
            sendResponse({ success: true, data: { status: 'Analysis results executed' } });
        } catch (error) {
            console.error('Error executing analysis result:', error);
            sendResponse({ success: false, error: 'Failed to execute analysis results: ' + error.message });
        }
    }
    
    async handleGetDebugLogs(sendResponse) {
        try {
            const logs = {
                url: window.location.href,
                beforeHtml: localStorage.getItem('webrefactor_before_html') || null,
                beforeTime: localStorage.getItem('webrefactor_before_time') || null,
                afterHtml: localStorage.getItem('webrefactor_after_html') || null,
                afterTime: localStorage.getItem('webrefactor_after_time') || null,
                commands: JSON.parse(localStorage.getItem('webrefactor_commands') || '[]'),
                
                // Enhanced retry-specific debug information
                lastCommands: this.commandExecutor.lastFailedCommands || [],
                pageStateBefore: this.commandExecutor.lastPageStateBefore || null,
                pageStateAfter: this.commandExecutor.lastPageStateAfter || null,
                executedCommands: this.commandExecutor.executedCommands || [],
                originalState: this.originalState || null,
                
                // Current page state for comparison
                currentPageState: this.commandExecutor.capturePageState(),
                
                // Additional context
                timestamp: Date.now(),
                userAgent: navigator.userAgent,
                windowSize: {
                    width: window.innerWidth,
                    height: window.innerHeight
                }
            };
            
            sendResponse({ success: true, data: logs });
        } catch (error) {
            console.error('Failed to get debug logs:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    initializeMutationObserver() {
        this.mutationObserver = new MutationObserver((mutations) => {
            // Handle dynamic content changes
            this.handleDynamicChanges(mutations);
        });

        this.mutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: false
        });
    }

    handleDynamicChanges(mutations) {
        // Check if new interactive elements were added
        let hasNewInteractiveElements = false;
        
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    const newInteractives = this.interactiveDetector.detectInElement(node);
                    if (newInteractives.length > 0) {
                        hasNewInteractiveElements = true;
                    }
                }
            });
        });

        if (hasNewInteractiveElements) {
            console.log('Detected new interactive elements added to page');
            // Could trigger re-analysis or notify background script
        }
    }
}

class InteractiveElementDetector {
    constructor() {
        this.interactiveSelectors = [
            'button',
            'input',
            'select',
            'textarea',
            'a[href]',
            '[onclick]',
            '[onmousedown]',
            '[onmouseup]',
            '[tabindex]',
            '[role="button"]',
            '[role="link"]',
            '[role="checkbox"]',
            '[role="radio"]',
            '[role="slider"]',
            '[role="tab"]',
            '[role="menuitem"]',
            '[role="textbox"]',
            'form',
            '[role="form"]'
        ];
    }

    detectInteractiveElements() {
        const interactiveElements = [];
        
        this.interactiveSelectors.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    const info = this.analyzeInteractiveElement(element);
                    if (info) {
                        interactiveElements.push(info);
                    }
                });
            } catch (error) {
                console.warn(`Error with selector ${selector}:`, error);
            }
        });

        return this.deduplicateElements(interactiveElements);
    }

    detectInElement(element) {
        const interactiveElements = [];
        
        this.interactiveSelectors.forEach(selector => {
            try {
                // Check the element itself
                if (element.matches && element.matches(selector)) {
                    const info = this.analyzeInteractiveElement(element);
                    if (info) interactiveElements.push(info);
                }
                
                // Check children
                const children = element.querySelectorAll(selector);
                children.forEach(child => {
                    const info = this.analyzeInteractiveElement(child);
                    if (info) interactiveElements.push(info);
                });
            } catch (error) {
                console.warn(`Error with selector ${selector} in element:`, error);
            }
        });

        return this.deduplicateElements(interactiveElements);
    }

    analyzeInteractiveElement(element) {
        try {
            // Generate unique selector for this element
            const selector = this.generateUniqueSelector(element);
            if (!selector) return null;

            // Determine if this is a "useful" interactive element or just ads/clutter
            const isUsefulInteractive = this.isUsefulInteractiveElement(element);

            return {
                selector,
                tagName: element.tagName.toLowerCase(),
                type: element.type || null,
                role: element.getAttribute('role') || null,
                hasTabIndex: element.hasAttribute('tabindex'),
                hasEventHandlers: this.hasEventHandlers(element),
                text: element.textContent?.trim().substring(0, 50) || '',
                className: element.className || '',
                id: element.id || '',
                isUseful: isUsefulInteractive, // Mark whether it's a useful interactive element
                canBeRemoved: !isUsefulInteractive, // Mark whether it can be removed
                purpose: this.guessElementPurpose(element) // Guess element purpose
            };
        } catch (error) {
            console.warn('Error analyzing interactive element:', error);
            return null;
        }
    }

    isUsefulInteractiveElement(element) {
        const text = element.textContent?.toLowerCase() || '';
        const className = element.className?.toLowerCase() || '';
        const id = element.id?.toLowerCase() || '';
        
        // Protect critical CSS and JS elements - must never be removed
        const criticalElements = [
            'style', 'css', 'script', 'js',
            's_is_result_css', 's_index_off_css',  // Baidu-specific CSS elements
            'result_css', 'index_css'
        ];
        
        const isCritical = criticalElements.some(indicator => 
            id.includes(indicator) || className.includes(indicator)
        );
        
        if (isCritical) {
            console.log('🛡️ Protecting critical element:', element.tagName, element.id, element.className);
            return true; // Mark as useful, cannot be removed
        }
        
        // Likely ads/promotional elements (can be removed)
        const adIndicators = [
            'ad', 'ads', 'advertisement', 'promo', 'sponsor', 'banner',
            'shop', 'buy', 'purchase'
        ];
        
        const hasAdIndicator = adIndicators.some(indicator => 
            text.includes(indicator) || className.includes(indicator) || id.includes(indicator)
        );
        
        if (hasAdIndicator) return false;
        
        // Likely useful elements (should be preserved if kept)
        const usefulIndicators = [
            'menu', 'nav', 'search', 'login', 'submit', 'comment', 'share',
            'like', 'follow', 'subscribe', 'contact', 'home', 'back'
        ];
        
        const hasUsefulIndicator = usefulIndicators.some(indicator =>
            text.includes(indicator) || className.includes(indicator) || id.includes(indicator)
        );
        
        if (hasUsefulIndicator) return true;
        
        // Default: consider main content area elements as useful
        const isInMainContent = element.closest('main, article, .content, .main');
        return !!isInMainContent;
    }

    guessElementPurpose(element) {
        const text = element.textContent?.toLowerCase() || '';
        const className = element.className?.toLowerCase() || '';
        
        if (text.includes('login') || text.includes('sign in')) return 'login';
        if (text.includes('search')) return 'search';
        if (text.includes('menu') || text.includes('navigation')) return 'navigation';
        if (text.includes('share')) return 'social';
        if (text.includes('comment')) return 'engagement';
        if (className.includes('ad') || text.includes('advertisement')) return 'advertisement';
        if (text.includes('buy') || text.includes('purchase')) return 'commerce';
        
        return 'unknown';
    }

    generateUniqueSelector(element) {
        try {
            // Try ID first
            if (element.id) {
                const idSelector = `#${CSS.escape(element.id)}`;
                if (document.querySelectorAll(idSelector).length === 1) {
                    return idSelector;
                }
            }

            // Try unique class combination
            if (element.className) {
                const classes = element.className.split(' ')
                    .filter(cls => cls.trim())
                    .map(cls => `.${CSS.escape(cls)}`)
                    .join('');
                
                if (classes) {
                    const classSelector = `${element.tagName.toLowerCase()}${classes}`;
                    if (document.querySelectorAll(classSelector).length === 1) {
                        return classSelector;
                    }
                }
            }

            // Build path-based selector
            const path = [];
            let current = element;
            
            while (current && current !== document.body && path.length < 10) {
                let selector = current.tagName.toLowerCase();
                
                // Add nth-child if needed for uniqueness
                if (current.parentElement) {
                    const siblings = Array.from(current.parentElement.children)
                        .filter(el => el.tagName === current.tagName);
                    
                    if (siblings.length > 1) {
                        const index = siblings.indexOf(current) + 1;
                        selector += `:nth-child(${index})`;
                    }
                }
                
                path.unshift(selector);
                current = current.parentElement;
            }
            
            const pathSelector = path.join(' > ');
            
            // Verify selector uniqueness
            if (document.querySelectorAll(pathSelector).length === 1) {
                return pathSelector;
            }
            
            return null;
        } catch (error) {
            console.warn('Error generating selector:', error);
            return null;
        }
    }

    hasEventHandlers(element) {
        const eventAttributes = [
            'onclick', 'onmousedown', 'onmouseup', 'onchange', 
            'onsubmit', 'onfocus', 'onblur', 'onkeydown', 'onkeyup'
        ];
        
        return eventAttributes.some(attr => element.hasAttribute(attr));
    }

    deduplicateElements(elements) {
        const seen = new Set();
        return elements.filter(element => {
            if (seen.has(element.selector)) {
                return false;
            }
            seen.add(element.selector);
            return true;
        });
    }
}

class DOMAnalyzer {
    constructor() {
        this.ignoredSelectors = [
            'script', 'style', 'noscript', 'meta', 'link', 'title'
        ];
    }

    captureOriginalState() {
        try {
            return {
                html: document.documentElement.outerHTML,
                timestamp: Date.now(),
                url: window.location.href
            };
        } catch (error) {
            console.error('Error capturing original state:', error);
            return null;
        }
    }

    restoreOriginalState(originalState) {
        try {
            if (!originalState || !originalState.html) {
                throw new Error('Invalid original state data');
            }

            // Parse the original HTML
            const parser = new DOMParser();
            const originalDoc = parser.parseFromString(originalState.html, 'text/html');
            
            // Replace body content
            document.body.innerHTML = originalDoc.body.innerHTML;
            
            // Restore head content (excluding scripts for security)
            const originalHead = originalDoc.head;
            const currentHead = document.head;
            
            // Remove added styles
            const addedStyles = currentHead.querySelectorAll('style[data-refactor]');
            addedStyles.forEach(style => style.remove());
            
            console.log('Page restored to original state');
        } catch (error) {
            console.error('Error restoring original state:', error);
            throw new Error('Failed to restore original state, please refresh the page');
        }
    }

    analyzePage(interactiveElements) {
        try {
            const analysis = {
                title: document.title,
                url: window.location.href,
                mainContent: this.extractMainContent(),
                structure: this.analyzeStructure(),
                textContent: this.extractTextContent(),
                images: this.analyzeImages(),
                links: this.analyzeLinks(),
                advertisements: this.detectAdvertisements(),
                timestamp: Date.now()
            };

            return analysis;
        } catch (error) {
            console.error('Error analyzing page:', error);
            throw new Error('Page analysis failed');
        }
    }

    extractMainContent() {
        const contentSelectors = [
            'main', '[role="main"]', '.main', '#main',
            'article', '.article', '.content', '.post',
            '.entry', '.text', '.body'
        ];

        for (const selector of contentSelectors) {
            const element = document.querySelector(selector);
            if (element && this.isContentElement(element)) {
                return {
                    selector,
                    text: element.textContent?.trim().substring(0, 500) || '',
                    hasText: (element.textContent?.trim().length || 0) > 100
                };
            }
        }

        // Fallback: find largest text block
        return this.findLargestTextBlock();
    }

    isContentElement(element) {
        const textLength = element.textContent?.trim().length || 0;
        const hasStructure = element.querySelectorAll('p, h1, h2, h3, h4, h5, h6').length > 0;
        
        return textLength > 100 && hasStructure;
    }

    findLargestTextBlock() {
        const textBlocks = [];
        
        document.querySelectorAll('div, section, article').forEach(element => {
            const textLength = element.textContent?.trim().length || 0;
            if (textLength > 200) {
                textBlocks.push({
                    element,
                    textLength,
                    selector: this.generateSimpleSelector(element)
                });
            }
        });

        textBlocks.sort((a, b) => b.textLength - a.textLength);
        
        return textBlocks.length > 0 ? {
            selector: textBlocks[0].selector,
            text: textBlocks[0].element.textContent?.trim().substring(0, 500) || '',
            hasText: true
        } : null;
    }

    analyzeStructure() {
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
            .map(h => ({
                level: parseInt(h.tagName.substring(1)),
                text: h.textContent?.trim() || '',
                selector: this.generateSimpleSelector(h)
            }));

        const paragraphs = document.querySelectorAll('p').length;
        const lists = document.querySelectorAll('ul, ol').length;
        
        return {
            headings,
            paragraphs,
            lists,
            hasHeader: !!document.querySelector('header, .header'),
            hasFooter: !!document.querySelector('footer, .footer'),
            hasSidebar: !!document.querySelector('aside, .sidebar, .side')
        };
    }

    extractTextContent() {
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            node => {
                const parent = node.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;
                
                const tagName = parent.tagName.toLowerCase();
                if (this.ignoredSelectors.includes(tagName)) {
                    return NodeFilter.FILTER_REJECT;
                }
                
                const text = node.textContent?.trim();
                return text && text.length > 20 ? 
                    NodeFilter.FILTER_ACCEPT : 
                    NodeFilter.FILTER_REJECT;
            }
        );

        const textBlocks = [];
        let node;
        
        while (node = walker.nextNode()) {
            const text = node.textContent?.trim();
            if (text && text.length > 20) {
                textBlocks.push(text.substring(0, 200));
            }
            
            if (textBlocks.length >= 10) break; // Limit for performance
        }

        return textBlocks;
    }

    analyzeImages() {
        const images = Array.from(document.querySelectorAll('img'))
            .filter(img => img.src && !img.src.startsWith('data:'))
            .slice(0, 20) // Limit for performance
            .map(img => ({
                src: img.src,
                alt: img.alt || '',
                width: img.width || 0,
                height: img.height || 0,
                selector: this.generateSimpleSelector(img)
            }));

        return images;
    }

    analyzeLinks() {
        const links = Array.from(document.querySelectorAll('a[href]'))
            .filter(link => link.href && !link.href.startsWith('javascript:'))
            .slice(0, 50) // Limit for performance
            .map(link => ({
                href: link.href,
                text: link.textContent?.trim() || '',
                isExternal: !link.href.startsWith(window.location.origin),
                selector: this.generateSimpleSelector(link)
            }));

        return links;
    }

    detectAdvertisements() {
        // 使用更精确的广告检测选择器，避免误伤正常内容
        const adSelectors = [
            // 具体的广告容器类名（完整匹配）
            '.advertisement', '.ads', '.advert', '.sponsored', '.promotion',
            '#advertisement', '#ads', '#advert', '#sponsored', '#promotion',
            
            // 明确的广告容器
            '.ad-container', '.ad-wrapper', '.ad-content', '.ad-banner',
            '.banner-ad', '.sidebar-ad', '.header-ad', '.footer-ad',
            '.commercial', '.marketing', '.promo-banner',
            
            // 广告网络iframe（更具体的匹配）
            'iframe[src*="googleads"]',
            'iframe[src*="doubleclick"]',
            'iframe[src*="googlesyndication"]',
            'iframe[src*="amazon-adsystem"]',
            'iframe[src*="facebook.com/tr"]',
            'iframe[src*="google.com/ads"]',
            
            // 广告脚本容器
            '.google-ads', '.adsense', '.adsbygoogle',
            '.outbrain', '.taboola', '.revcontent',
            
            // 常见的广告标识
            '[data-ad]', '[data-ads]', '[data-advertisement]',
            '[role="banner"][class*="sponsor"]'
        ];

        const potentialAds = [];
        const processedElements = new Set();
        
        adSelectors.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    // 避免重复
                    if (processedElements.has(element)) return;
                    processedElements.add(element);
                    
                    // 额外验证，确保不是重要内容
                    if (this.isLikelyImportantContent(element)) {
                        return; // 跳过重要内容
                    }
                    
                    const adInfo = {
                        selector: this.generateSimpleSelector(element),
                        reason: `Matched ad selector: ${selector}`,
                        text: element.textContent?.trim().substring(0, 100) || '',
                        tagName: element.tagName.toLowerCase(),
                        className: element.className || '',
                        isInteractive: this.isElementInteractive(element),
                        canBeRemoved: true
                    };
                    
                    potentialAds.push(adInfo);
                });
            } catch (error) {
                console.warn(`Error with ad selector ${selector}:`, error);
            }
        });

        // 使用更保守的内容检测
        this.detectAdsByContent(potentialAds, processedElements);

        return potentialAds.slice(0, 20); // 减少数量，提高精度
    }

    isLikelyImportantContent(element) {
        // 检查是否是重要内容，避免误伤
        const importantSelectors = [
            'main', 'article', 'section', 'header', 'footer', 'nav',
            '[role="main"]', '[role="article"]', '[role="navigation"]',
            '.content', '.main-content', '.article-content', '.post-content',
            '.navigation', '.menu', '.navbar', '.header', '.footer'
        ];
        
        // 检查自身或祖先是否匹配重要选择器
        for (let selector of importantSelectors) {
            if (element.matches && element.matches(selector)) return true;
            if (element.closest && element.closest(selector)) return true;
        }
        
        // 检查是否包含大量文本内容（可能是文章内容）
        const textLength = element.textContent?.trim().length || 0;
        if (textLength > 500) return true;
        
        // 检查是否包含重要的交互元素
        const hasImportantInputs = element.querySelectorAll('input, textarea, select, button').length > 2;
        if (hasImportantInputs) return true;
        
        return false;
    }

    detectAdsByContent(potentialAds, processedElements) {
        // 使用更精确的广告关键词检测
        const adKeywords = [
            'sponsored content', 'advertisement', 'promoted post',
            'ads by google', 'google ads', 'sponsored by',
            'promoted by', 'affiliate link'
        ];

        // 只检查侧边栏和明显的广告位置
        const candidateElements = document.querySelectorAll('aside, .sidebar, .ad-space, .widget');
        
        candidateElements.forEach(element => {
            if (processedElements.has(element)) return;
            if (this.isLikelyImportantContent(element)) return;
            
            const text = element.textContent?.toLowerCase() || '';
            const hasExactAdKeyword = adKeywords.some(keyword => 
                text.includes(keyword.toLowerCase())
            );
            
            // 只有明确包含广告关键词且不是重要内容才标记
            if (hasExactAdKeyword && element.offsetHeight > 0 && element.offsetWidth > 0) {
                processedElements.add(element);
                potentialAds.push({
                    selector: this.generateSimpleSelector(element),
                    reason: `Contains specific ad keywords`,
                    text: element.textContent?.trim().substring(0, 100) || '',
                    tagName: element.tagName.toLowerCase(),
                    isInteractive: this.isElementInteractive(element),
                    canBeRemoved: true
                });
            }
        });
    }

    isElementInteractive(element) {
        // Quick check if element has interactive features
        const interactiveTags = ['button', 'a', 'input', 'select', 'textarea'];
        const hasInteractiveTag = interactiveTags.includes(element.tagName.toLowerCase());
        const hasEventHandlers = element.hasAttribute('onclick') || element.hasAttribute('onmousedown');
        const hasRole = element.hasAttribute('role');
        const hasTabindex = element.hasAttribute('tabindex');
        
        return hasInteractiveTag || hasEventHandlers || hasRole || hasTabindex;
    }

    generateSimpleSelector(element) {
        try {
            if (element.id) {
                return `#${CSS.escape(element.id)}`;
            }
            
            if (element.className) {
                const classes = element.className.split(' ')
                    .filter(cls => cls.trim())
                    .slice(0, 3) // Limit classes
                    .map(cls => `.${CSS.escape(cls)}`)
                    .join('');
                
                if (classes) {
                    return `${element.tagName.toLowerCase()}${classes}`;
                }
            }
            
            return element.tagName.toLowerCase();
        } catch (error) {
            return element.tagName.toLowerCase();
        }
    }

}

class CommandExecutor {
    constructor() {
        this.executedCommands = [];
        this.lastPageStateBefore = null;
        this.lastPageStateAfter = null;
        this.lastFailedCommands = [];
    }
    
    isCriticalElement(element) {
        // Check if it's a critical CSS/JS element
        const tagName = element.tagName.toLowerCase();
        const id = element.id?.toLowerCase() || '';
        const className = element.className?.toLowerCase() || '';
        
        // Critical tags
        if (['style', 'script', 'link', 'meta'].includes(tagName)) {
            return true;
        }
        
        // Textarea elements containing critical CSS (like Baidu's CSS containers)
        if (tagName === 'textarea' && (
            id.includes('css') || 
            id.includes('style') ||
            className.includes('css') ||
            className.includes('style')
        )) {
            return true;
        }
        
        // Check if it contains CSS content
        const textContent = element.textContent || '';
        if (textContent.includes('css') || textContent.includes('style') || textContent.includes('{')) {
            const cssPatterns = [
                /\.[\w-]+\s*\{/,  // CSS class selector
                /#[\w-]+\s*\{/,   // CSS ID selector
                /\w+\s*:\s*[\w-]+;/,  // CSS property
                /font-size|color|background|display|position/i  // Common CSS properties
            ];
            
            if (cssPatterns.some(pattern => pattern.test(textContent))) {
                console.log('🛡️ CSS content detected, protecting element:', element.tagName, element.id);
                return true;
            }
        }
        
        return false;
    }

    async executeCommands(commands) {
        const results = [];
        
        try {
            // Capture page state before execution
            const beforeState = this.capturePageState();
            this.lastPageStateBefore = beforeState;
            console.log('📊 Page state before execution:', beforeState);
            
            // Execute commands in batches to optimize performance
            const batches = this.batchCommands(commands);
            
            for (const batch of batches) {
                const batchResults = await this.executeBatch(batch);
                results.push(...batchResults);
                
                // Check for white page after each batch
                await new Promise(resolve => setTimeout(resolve, 50));
                const currentState = this.capturePageState();
                
                if (this.detectWhitePage(beforeState, currentState)) {
                    console.error('🚨 WHITE PAGE DETECTED after batch execution!');
                    console.error('🚨 Before state:', beforeState);
                    console.error('🚨 Current state:', currentState);
                    
                    // Store failure information for retry
                    this.lastPageStateAfter = currentState;
                    this.lastFailedCommands = commands;
                    
                    // Stop execution and throw error to trigger rollback
                    throw new Error(`White page detected after executing commands. Page visibility critically compromised.`);
                }
                
                // Small delay between batches to prevent blocking
                await new Promise(resolve => setTimeout(resolve, 10));
            }
            
            // Final white page check
            const finalState = this.capturePageState();
            this.lastPageStateAfter = finalState;
            
            if (this.detectWhitePage(beforeState, finalState)) {
                console.error('🚨 WHITE PAGE DETECTED after final execution!');
                this.lastFailedCommands = commands;
                throw new Error(`White page detected after all commands executed. Page visibility critically compromised.`);
            }
            
            this.executedCommands.push(...commands);
            console.log(`✅ Executed ${commands.length} commands successfully`);
            console.log('📊 Final page state:', finalState);
            
        } catch (error) {
            console.error('Command execution error:', error);
            throw new Error(`Command execution failed: ${error.message}`);
        }
        
        return results;
    }

    capturePageState() {
        // More accurate visible element count
        const allElements = document.querySelectorAll('*');
        let visibleElements = 0;
        let significantElements = 0; // Elements with meaningful content
        
        allElements.forEach(el => {
            const style = window.getComputedStyle(el);
            const isVisible = style.display !== 'none' && 
                             style.visibility !== 'hidden' && 
                             style.opacity !== '0' &&
                             el.offsetWidth > 0 && 
                             el.offsetHeight > 0;
            
            if (isVisible) {
                visibleElements++;
                
                // Count elements that likely contain meaningful content
                const tagName = el.tagName.toLowerCase();
                const hasText = el.textContent && el.textContent.trim().length > 10;
                const isContentElement = ['p', 'div', 'span', 'article', 'section', 'main', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'td', 'th'].includes(tagName);
                
                if (isContentElement && hasText) {
                    significantElements++;
                }
            }
        });

        return {
            bodyExists: !!document.body,
            bodyTextLength: document.body ? document.body.innerText.trim().length : 0,
            bodyHeight: document.body ? document.body.offsetHeight : 0,
            bodyWidth: document.body ? document.body.offsetWidth : 0,
            visibleElements: visibleElements,
            significantElements: significantElements, // New metric
            headingCount: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
            linkCount: document.querySelectorAll('a[href]').length,
            imageCount: document.querySelectorAll('img[src]').length,
            formCount: document.querySelectorAll('form, input, button, select, textarea').length,
            contentContainers: document.querySelectorAll('main, article, section, .content, .main, #content, #main').length,
            timestamp: Date.now()
        };
    }

    detectWhitePage(beforeState, currentState) {
        // More intelligent white page detection with fewer false positives
        const criticalIndicators = [];
        const warningIndicators = [];
        
        console.log('🔍 White page detection comparing states:');
        console.log('Before:', beforeState);
        console.log('After:', currentState);
        
        // 1. CRITICAL: Body completely missing
        if (!currentState.bodyExists) {
            criticalIndicators.push('Body element missing');
        }
        
        // 2. CRITICAL: Extreme text content loss (>95% loss) with very little remaining
        if (beforeState.bodyTextLength > 500 && 
            currentState.bodyTextLength < Math.max(50, beforeState.bodyTextLength * 0.05)) {
            criticalIndicators.push(`Extreme text loss: ${beforeState.bodyTextLength} → ${currentState.bodyTextLength} (${Math.round((1 - currentState.bodyTextLength/beforeState.bodyTextLength) * 100)}% lost)`);
        }
        
        // 3. CRITICAL: Body height completely collapsed 
        if (beforeState.bodyHeight > 500 && currentState.bodyHeight < 30) {
            criticalIndicators.push(`Body completely collapsed: ${beforeState.bodyHeight}px → ${currentState.bodyHeight}px`);
        }
        
        // 4. CRITICAL: Almost all significant content elements gone
        if (beforeState.significantElements > 5 && 
            currentState.significantElements < Math.max(1, beforeState.significantElements * 0.1)) {
            criticalIndicators.push(`Significant content elements lost: ${beforeState.significantElements} → ${currentState.significantElements}`);
        }
        
        // 5. CRITICAL: Absolute empty state - multiple indicators together
        const isAbsolutelyEmpty = (
            currentState.bodyTextLength < 20 && 
            currentState.significantElements < 2 && 
            currentState.bodyHeight < 50 &&
            currentState.linkCount === 0 &&
            currentState.formCount === 0
        );
        
        if (isAbsolutelyEmpty) {
            criticalIndicators.push('Absolute empty state - no meaningful content remains');
        }
        
        // WARNING LEVEL: Less severe issues that might be normal
        
        // Large but not extreme content reduction
        if (beforeState.bodyTextLength > 200 && 
            currentState.bodyTextLength < beforeState.bodyTextLength * 0.3) {
            warningIndicators.push(`Significant text reduction: ${beforeState.bodyTextLength} → ${currentState.bodyTextLength}`);
        }
        
        // Many visible elements removed (but this could be normal for ad removal)
        if (beforeState.visibleElements > 20 && 
            currentState.visibleElements < beforeState.visibleElements * 0.2) {
            warningIndicators.push(`Many elements hidden: ${beforeState.visibleElements} → ${currentState.visibleElements}`);
        }
        
        // All content containers removed (only warn if there were many)
        if (beforeState.contentContainers > 2 && currentState.contentContainers === 0) {
            warningIndicators.push('All content containers removed');
        }
        
        // Log findings
        if (warningIndicators.length > 0) {
            console.warn('⚠️ White page warnings (may be normal):', warningIndicators);
        }
        
        // Only trigger white page detection for CRITICAL indicators
        if (criticalIndicators.length > 0) {
            console.error('🚨 CRITICAL white page indicators detected:', criticalIndicators);
            return true;
        }
        
        // Additional check: if we have multiple warning indicators, it might be critical
        if (warningIndicators.length >= 3) {
            console.error('🚨 Multiple warning indicators suggest white page:', warningIndicators);
            return true;
        }
        
        console.log('✅ Page appears normal after command execution');
        return false;
    }

    batchCommands(commands) {
        const batches = [];
        const batchSize = 10;
        
        for (let i = 0; i < commands.length; i += batchSize) {
            batches.push(commands.slice(i, i + batchSize));
        }
        
        return batches;
    }

    async executeBatch(commands) {
        const results = [];
        
        for (const command of commands) {
            try {
                const result = await this.executeCommand(command);
                results.push({ command, result, success: true });
            } catch (error) {
                console.warn('Command failed:', command, error);
                results.push({ 
                    command, 
                    error: error.message, 
                    success: false 
                });
            }
        }
        
        return results;
    }

    async executeCommand(command) {
        const { type, selector, ...params } = command;
        
        // Command parameters
        
        // Find target element(s)
        const elements = document.querySelectorAll(selector);
        
        if (elements.length === 0) {
            console.error(`❌ No matching elements found: ${selector}`);
            throw new Error(`No matching elements found: ${selector}`);
        }

        // Process each element
        
        let result;
        switch (type) {
            case 'hide':
                result = this.hideElements(elements);
                break;
            case 'remove':
                result = this.removeElements(elements);
                break;
            case 'style':
                result = this.styleElements(elements, params.cssProperties);
                break;
            case 'move':
                result = this.moveElements(elements, params);
                break;
            case 'wrap':
                result = this.wrapElements(elements, params.wrapperHtml);
                break;
            case 'reorderChildren':
                result = this.reorderChildren(elements[0], params.newOrder);
                break;
            default:
                throw new Error(`Unknown command type: ${type}`);
        }
        
        console.log(`✨ Command execution completed:`, result);
        return result;
    }

    hideElements(elements) {
        let hiddenCount = 0;
        let skippedCount = 0;
        
        elements.forEach(element => {
            // Protect critical elements from being hidden
            if (this.isCriticalElement(element)) {
                console.warn('⚠️ Skipping critical element from hiding:', element.tagName, element.id, element.className);
                skippedCount++;
                return;
            }
            
            if (element.style.display !== 'none') {
                element.style.setProperty('display', 'none', 'important');
                element.setAttribute('data-refactor-hidden', 'true');
                hiddenCount++;
            }
        });
        
        if (skippedCount > 0) {
            console.log(`🛡️ Protected ${skippedCount} critical elements from being hidden`);
        }
        
        return { action: 'hide', count: hiddenCount, skipped: skippedCount };
    }

    removeElements(elements) {
        let removedCount = 0;
        let skippedCount = 0;
        const removedElements = [];
        
        elements.forEach(element => {
            // Extra safety check - critical elements that must never be removed
            if (this.isCriticalElement(element)) {
                console.warn('⚠️ Skipping critical element from removal:', element.tagName, element.id, element.className);
                skippedCount++;
                return;
            }
            
            if (element.parentNode) {
                // Store element info for potential restoration
                const elementInfo = {
                    element: element.cloneNode(true),
                    parent: element.parentNode,
                    nextSibling: element.nextSibling
                };
                
                // Store in background for restoration
                element.setAttribute('data-refactor-removed', 'true');
                element.setAttribute('data-refactor-removal-id', `removed-${Date.now()}-${removedCount}`);
                
                // Actually remove the element from DOM
                element.parentNode.removeChild(element);
                removedCount++;
                
                console.log('🗑️ Removed element:', element.tagName, element.className);
            }
        });
        
        if (skippedCount > 0) {
            console.log(`🛡️ Protected ${skippedCount} critical elements`);
        }
        
        return { action: 'remove', count: removedCount, skipped: skippedCount };
    }

    styleElements(elements, cssProperties) {
        if (!cssProperties || typeof cssProperties !== 'object') {
            throw new Error('Invalid CSS properties');
        }
        
        let styledCount = 0;
        
        elements.forEach(element => {
            Object.entries(cssProperties).forEach(([property, value]) => {
                try {
                    element.style.setProperty(property, value);
                    element.setAttribute('data-refactor-styled', 'true');
                } catch (error) {
                    console.warn(`Failed to set style ${property}: ${value}`, error);
                }
            });
            styledCount++;
        });
        
        return { action: 'style', count: styledCount, properties: cssProperties };
    }

    moveElements(elements, params) {
        const { targetSelector, position } = params;
        const targetElement = document.querySelector(targetSelector);
        
        if (!targetElement) {
            throw new Error(`Target element not found: ${targetSelector}`);
        }
        
        let movedCount = 0;
        
        elements.forEach(element => {
            try {
                switch (position) {
                    case 'before':
                        targetElement.parentNode.insertBefore(element, targetElement);
                        break;
                    case 'after':
                        targetElement.parentNode.insertBefore(element, targetElement.nextSibling);
                        break;
                    case 'prepend':
                        targetElement.insertBefore(element, targetElement.firstChild);
                        break;
                    case 'append':
                        targetElement.appendChild(element);
                        break;
                    default:
                        throw new Error(`Invalid position: ${position}`);
                }
                
                element.setAttribute('data-refactor-moved', 'true');
                movedCount++;
            } catch (error) {
                console.warn('Failed to move element:', element, error);
            }
        });
        
        return { action: 'move', count: movedCount, position };
    }

    wrapElements(elements, wrapperHtml) {
        if (!wrapperHtml || typeof wrapperHtml !== 'string') {
            throw new Error('Invalid wrapper HTML');
        }
        
        let wrappedCount = 0;
        
        elements.forEach(element => {
            try {
                const wrapper = document.createElement('div');
                wrapper.innerHTML = wrapperHtml;
                const wrapperElement = wrapper.firstElementChild;
                
                if (!wrapperElement) {
                    throw new Error('Invalid wrapper HTML structure');
                }
                
                element.parentNode.insertBefore(wrapperElement, element);
                wrapperElement.appendChild(element);
                wrapperElement.setAttribute('data-refactor-wrapper', 'true');
                
                wrappedCount++;
            } catch (error) {
                console.warn('Failed to wrap element:', element, error);
            }
        });
        
        return { action: 'wrap', count: wrappedCount };
    }

    reorderChildren(parentElement, newOrder) {
        if (!parentElement || !Array.isArray(newOrder)) {
            throw new Error('Invalid reorder parameters');
        }
        
        try {
            const children = Array.from(parentElement.children);
            const fragment = document.createDocumentFragment();
            
            // Add children in new order
            newOrder.forEach(selector => {
                const child = parentElement.querySelector(selector);
                if (child) {
                    fragment.appendChild(child);
                }
            });
            
            // Add any remaining children that weren't in newOrder
            children.forEach(child => {
                if (!fragment.contains(child) && parentElement.contains(child)) {
                    fragment.appendChild(child);
                }
            });
            
            // Replace all children
            parentElement.innerHTML = '';
            parentElement.appendChild(fragment);
            parentElement.setAttribute('data-refactor-reordered', 'true');
            
            return { action: 'reorder', count: newOrder.length };
        } catch (error) {
            throw new Error(`Reorder failed: ${error.message}`);
        }
    }

    async handleMakeProxyRequest(message, sendResponse) {
        console.log('🔧 [CONTENT PROXY] Received proxy request');
        console.log('🔧 [CONTENT PROXY] Target URL:', message.targetUrl);
        console.log('🔧 [CONTENT PROXY] Proxy URL:', message.proxyUrl);
        
        try {
            // 在内容脚本中，我们仍然不能直接使用代理
            // 但我们可以尝试一些替代方案
            
            // 方案1：检查页面是否已经配置了代理（通过网络设置）
            console.log('🔧 [CONTENT PROXY] Attempting request from page context...');
            
            const response = await fetch(message.targetUrl, {
                method: message.options.method || 'POST',
                headers: message.options.headers,
                body: message.options.body
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ [CONTENT PROXY] Request successful via content script');
                sendResponse({
                    success: true,
                    data: {
                        ok: response.ok,
                        status: response.status,
                        statusText: response.statusText,
                        json: () => Promise.resolve(data)
                    }
                });
            } else {
                throw new Error(`Request failed with status ${response.status}`);
            }
            
        } catch (error) {
            console.error('❌ [CONTENT PROXY] Content script proxy request failed:', error.message);
            sendResponse({
                success: false,
                error: error.message
            });
        }
    }
}

// Initialize content script
new WebRefactorContent();
class VisualEnhancer {
    constructor() {
        this.overlayCanvas = null;
        this.ctx = null;
    }

    createOverlay() {
        if (this.overlayCanvas) {
            this.overlayCanvas.remove();
        }

        this.overlayCanvas = document.createElement('canvas');
        this.overlayCanvas.id = 'visual-enhancer-overlay';
        this.overlayCanvas.style.position = 'fixed';
        this.overlayCanvas.style.top = '0';
        this.overlayCanvas.style.left = '0';
        this.overlayCanvas.style.width = '100vw';
        this.overlayCanvas.style.height = '100vh';
        this.overlayCanvas.style.zIndex = '99999';
        this.overlayCanvas.style.pointerEvents = 'none';

        document.body.appendChild(this.overlayCanvas);

        this.overlayCanvas.width = this.overlayCanvas.offsetWidth * window.devicePixelRatio;
        this.overlayCanvas.height = this.overlayCanvas.offsetHeight * window.devicePixelRatio;

        this.ctx = this.overlayCanvas.getContext('2d');
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    async applyCommands(commands) {
        if (!this.overlayCanvas) {
            this.createOverlay();
        }
        
        this.clear();

        for (const command of commands) {
            switch (command.type) {
                case 'draw_box':
                    this.drawBox(command.coordinates, command.style);
                    break;
                case 'add_text':
                    this.addText(command.coordinates, command.text, command.style);
                    break;
            }
        }
    }

    drawBox(coords, style) {
        if (!this.ctx) return;
        this.ctx.beginPath();
        this.ctx.rect(coords.x, coords.y, coords.width, coords.height);
        this.ctx.strokeStyle = style.color || 'red';
        this.ctx.lineWidth = style.lineWidth || 2;
        this.ctx.stroke();
    }

    addText(coords, text, style) {
        if (!this.ctx) return;
        this.ctx.font = style.font || '14px Arial';
        this.ctx.fillStyle = style.backgroundColor || 'red';
        const textMetrics = this.ctx.measureText(text);
        this.ctx.fillRect(coords.x, coords.y - parseInt(this.ctx.font, 10), textMetrics.width + 8, parseInt(this.ctx.font, 10) + 4);

        this.ctx.fillStyle = style.color || 'white';
        this.ctx.fillText(text, coords.x + 4, coords.y);
    }
    
    clear() {
        if (!this.ctx || !this.overlayCanvas) return;
        this.ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    }

    destroy() {
        if (this.overlayCanvas) {
            this.overlayCanvas.remove();
            this.overlayCanvas = null;
            this.ctx = null;
        }
    }
}

// Initialize the content script
(function() {
    'use strict';
    
    // Prevent multiple initializations
    if (window.webRefactorContentLoaded) {
        console.log('🔄 WebRefactorContent already loaded');
        return;
    }
    
    try {
        console.log('🔧 Initializing WebRefactorContent...');
        console.log('Document state:', document.readyState);
        console.log('Chrome runtime exists:', !!chrome.runtime);
        
        const webRefactorContent = new WebRefactorContent();
        console.log('✅ WebRefactorContent initialized successfully');
        
        // Make it globally accessible for debugging
        window.webRefactorContent = webRefactorContent;
        window.webRefactorContentLoaded = true;
        
        // Test ping immediately
        setTimeout(() => {
            console.log('🏓 Testing self-ping...');
            try {
                webRefactorContent.handleMessage({ action: 'ping' }, null, (response) => {
                    console.log('🏓 Self-ping response:', response);
                });
            } catch (e) {
                console.error('🏓 Self-ping failed:', e);
            }
        }, 100);
        
    } catch (error) {
        console.error('❌ Failed to initialize WebRefactorContent:', error);
        console.error('Stack trace:', error.stack);
        window.webRefactorContentError = error.message;
    }
})();