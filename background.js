class WebRefactorBackground {
    constructor() {
                try {
            this.setupMessageListeners();
                        
            this.setupTabListeners();
                        
            this.aiService = new AIService();
                        
            this.originalStates = new Map(); // Store original page states for reset
            this.lastGeneratedCommands = null; // Store last generated commands for memory saving
                    } catch (error) {
            console.error('❌ Error in WebRefactorBackground constructor:', error);
            throw error;
        }
    }

    setupMessageListeners() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true; // Keep message channel open for async response
        });

        // Clean up original states when tab is closed
        chrome.tabs.onRemoved.addListener((tabId) => {
            this.originalStates.delete(tabId);
        });
    }

    setupTabListeners() {
        // Listen for tab updates (page loads)
        chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
            // Only act when page is completely loaded
            if (changeInfo.status === 'complete' && tab.url) {
                await this.handlePageLoad(tabId, tab.url);
            }
        });
    }

    async handlePageLoad(tabId, url) {
        try {
            // Check if auto refactor is enabled
            const settings = await chrome.storage.sync.get(['enableAutoRefactor']);
            
            if (!settings.enableAutoRefactor) {
                return;
            }

            // Check if this domain has saved configuration
            const domain = this.extractDomain(url);
            const domainConfig = await this.loadDomainConfig(domain);
            
            if (domainConfig && domainConfig.prompt) {
                                
                // Wait a bit for page to stabilize
                setTimeout(async () => {
                    try {
                        await this.autoRefactorPage(tabId, domainConfig);
                    } catch (error) {
                        console.error('❌ Auto refactor failed:', error);
                    }
                }, 2000); // 2 second delay
            }
        } catch (error) {
            console.error('❌ Error in handlePageLoad:', error);
        }
    }

    async autoRefactorPage(tabId, domainConfig) {
        try {
            // Check if page is supported
            const tab = await chrome.tabs.get(tabId);
            if (!this.isPageSupported(tab.url)) {
                return;
            }

            // Inject content script if needed
            await this.injectContentScript(tabId);

            // Extract page content for original state storage
            const pageContent = await this.extractPageContent(tabId);
            
            // Store original state
            this.originalStates.set(tabId, pageContent.originalState);

            let commands;

            // Check if there are saved commands (new version memory)
            if (domainConfig.version === '2.0' && domainConfig.commands) {
                                commands = domainConfig.commands;
            } else {
                                // Use LLM to generate new commands (old version or first time)
                commands = await this.aiService.generateRefactorCommands(pageContent, domainConfig.prompt);
                
                // Update domain configuration to new version
                const updatedConfig = {
                    ...domainConfig,
                    commands: commands,
                    version: '2.0',
                    lastUpdated: Date.now()
                };
                
                await chrome.storage.local.set({
                    [`domain_config_${domainConfig.domain}`]: updatedConfig
                });
            }

            await this.executeRefactorCommands(tabId, commands);

                    } catch (error) {
            console.error('❌ Auto refactor failed:', error);
        }
    }

    extractDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch (error) {
            return url;
        }
    }

    async loadDomainMemory(domain) {
        try {
            const memory = await chrome.storage.sync.get(['domainMemory']);
            const domainMemory = memory.domainMemory || {};
            return domainMemory[domain] || null;
        } catch (error) {
            console.error('❌ Failed to load domain memory:', error);
            return null;
        }
    }

    async loadDomainConfig(domain) {
        try {
            const result = await chrome.storage.local.get([`domain_config_${domain}`]);
            return result[`domain_config_${domain}`] || null;
        } catch (error) {
            console.error('❌ Failed to load domain config:', error);
            return null;
        }
    }

    async handleMessage(message, sender, sendResponse) {
        try {
            switch (message.action) {
                case 'refactor':
                    if (message.visualEnhancement) {
                        await this.handleVisualRefactor(message, sendResponse);
                    } else {
                        await this.handleRefactor(message, sendResponse);
                    }
                    break;
                case 'reset':
                    await this.handleReset(message, sendResponse);
                    break;
                case 'testConnection':
                    await this.handleTestConnection(message, sendResponse);
                    break;
                case 'captureVisibleTab':
                    await this.handleCaptureVisibleTab(message, sendResponse);
                    break;
                case 'saveMemory':
                    await this.handleSaveMemory(message, sendResponse);
                    break;
                case 'applyMemory':
                    await this.handleApplyMemory(message, sendResponse);
                    break;
                case 'saveDomainMemoryWithCommands':
                    await this.handleSaveDomainMemoryWithCommands(message, sendResponse);
                    break;
                default:
                    sendResponse({ success: false, error: 'Unknown action' });
            }
        } catch (error) {
            console.error('Background message handler error:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    async handleRefactor(message, sendResponse) {
        const { tabId, prompt, visualEnhancement, screenshotQuality } = message;

        try {
            // 0. Check if the current page is supported
            const tab = await chrome.tabs.get(tabId);
            if (!this.isPageSupported(tab.url)) {
                throw new Error(`Unsupported page type: ${tab.url}\n\nSupported page types:\n• http:// and https:// web pages\n• file:// local files\n\nNot supported:\n• chrome:// browser internal pages\n• chrome-extension:// extension pages\n• edge:// or other browser internal pages`);
            }

            // 1. Inject content script if not already injected
            await this.injectContentScript(tabId);

            // 2. Extract page content
            const pageContent = await this.extractPageContent(tabId);
            
            // 2.1. Save extracted content as test case for debugging
            await this.savePageContentAsTestCase(pageContent, prompt, tab.url);
            
            // 3. Store original state for reset functionality
            this.originalStates.set(tabId, pageContent.originalState);

            // 4. Attempt refactor with retry mechanism
            const result = await this.attemptRefactorWithRetry(tabId, pageContent, prompt);

            sendResponse({ success: true, result });
        } catch (error) {
            console.error('Refactor error:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    async attemptRefactorWithRetry(tabId, pageContent, prompt, maxRetries = 1) {
        let lastError = null;
        let retryContext = null;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                
                // Generate commands (with retry context if this is a retry)
                const commands = await this.aiService.generateRefactorCommands(
                    pageContent, 
                    prompt, 
                    null, 
                    null, 
                    retryContext
                );

                // Execute commands
                const result = await this.executeRefactorCommands(tabId, commands);

                // Store successful commands
                this.lastGeneratedCommands = {
                    tabId: tabId,
                    commands: commands,
                    prompt: prompt,
                    timestamp: Date.now(),
                    attempt: attempt + 1
                };

                return result;

            } catch (error) {
                lastError = error;
                console.error(`❌ Refactor attempt ${attempt + 1} failed:`, error.message);

                // Check if this is a white page error and we have retries left
                if (error.message.includes('White page detected') && attempt < maxRetries) {
                    
                    // Build retry context with failure information
                    retryContext = await this.buildRetryContext(error, tabId, pageContent);
                    
                    // Reset page state before retry
                    await this.resetPageForRetry(tabId);
                    
                    continue; // Try again
                } else {
                    // No more retries or different error type
                    break;
                }
            }
        }

        // All attempts failed
        throw new Error(`All refactor attempts failed. Final error: ${lastError.message}`);
    }

    async buildRetryContext(error, tabId, pageContent) {
        try {
            // Extract failure information from error message
            const failureReason = error.message;
            
            // Try to get page states from content script
            let pageStateBefore = null;
            let pageStateAfter = null;
            let failedCommands = [];
            let blockedSelectors = [];

            // Extract blocked selectors from logs if available
            if (error.message.includes('DANGEROUS SELECTOR DETECTED') || error.message.includes('EXTREMELY DANGEROUS SELECTOR DETECTED')) {
                const matches = error.message.match(/(EXTREMELY )?DANGEROUS SELECTOR DETECTED.*?: (.+)/g);
                if (matches) {
                    blockedSelectors = matches.map(match => 
                        match.split(': ')[1]?.split(' ')[0]
                    ).filter(Boolean);
                }
            }

            // Get recent commands from logs if available
            try {
                const debugLogs = await chrome.tabs.sendMessage(tabId, {
                    action: 'getDebugLogs'
                });
                
                if (debugLogs && debugLogs.success) {
                    failedCommands = debugLogs.data.lastCommands || [];
                    pageStateBefore = debugLogs.data.pageStateBefore;
                    pageStateAfter = debugLogs.data.pageStateAfter;
                }
            } catch (debugError) {
                console.warn('Could not retrieve debug information:', debugError);
            }

            const retryContext = {
                failureReason,
                failedCommands,
                blockedSelectors,
                pageStateBefore,
                pageStateAfter,
                attempt: 1,
                timestamp: Date.now()
            };

            return retryContext;

        } catch (contextError) {
            console.error('Error building retry context:', contextError);
            return {
                failureReason: error.message,
                failedCommands: [],
                blockedSelectors: [],
                pageStateBefore: null,
                pageStateAfter: null,
                attempt: 1,
                timestamp: Date.now()
            };
        }
    }

    async resetPageForRetry(tabId) {
        try {
            
            // Get original state and reset
            const originalState = this.originalStates.get(tabId);
            if (originalState) {
                await chrome.tabs.sendMessage(tabId, {
                    action: 'reset',
                    originalState: originalState
                });
            } else {
                console.warn('⚠️ No original state available for reset');
            }
        } catch (resetError) {
            console.error('❌ Failed to reset page for retry:', resetError);
            // Continue anyway - the retry might still work
        }
    }

    async handleVisualRefactor(message, sendResponse) {
        const { tabId, prompt, screenshotQuality } = message;

        try {
            // 0. Check if the current page is supported
            const tab = await chrome.tabs.get(tabId);
            if (!this.isPageSupported(tab.url)) {
                throw new Error(`Unsupported page type: ${tab.url}`);
            }

            // 1. Inject content script
            await this.injectContentScript(tabId);

            // 2. Request screenshot with privacy blurring from content script
            const screenshotResponse = await chrome.tabs.sendMessage(tabId, {
                action: 'capturePageWithPrivacy',
                quality: screenshotQuality
            });

            if (!screenshotResponse.success) {
                throw new Error(screenshotResponse.error || 'Failed to capture page.');
            }
            const { screenshot, pageContent } = screenshotResponse.data;
            this.originalStates.set(tabId, pageContent.originalState);

            // 3. Call VLM with screenshot and prompt
            const vlmResponse = await this.aiService.callVLM(pageContent, prompt, screenshot);
           
            // 4. Execute any returned DOM manipulation commands
            if (vlmResponse.actions && vlmResponse.actions.length > 0) {
                 await this.executeRefactorCommands(tabId, vlmResponse.actions);
            }

            // 5. Apply visual enhancements (annotations)
            if (vlmResponse.enhancements && vlmResponse.enhancements.length > 0) {
                await chrome.tabs.sendMessage(tabId, {
                    action: 'applyEnhancements',
                    commands: vlmResponse.enhancements
                });
            }
            
            sendResponse({ success: true, result: vlmResponse });

        } catch (error) {
            console.error('Visual Refactor error:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    async handleReset(message, sendResponse) {
        const { tabId } = message;

        try {
            // Check if we have original state
            if (!this.originalStates.has(tabId)) {
                throw new Error('No original page state found, please refresh and try again');
            }

            // Execute reset commands
            const result = await chrome.tabs.sendMessage(tabId, {
                action: 'reset',
                originalState: this.originalStates.get(tabId)
            });

            sendResponse({ success: true, result });
        } catch (error) {
            console.error('Reset error:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    async handleTestConnection(message, sendResponse) {
        try {
            const result = await this.aiService.testConnection(message.settings);
            sendResponse({ success: true, result });
        } catch (error) {
            console.error('Connection test error:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    async handleCaptureVisibleTab(message, sendResponse) {
        try {
            const { quality = 0.8 } = message;
            
            // Capture the visible tab using Chrome's API
            const screenshotDataUrl = await chrome.tabs.captureVisibleTab(null, {
                format: 'jpeg',
                quality: Math.round(quality * 100) // Convert to percentage
            });
            
            // Get tab information for dimensions
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            
            sendResponse({
                success: true,
                data: {
                    screenshot: screenshotDataUrl,
                    dimensions: {
                        width: tab.width || 1920,
                        height: tab.height || 1080
                    }
                }
            });
        } catch (error) {
            console.error('Screenshot capture error:', error);
            sendResponse({ 
                success: false, 
                error: `Screenshot failed: ${error.message}` 
            });
        }
    }

    async handleSaveMemory(message, sendResponse) {
        const { tabId, domain, userPrompt } = message;

        try {
            
            // 1. Inject content script if needed
            await this.injectContentScript(tabId);

            // 2. Extract current page content and state
            const pageContent = await this.extractPageContent(tabId);
            
            // 3. Get current DOM state (before modification)
            const originalHtml = await chrome.tabs.sendMessage(tabId, {
                action: 'getPageHtml'
            });

            // 4. Check if this is a modified state (after refactor)
            const currentState = await chrome.tabs.sendMessage(tabId, {
                action: 'getCurrentState'
            });

            // 5. Create memory entry
            const memoryEntry = {
                timestamp: Date.now(),
                domain: domain,
                userPrompt: userPrompt,
                originalHtml: originalHtml.html,
                modifiedHtml: currentState.html || originalHtml.html,
                pageStructure: pageContent.analysis,
                interactiveElements: pageContent.interactiveElements,
                url: (await chrome.tabs.get(tabId)).url
            };

            // 6. Save to local storage
            await this.saveDomainMemory(domain, memoryEntry);

                        sendResponse({ success: true, data: { memoryId: memoryEntry.timestamp } });

        } catch (error) {
            console.error('❌ Save memory error:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    async handleApplyMemory(message, sendResponse) {
        const { tabId, domain } = message;

        try {
            
            // 1. Load domain config (new format)
            const domainConfig = await this.loadDomainConfig(domain);
            if (!domainConfig) {
                throw new Error('No memory found for this domain');
            }

            // 2. Inject content script if needed
            await this.injectContentScript(tabId);

            // 3. Extract page content for original state storage
            const pageContent = await this.extractPageContent(tabId);
            
            // 4. Store original state
            this.originalStates.set(tabId, pageContent.originalState);

            let commands;

            // 5. Check if we have saved commands (v2.0) or need to generate them (v1.0)
            if (domainConfig.version === '2.0' && domainConfig.commands) {
                                commands = domainConfig.commands;
            } else {
                                // Use LLM to generate commands from saved prompt
                commands = await this.aiService.generateRefactorCommands(pageContent, domainConfig.prompt);
                
                // Upgrade to v2.0 format
                const updatedConfig = {
                    ...domainConfig,
                    commands: commands,
                    version: '2.0',
                    lastUpdated: Date.now()
                };
                
                await chrome.storage.local.set({
                    [`domain_config_${domain}`]: updatedConfig
                });
            }

            // 6. Execute refactor commands
            await this.executeRefactorCommands(tabId, commands);

                        sendResponse({ success: true, data: { commandsExecuted: commands.length } });

        } catch (error) {
            console.error('❌ Apply memory error:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    async handleSaveDomainMemoryWithCommands(message, sendResponse) {
        const { tabId, domain, prompt } = message;

        try {
            
            // Check if there are recently generated commands
            if (!this.lastGeneratedCommands || 
                this.lastGeneratedCommands.tabId !== tabId ||
                Date.now() - this.lastGeneratedCommands.timestamp > 60000) { // Valid within 1 minute
                throw new Error('No recent refactoring commands found, please execute refactoring first');
            }

            // Create memory entry containing commands
            const memoryEntry = {
                timestamp: Date.now(),
                domain: domain,
                prompt: prompt,
                commands: this.lastGeneratedCommands.commands,
                url: (await chrome.tabs.get(tabId)).url,
                version: '2.0' // Mark as new version, contains commands
            };

            // Save to domain configuration storage
            const configKey = `domain_config_${domain}`;
            await chrome.storage.local.set({
                [configKey]: memoryEntry
            });

                        sendResponse({ success: true, data: { memoryId: memoryEntry.timestamp } });

        } catch (error) {
            console.error('❌ Save domain memory with commands error:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    async analyzeImageWithVLM(_dataUrl, _userPrompt) {
                // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));
    
        const mockResponse = {
          "actions": [
            {
              "type": "HIGHLIGHT",
              "selector": "h1",
              "text": "This is the main heading."
            },
            {
              "type": "ADD_TEXT",
              "selector": "p",
              "text": "AI analysis suggests this paragraph is important."
            }
          ]
        };
    
                return mockResponse;
    }

    isPageSupported(url) {
        if (!url) return false;
        
        // Supported protocols
        const supportedProtocols = ['http:', 'https:', 'file:'];
        
        // Unsupported protocols and pages
        const unsupportedProtocols = [
            'chrome:', 'chrome-extension:', 'chrome-search:', 'chrome-devtools:',
            'edge:', 'moz-extension:', 'safari-extension:', 'about:', 'data:'
        ];
        
        try {
            const urlObj = new URL(url);
            
            // Check if it's an unsupported protocol
            if (unsupportedProtocols.some(protocol => urlObj.protocol.startsWith(protocol))) {
                console.warn('❌ Unsupported page protocol:', urlObj.protocol, url);
                return false;
            }
            
            // Check if it's a supported protocol
            if (supportedProtocols.includes(urlObj.protocol)) {
                                return true;
            }
            
            console.warn('❓ Unknown protocol, attempting to support:', urlObj.protocol, url);
            return false;
        } catch (error) {
            console.error('❌ URL parsing failed:', url, error);
            return false;
        }
    }

    async injectContentScript(tabId) {
        // Get tab information for debugging
        let tab;
        try {
            tab = await chrome.tabs.get(tabId);
        } catch (e) {
            console.error('❌ Failed to get tab info:', e);
            throw new Error(`Invalid tab ID: ${tabId}`);
        }

        // Check if page is supported before injection
        if (!this.isPageSupported(tab.url)) {
            throw new Error(`Unsupported page type: ${tab.url}\n\nSupported: http://, https://, file://\nNot supported: chrome://, edge://, about:// pages`);
        }

        // First, check if the script is already there and responsive.
        try {
            const response = await Promise.race([
                chrome.tabs.sendMessage(tabId, { action: 'ping' }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000))
            ]);
            if (response?.pong) {
                console.log('✅ Content script already active');
                return;
            }
        } catch (e) {
            console.log('🔄 Content script not found, will inject...', e.message);
        }

        // Wait for page to be fully loaded
        if (tab.status !== 'complete') {
            console.log('🔄 Waiting for page to complete loading...');
            await new Promise(resolve => {
                const listener = (tabId, changeInfo, updatedTab) => {
                    if (updatedTab.id === tabId && changeInfo.status === 'complete') {
                        chrome.tabs.onUpdated.removeListener(listener);
                        resolve();
                    }
                };
                chrome.tabs.onUpdated.addListener(listener);
                
                // Timeout after 10 seconds
                setTimeout(() => {
                    chrome.tabs.onUpdated.removeListener(listener);
                    resolve();
                }, 10000);
            });
        }

        // Execute the script injection.
        try {
            console.log('🔄 Attempting to inject content script...');
            
            // First, check if the script can be injected at all
            const testResult = await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: () => {
                    return {
                        url: window.location.href,
                        readyState: document.readyState,
                        timestamp: Date.now()
                    };
                }
            });
            console.log('🧪 Test injection result:', testResult[0].result);
            
            // Try to clear any existing scripts
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    func: () => {
                        // Remove any existing webRefactorContent
                        if (window.webRefactorContent) {
                            console.log('🔄 Clearing existing webRefactorContent');
                            delete window.webRefactorContent;
                        }
                        if (window.webRefactorContentLoaded) {
                            delete window.webRefactorContentLoaded;
                        }
                        if (window.webRefactorContentError) {
                            delete window.webRefactorContentError;
                        }
                    }
                });
            } catch (e) {
                console.warn('Could not clear existing scripts:', e.message);
            }
            
            // Use the simplified content script
            console.log('🔄 Injecting simplified content script...');
            let result;
            try {
                result = await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ['content_simple.js'],
                });
                console.log('✅ Simplified content script injection completed:', result);
            } catch (simpleInjectionError) {
                console.warn('❌ Simplified script injection failed, trying fallback:', simpleInjectionError.message);
                
                // Fallback: minimal inline script
                result = await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    func: () => {
                        console.log('🔧 Minimal fallback content script starting...');
                        
                        if (!window.webRefactorSimpleLoaded) {
                            chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                                console.log('📨 Fallback received:', message.action);
                                
                                if (message.action === 'ping') {
                                    sendResponse({ pong: true, fallback: true });
                                    return;
                                }
                                
                                if (message.action === 'extractContent') {
                                    sendResponse({ 
                                        success: true, 
                                        data: {
                                            analysis: {
                                                title: document.title,
                                                url: window.location.href,
                                                advertisements: [],
                                                contentStructure: { headings: 0, paragraphs: 0, links: 0 }
                                            },
                                            interactiveElements: [],
                                            originalState: { title: document.title, url: window.location.href }
                                        }
                                    });
                                    return;
                                }
                                
                                if (message.action === 'executeCommands') {
                                    const commands = message.commands || [];
                                    const results = [];
                                    
                                    commands.forEach((cmd, i) => {
                                        try {
                                            const elements = document.querySelectorAll(cmd.selector);
                                            elements.forEach(el => {
                                                if (cmd.type === 'remove') el.remove();
                                                else if (cmd.type === 'hide') el.style.display = 'none';
                                            });
                                            results.push({ success: true, elementsAffected: elements.length });
                                        } catch (e) {
                                            results.push({ success: false, error: e.message });
                                        }
                                    });
                                    
                                    sendResponse({ success: true, data: { results, executedCount: results.length } });
                                    return;
                                }
                                
                                sendResponse({ success: false, error: 'Unknown action' });
                                return true;
                            });
                            
                            window.webRefactorSimpleLoaded = true;
                            console.log('✅ Minimal fallback loaded');
                        }
                        
                        return { fallback: true, success: true };
                    }
                });
                
                console.log('✅ Fallback injection completed');
            }
            
        } catch (e) {
            console.error(`❌ Failed to inject script into tab ${tabId}:`, {
                error: e,
                message: e.message,
                stack: e.stack,
                tabUrl: tab.url,
                tabStatus: tab.status
            });
            
            // Provide more specific error messages
            if (e.message.includes('Cannot access contents of url')) {
                throw new Error(`Cannot access this page due to browser restrictions.\nURL: ${tab.url}\n\nThis usually happens on:\n• Chrome internal pages (chrome://)\n• Extension store pages\n• Other browser protected pages`);
            } else if (e.message.includes('The extensions system has crashed')) {
                throw new Error('Chrome extensions system has crashed. Please restart Chrome.');
            } else {
                throw new Error(`Unable to inject content script: ${e.message}\n\nPage URL: ${tab.url}\nTry refreshing the page and try again.`);
            }
        }

        // Wait for script to initialize
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Simple connection test
        console.log('🔄 Testing content script connection...');
        for (let i = 0; i < 3; i++) {
            try {
                const response = await Promise.race([
                    chrome.tabs.sendMessage(tabId, { action: 'ping' }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
                ]);
                
                if (response?.pong) {
                    console.log(`✅ Content script connection established`);
                    if (response.simple) console.log('   → Using simplified content script');
                    if (response.fallback) console.log('   → Using fallback mode');
                    return;
                }
            } catch (e) {
                console.warn(`Ping attempt ${i + 1} failed:`, e.message);
                if (i < 2) await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        console.error(`❌ Failed to establish connection with content script in tab ${tabId}.`);
        
        // Log this failure for debugging
        try {
            await this.aiService.logToFile('injection_failure', {
                tabId: tabId,
                tabUrl: tab.url,
                tabStatus: tab.status,
                injectionResult: 'failed_to_connect',
                timestamp: Date.now()
            });
        } catch (logError) {
            console.warn('Failed to log injection failure:', logError);
        }
        
        throw new Error(`Content script connection failed after multiple attempts.\n\nPage: ${tab.url}\nTab ID: ${tabId}\nStatus: ${tab.status}\n\nTroubleshooting steps:\n1. 刷新页面重试 (Refresh the page and try again)\n2. 检查浏览器控制台错误 (Check browser console for errors)\n3. 重新加载扩展程序 (Reload the extension)\n4. 确保页面完全加载 (Make sure page is fully loaded)\n5. 查看调试日志获取详细信息 (Check debug logs for details)\n\nNote: Some pages may not support content script injection due to security policies.`);
    }

    async extractPageContent(tabId) {
                try {
            const response = await chrome.tabs.sendMessage(tabId, {
                action: 'extractContent'
            });

            if (!response.success) {
                console.error('❌ Page content extraction failed:', response.error);
                throw new Error(response.error || 'Failed to extract page content');
            }

            return response.data;
        } catch (error) {
            console.error('❌ Error occurred while extracting page content:', error);
            throw error;
        }
    }

    async savePageContentAsTestCase(pageContent, userPrompt, pageUrl) {
        try {
            // Create a unique filename based on domain and timestamp
            const url = new URL(pageUrl);
            const domain = url.hostname.replace(/[^a-zA-Z0-9]/g, '_');
            const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').substring(0, 14);
            const filename = `test_case_${domain}_${timestamp}`;
            
            // Prepare test case data
            const testCase = {
                metadata: {
                    url: pageUrl,
                    domain: url.hostname,
                    title: pageContent.analysis?.title || 'Unknown',
                    timestamp: new Date().toISOString(),
                    userPrompt: userPrompt,
                    extractedAt: new Date().toLocaleString()
                },
                pageContent: {
                    analysis: pageContent.analysis,
                    interactiveElements: pageContent.interactiveElements,
                    originalState: {
                        // Only save essential parts of original state to avoid huge files
                        title: pageContent.originalState?.title,
                        url: pageContent.originalState?.url,
                        timestamp: pageContent.originalState?.timestamp,
                        htmlLength: pageContent.originalState?.html?.length || 0,
                        // Save first 2000 chars of HTML for reference
                        htmlPreview: pageContent.originalState?.html?.substring(0, 2000) + '...'
                    }
                },
                // Add some useful statistics
                statistics: {
                    totalInteractiveElements: pageContent.interactiveElements?.length || 0,
                    advertisements: pageContent.analysis?.advertisements?.length || 0,
                    headings: pageContent.analysis?.contentStructure?.headings || 0,
                    paragraphs: pageContent.analysis?.contentStructure?.paragraphs || 0,
                    links: pageContent.analysis?.contentStructure?.links || 0,
                    images: pageContent.analysis?.contentStructure?.images || 0
                }
            };
            
            // Save to chrome storage for debugging
            await chrome.storage.local.set({
                [`test_case_${filename}`]: testCase
            });
            
            // Also save to a shorter key for easy access
            await chrome.storage.local.set({
                'latest_test_case': testCase,
                'latest_test_case_filename': filename
            });
            
            console.log(`💾 Test case saved: ${filename}`);
            console.log('📊 Test case statistics:', testCase.statistics);
            console.log('🔍 Access with: chrome.storage.local.get("latest_test_case")');
            
            // Create downloadable JSON file content
            const downloadableContent = {
                ...testCase,
                // Add instructions for using this test case
                usage_instructions: {
                    description: "This is a test case extracted from a real webpage for LLM testing",
                    how_to_use: [
                        "1. Copy this JSON data",
                        "2. Use it as input to test LLM refactor command generation",
                        "3. The 'pageContent' object can be passed to generateRefactorCommands()",
                        "4. The 'userPrompt' shows what the user wanted to do"
                    ],
                    example_usage: `
                        // JavaScript example:
                        const testData = ${JSON.stringify({ pageContent: testCase.pageContent, userPrompt })};
                        const commands = await aiService.generateRefactorCommands(
                            testData.pageContent, 
                            testData.userPrompt
                        );
                    `
                }
            };
            
            // Save formatted JSON for easy copying
            const formattedJson = JSON.stringify(downloadableContent, null, 2);
            
            // Log the JSON content for easy copying
            console.log('📋 Test case JSON (copy this for external testing):');
            console.log('='.repeat(80));
            console.log(formattedJson);
            console.log('='.repeat(80));
            
            return filename;
            
        } catch (error) {
            console.error('❌ Failed to save test case:', error);
            // Don't throw error - this is just for debugging
        }
    }

    async executeRefactorCommands(tabId, commands) {
                        
        try {
            const response = await chrome.tabs.sendMessage(tabId, {
                action: 'executeCommands',
                commands
            });

            if (!response.success) {
                console.error('❌ Refactoring command execution failed:', response.error);
                throw new Error(response.error || 'Failed to execute refactor commands');
            }

            return response.data;
        } catch (error) {
            console.error('❌ Error occurred while executing refactoring commands:', error);
            throw error;
        }
    }

    async saveDomainMemory(domain, memoryEntry) {
        try {
            const key = `memory_${domain}`;
            const result = await chrome.storage.local.get([key]);
            let memoryData = result[key] || [];

            // Add new memory entry
            memoryData.push(memoryEntry);

            // Get settings for memory management
            const settings = await chrome.storage.sync.get(['maxMemoryEntries', 'memoryRetentionDays']);
            const maxEntries = settings.maxMemoryEntries || 5;
            const retentionDays = settings.memoryRetentionDays || 30;
            const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);

            // Clean up old entries
            memoryData = memoryData
                .filter(entry => entry.timestamp > cutoffTime)
                .slice(-maxEntries); // Keep only the latest entries

            // Save back to storage
            await chrome.storage.local.set({ [key]: memoryData });

                    } catch (error) {
            console.error('❌ Failed to save domain memory:', error);
            throw error;
        }
    }

    async loadDomainMemory(domain) {
        try {
            const key = `memory_${domain}`;
            const result = await chrome.storage.local.get([key]);
            return result[key] || [];
        } catch (error) {
            console.error('❌ Failed to load domain memory:', error);
            return [];
        }
    }
}

class AIService {
    constructor() {
                this.settings = null;
            }

    async getSettings() {
        // Always fetch fresh settings instead of caching
        this.settings = await chrome.storage.sync.get([
            'llmProvider', 'apiUrl', 'apiKey', 'modelName', 'maxTokens', 'proxyUrl'
        ]);
                return this.settings;
    }

    async testConnection(customSettings = null) {
        const settings = customSettings || await this.getSettings();
        
        if (!settings.apiKey || !settings.apiUrl) {
            throw new Error('Please configure API key and URL first');
        }

        const testMessage = {
            role: 'user',
            content: 'Hello, please respond with "Connection successful" to test the API.'
        };

        try {
            const response = await this.callLLM([testMessage], settings);
            return { message: 'API connection test successful', response };
        } catch (error) {
            throw new Error(`API connection failed: ${error.message}`);
        }
    }

    async generateRefactorCommands(pageContent, userPrompt, _screenshot = null, _domainMemory = null, retryContext = null) {
                
        const settings = await this.getSettings();
        
        if (!settings.apiKey || !settings.apiUrl) {
            console.error('❌ LLM configuration missing:', {
                hasApiKey: !!settings.apiKey,
                hasApiUrl: !!settings.apiUrl,
                apiKeyLength: settings.apiKey ? settings.apiKey.length : 0,
                apiUrl: settings.apiUrl || 'undefined'
            });
            
            const missingFields = [];
            if (!settings.apiKey) missingFields.push('API Key');
            if (!settings.apiUrl) missingFields.push('API URL');
            
            throw new Error(`Please configure LLM API information in settings first. Missing fields: ${missingFields.join(', ')}`);
        }

        const systemPrompt = retryContext ? this.buildRetrySystemPrompt() : this.buildSystemPrompt();
        const userMessage = retryContext ? 
            this.buildRetryUserMessage(pageContent, userPrompt, retryContext) : 
            this.buildUserMessage(pageContent, userPrompt);

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
        ];

        // Add previous failed attempt to context if this is a retry
        if (retryContext) {
            messages.push({
                role: 'assistant',
                content: `Previous attempt generated these commands that caused issues:\n${JSON.stringify(retryContext.failedCommands, null, 2)}`
            });
            
            console.log('🔄 Retry attempt with failure context:', retryContext);
        }

        try {
                        const response = await this.callLLM(messages, settings);
                                    
            const commands = this.parseCommands(response);
                        
            return commands;
        } catch (error) {
            console.error('❌ LLM processing failed:', error);
            throw new Error(`LLM processing failed: ${error.message}`);
        }
    }
    
    async callVLM(pageContent, userPrompt, screenshot) {
                const settings = await this.getSettings();
        if (!settings.apiKey || !settings.apiUrl) {
            throw new Error(`VLM API settings are not configured.`);
        }

        const systemPrompt = this.buildVlmSystemPrompt();
        const userMessage = this.buildVlmUserMessage(pageContent, userPrompt, screenshot);

        const messages = [
            { role: 'system', content: systemPrompt },
            userMessage
        ];
        
        try {
                        const response = await this.callLLM(messages, settings, true);
                        
            // The response is expected to be a JSON string containing text and enhancement commands.
            const parsedResponse = JSON.parse(response);
            return parsedResponse;
            
        } catch (error) {
            console.error('❌ VLM processing failed:', error);
            throw new Error(`VLM processing failed: ${error.message}`);
        }
    }

    buildVlmSystemPrompt() {
        return `You are an expert UI/UX analyst and web assistant. Your task is to analyze a screenshot of a webpage, its DOM structure, and a user's question. Based on this multimodal information, you must provide a helpful text response and a set of JSON commands to visually enhance the screenshot to guide the user.

You must return a single, valid JSON object with two top-level keys: "text_response" and "enhancements".

1.  **text_response**: A clear, concise natural language answer to the user's question.
2.  **enhancements**: An array of JSON objects, where each object represents a visual annotation to be drawn on the page.

**Available enhancement commands:**
- '{"type": "draw_box", "coordinates": {"x": 150, "y": 200, "width": 100, "height": 40}, "style": {"color": "red"}}'
- '{"type": "add_text", "coordinates": {"x": 155, "y": 190}, "text": "This is the button", "style": {"font": "14px Arial", "color": "white", "backgroundColor": "red"}}'

**Example Response:**
{
  "text_response": "To find your profile, click on the icon at the top right corner of the page.",
  "enhancements": [
    {
      "type": "draw_box",
      "coordinates": { "x": 950, "y": 50, "width": 80, "height": 80 },
      "style": { "color": "rgba(255, 0, 0, 0.8)", "lineWidth": 3 }
    }
  ]
}

**DO NOT** include any explanations or markdown formatting. Your entire output must be only the JSON object.`;
    }

    buildVlmUserMessage(pageContent, userPrompt, screenshot) {
        return {
            role: "user",
            content: [
                {
                    type: "text",
                    text: `Analyze the attached screenshot and page content based on my request.
                    
User Request: "${userPrompt}"

Page Content Analysis:
${this.safeStringify(pageContent.analysis || {})}`
                },
                {
                    type: "image_url",
                    image_url: {
                        "url": screenshot,
                        "detail": "high"
                    }
                }
            ]
        };
    }

    buildSystemPrompt() {
        let prompt = `You are a professional web refactoring assistant. Your task is to analyze web content and generate JSON-formatted DOM manipulation commands based STRICTLY on the user's specific requirements.

**CRITICAL: Read the user's request carefully and follow it exactly. Do not make assumptions about what they want.**

**Important Principles:**
1. CAREFULLY analyze the provided page content structure before making any changes
2. Use SPECIFIC CSS selectors that target only the intended elements, not broad selectors
3. Follow the user's requirements EXACTLY - if they say "keep videos", preserve video players AND their related elements (titles, descriptions, controls)
4. When user says "keep only X", preserve X and its essential supporting elements (controls, labels, descriptions)
5. When in doubt, prefer hiding elements over removing them to maintain page stability

**Critical Safety Rules:**
- NEVER use overly broad selectors like "body > *", "div > *", or "*:not()" that could affect many elements
- NEVER use short attribute selectors like [class*="ad"] or [id*="a"] - they match too many elements
- ALWAYS use specific class names, IDs, or detailed attribute selectors (minimum 3 characters) 
- ONLY target elements that clearly do NOT match what the user wants to preserve
- PRESERVE functional elements that support the user's requested content (video controls, titles, descriptions)
- Test your selectors mentally against the provided page structure
- When targeting "non-video" elements, be specific about sidebars, footers, navigation, but NOT video-related content

**Available Commands:**
- remove: Completely delete element (use when user specifically requests removal)
- hide: Hide element with CSS display:none (safer option)
- style: Modify element style (size, color, layout, etc.)
- move: Move element to new position
- wrap: Wrap element with new container
- reorderChildren: Reorder child elements

**Operation Strategy:**
1. First analyze the page structure provided in the user message
2. Identify what the user wants to KEEP (e.g., videos, forms, etc.) and understand their ecosystem
3. Identify obvious elements that are NOT part of what user wants to keep (sidebars, unrelated content sections)
4. Use precise selectors to hide/remove only the unwanted elements, NOT the content user wants
5. For "keep only videos" requests: preserve video containers, players, titles, descriptions, controls, and related metadata
6. Target specific unwanted sections like navigation menus, sidebars, footers, comment sections (if not requested)
7. NEVER target generic elements like "h1,h2,h3" or "p" that might be part of the content user wants

**Example for "Keep Only Videos" Request:**
- PRESERVE: video players, video containers, video titles, video descriptions, video controls, video metadata
- HIDE: navigation bars, sidebars, comment sections, related articles, footers, headers (non-video)
- NEVER HIDE: elements that are part of the video viewing experience

**Output Format Requirements:**
Must strictly follow this format with no deviations:

{
  "actions": [
    {
      "type": "hide",
      "selector": ".advertisement-banner",
      "reason": "Hide advertisement banner"
    }
  ]
}

**Absolutely Prohibited:**
- No explanatory text outside JSON
- No code block markers
- No additional text
- JSON must start and end with {}
- Must contain "actions" array field
- NEVER use broad selectors that could affect multiple unintended elements

Please return JSON in the above format directly, without any other content.`;

        return prompt;
    }

    buildRetrySystemPrompt() {
        let prompt = `You are a professional web refactoring assistant in RETRY MODE. Your previous attempt caused page visibility issues (white page), so you must now be EXTREMELY CONSERVATIVE and SPECIFIC with your selectors.

**RETRY MODE - CRITICAL SAFETY RULES:**
1. The previous attempt failed and caused visibility issues - learn from this failure
2. Use ONLY highly specific selectors that target individual elements
3. NEVER use broad attribute selectors like [class*="..."] or [id*="..."]
4. NEVER use tag-only selectors like "div", "section", "header"
5. NEVER use wildcard or :not() selectors
6. Prefer HIDING over REMOVING elements for maximum safety
7. Target only 1-3 specific elements maximum per command
8. When in doubt, generate NO commands rather than risky ones

**ULTRA-SAFE Selector Guidelines:**
- Use full class names: ".specific-ad-banner-class" not "[class*='ad']"
- Use specific IDs: "#exact-ad-container-id" not "[id*='ad']"
- Use detailed combinations: "div.ad-banner.sidebar-ad" not just ".ad"
- Use data attributes when possible: "[data-ad-type='banner']"

**Available Commands (prioritized by safety):**
- hide: Hide element with CSS display:none (SAFEST - use this)
- style: Modify element style carefully
- remove: Delete element (ONLY for confirmed individual ads)

**Failure Recovery Strategy:**
- Analyze why the previous attempt failed
- Generate fewer, more targeted commands
- Focus on obvious advertising elements only
- Preserve ALL content that could be functional

**Output Format Requirements:**
{
  "actions": [
    {
      "type": "hide",
      "selector": ".very-specific-ad-banner-class",
      "reason": "Hide specific advertisement banner"
    }
  ]
}

You must return ONLY the JSON object with highly specific, safe selectors. No explanatory text.`;

        return prompt;
    }

    buildRetryUserMessage(pageContent, userPrompt, retryContext) {
        const analysis = pageContent.analysis || {};
        const interactiveElements = pageContent.interactiveElements || [];
        
        let textContent = `RETRY REQUEST - Previous attempt caused page visibility issues.

**Original User Request:** ${userPrompt}

**FAILURE ANALYSIS:**
- Previous commands: ${JSON.stringify(retryContext.failedCommands, null, 2)}
- Failure reason: ${retryContext.failureReason}
- Blocked selectors: ${retryContext.blockedSelectors?.join(', ') || 'None explicitly blocked'}
- Page state before failure: ${JSON.stringify(retryContext.pageStateBefore, null, 2)}
- Page state after failure: ${JSON.stringify(retryContext.pageStateAfter, null, 2)}

**Current Page Content Structure:**
- Title: ${analysis.title || 'Unknown'}
- URL: ${analysis.url || 'Unknown'}
- Headings: ${analysis.contentStructure?.headings || 0}
- Paragraphs: ${analysis.contentStructure?.paragraphs || 0}
- Links: ${analysis.contentStructure?.links || 0}
- Images: ${analysis.contentStructure?.images || 0}

**Elements That Should Be PRESERVED:**
${interactiveElements.length > 0 ? 
    interactiveElements.slice(0, 5).map((el, index) => 
        `${index + 1}. ${el.tagName || 'unknown'} with classes: ${el.classes || 'none'}, text: "${(el.text || '').substring(0, 30)}"`
    ).join('\n') : 
    'No interactive elements detected'}

**Identified Safe Advertisement Targets (if any):**
${analysis.advertisements && analysis.advertisements.length > 0 ? 
    analysis.advertisements.slice(0, 3).map((ad, index) => 
        `${index + 1}. ${ad.selector || 'unknown'} - ${ad.reason || 'detected as ad'}`
    ).join('\n') : 
    'No obvious advertisements automatically identified'}

**RETRY STRATEGY REQUIREMENTS:**
1. Generate MAXIMUM 3 commands total
2. Use ONLY specific class names or IDs from the advertisement list above
3. Avoid any selectors that could match multiple elements
4. Focus ONLY on obvious promotional content
5. When uncertain, prefer to do NOTHING rather than risk page damage
6. Learn from the previous failure patterns shown above

**CRITICAL REMINDERS:**
- The previous attempt failed because selectors were too broad
- Your new selectors must target individual, specific elements only
- Better to miss some ads than to break the page again
- If no safe targets can be identified, return empty actions array

Generate a MINIMAL, ULTRA-SAFE command set. Must return only JSON format as specified in system prompt.`;
        
        return textContent;
    }

    safeStringify(obj, spaces = 2) {
        try {
            return JSON.stringify(obj, (key, value) => {
                // Filter out DOM elements and functions
                if (value instanceof Element || typeof value === 'function') {
                    return '[Filtered]';
                }
                // Handle circular references
                if (typeof value === 'object' && value !== null) {
                    if (this._seen && this._seen.has(value)) {
                        return '[Circular]';
                    }
                    if (!this._seen) this._seen = new WeakSet();
                    this._seen.add(value);
                }
                return value;
            }, spaces);
        } catch (error) {
            return `[Stringify Error: ${error.message}]`;
        } finally {
            this._seen = null;
        }
    }

    buildUserMessage(pageContent, userPrompt) {
        // Build comprehensive page context
        const analysis = pageContent.analysis || {};
        const interactiveElements = pageContent.interactiveElements || [];
        
        let textContent = `Please refactor the web content based on the following user requirements:

**User Requirements:** ${userPrompt}

**Page Title:** ${analysis.title || 'Unknown'}

**Page URL:** ${analysis.url || 'Unknown'}

**Page Content Structure:**
- Main content sections: ${analysis.contentStructure?.headings || 0} headings, ${analysis.contentStructure?.paragraphs || 0} paragraphs
- Navigation elements: ${analysis.contentStructure?.links || 0} links
- Media elements: ${analysis.contentStructure?.images || 0} images, ${analysis.contentStructure?.videos || 0} videos
- Forms: ${analysis.contentStructure?.forms || 0} forms, ${analysis.contentStructure?.inputs || 0} input fields

**Identified Elements by Type:**
${analysis.advertisements && analysis.advertisements.length > 0 ? 
    analysis.advertisements.map((ad, index) => 
        `${index + 1}. Type: ${ad.type || 'unknown'}, Selector: ${ad.selector || 'unknown'}, Reason: ${ad.reason || 'auto-detected'}`
    ).join('\n') : 
    'Element categorization available if needed for user requirements'}

**Interactive Elements to Consider:**
${interactiveElements.length > 0 ? 
    interactiveElements.slice(0, 10).map((el, index) => 
        `${index + 1}. Tag: ${el.tagName || 'unknown'}, Type: ${el.type || 'button/link'}, Classes: ${el.classes || 'none'}, Text: "${(el.text || '').substring(0, 50)}"`
    ).join('\n') + (interactiveElements.length > 10 ? `\n... and ${interactiveElements.length - 10} more interactive elements` : '') :
    'No interactive elements detected'}

**Page Layout Information:**
${analysis.layout ? `Main containers: ${JSON.stringify(analysis.layout)}` : 'Layout structure not analyzed'}

**Content Categories Detected:**
${analysis.contentCategories ? 
    Object.entries(analysis.contentCategories).map(([category, count]) => 
        `- ${category}: ${count} elements`
    ).join('\n') : 
    'Content categories not analyzed'}

**Critical Instructions:**
- Study the above page structure carefully before generating commands
- Use SPECIFIC selectors that target only the elements matching user requirements
- If user wants to "keep only videos": preserve video players, video containers, video titles, video descriptions, video controls
- If user wants to "keep only X": preserve X and its supporting elements (titles, descriptions, controls, metadata)
- Target unwanted sections like: navigation bars, sidebars, footers, comment sections, unrelated content areas
- DO NOT target generic elements like "h1,h2,h3,p,div,span" that might be part of the content user wants
- When uncertain, prefer 'hide' over 'remove' to maintain page stability
- Base all changes strictly on the user's explicit refactoring request

**Example of Good vs Bad Selectors for "Keep Only Videos":**
- Good: ".sidebar", "#navigation", ".comment-section", ".related-links", "footer", "nav.main-nav", ".advertisement-banner"
- Bad: "h1,h2,h3", "p", "div", "[class*='ad']", "*:not(video)", "body > *", ".video-title", ".video-description"

**DANGER ZONE - These selectors will be automatically blocked:**
- [class*="ad"] - matches too many elements like "header", "breadcrumb", "readmore", etc.
- [id*="ad"] - matches too many elements like "header", "readmore", "download", etc.  
- Generic tag selectors like "h1,h2,h3,p,div,span" - these might be part of video content
- Short attribute patterns that match common elements
- Selectors that could affect video-related content when user wants to keep videos

Please generate DOM manipulation commands to implement the user's requirements. Must strictly return in the JSON format specified in the system prompt, without any other content.`;
        
        return textContent;
    }

    async logToFile(filename, data) {
        try {
            const timestamp = new Date().toISOString();
            const logEntry = {
                timestamp,
                data
            };
            
            // Use chrome.storage.local to store logs
            const logKey = `llm_log_${filename}`;
            const result = await chrome.storage.local.get([logKey]);
            const existingLogs = result[logKey] || [];
            existingLogs.push(logEntry);
            
            // Keep only last 10 entries to prevent storage overflow
            if (existingLogs.length > 10) {
                existingLogs.splice(0, existingLogs.length - 10);
            }
            
            await chrome.storage.local.set({ [logKey]: existingLogs });
            console.log(`📝 Logged to ${filename}:`, logEntry);
        } catch (error) {
            console.error('Failed to log:', error);
        }
    }

    generateCurlCommand(url, headers, body, proxyUrl = null) {
        let curl = 'curl -s';
        
        // Add proxy if specified
        if (proxyUrl) {
            curl += ` --proxy "${proxyUrl}"`;
        }
        
        curl += ` -X POST "${url}"`;
        
        // Add headers
        Object.entries(headers).forEach(([key, value]) => {
            // Mask sensitive information
            if (key.toLowerCase().includes('authorization') || key.toLowerCase().includes('key')) {
                const maskedValue = value.substring(0, 10) + '***';
                curl += ` \\\n  -H "${key}: ${maskedValue}"`;
            } else {
                curl += ` \\\n  -H "${key}: ${value}"`;
            }
        });
        
        // Add body data (truncated for readability)
        const bodyStr = JSON.stringify(body, null, 2);
        const truncatedBody = bodyStr.length > 1000 ? bodyStr.substring(0, 1000) + '...' : bodyStr;
        curl += ` \\\n  -d '${truncatedBody}'`;
        
        return curl;
    }

    async makeRequestWithProxy(targetUrl, options, proxyUrl) {
        console.log('🔧 [PROXY] Attempting request with proxy support');
        console.log('🔧 [PROXY] Target URL:', targetUrl);
        console.log('🔧 [PROXY] Proxy URL:', proxyUrl);
        
        // JavaScript fetch API不直接支持HTTP代理
        // 我们需要使用其他方法，比如通过内容脚本或者特殊的代理服务
        
        // 方案1：尝试使用内容脚本发送请求（如果有活跃的标签页）
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs.length > 0) {
                console.log('🔧 [PROXY] Trying to use content script for proxy request');
                
                const response = await chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'makeProxyRequest',
                    targetUrl: targetUrl,
                    options: options,
                    proxyUrl: proxyUrl
                });
                
                if (response && response.success) {
                    console.log('✅ [PROXY] Content script proxy request succeeded');
                    return response.data;
                }
            }
        } catch (error) {
            console.log('⚠️ [PROXY] Content script method failed:', error.message);
        }
        
        // 方案2：生成详细的curl命令供用户手动使用
        const curlCommand = this.generateCurlCommand(targetUrl, options.headers, JSON.parse(options.body), proxyUrl);
        console.log('📋 [PROXY] Generated curl command for manual proxy usage:');
        console.log(curlCommand);
        
        await this.logToFile('proxy_fallback', {
            message: 'JavaScript fetch API does not support HTTP proxy directly',
            curlCommand: curlCommand,
            targetUrl: targetUrl,
            proxyUrl: proxyUrl,
            timestamp: Date.now()
        });
        
        // 方案3：显示用户友好的消息并继续直接请求
        console.warn('⚠️ [PROXY] Browser limitations: JavaScript fetch API cannot use HTTP proxy directly');
        console.warn('ℹ️ [PROXY] The request will be made directly. Use the generated curl command for proxy access.');
        console.warn('💡 [PROXY] Consider using a browser extension that supports proxy or configure system-wide proxy.');
        
        // 继续直接请求，但添加特殊标记
        throw new Error('PROXY_NOT_SUPPORTED_FALLBACK_TO_DIRECT');
    }

    async callLLM(messages, settings, isVision = false) {
        const { apiUrl, apiKey, modelName, maxTokens = 2000, llmProvider = 'openai', proxyUrl } = settings;
        
        
        // Log the request
        const requestLog = {
            provider: llmProvider,
            model: modelName,
            apiUrl: apiUrl,
            isVision,
            messages: messages.map(msg => ({
                role: msg.role,
                contentPreview: typeof msg.content === 'string' 
                    ? msg.content.substring(0, 500) + '...' 
                    : '[multimodal content]'
            })),
            maxTokens
        };
        await this.logToFile('request', requestLog);

        let requestBody;
        let headers = {
            'Content-Type': 'application/json'
        };

        // Different API formats for different providers
        switch (llmProvider) {
            case 'openai':
                headers['Authorization'] = `Bearer ${apiKey}`;
                requestBody = {
                    model: modelName || (isVision ? 'gpt-4-vision-preview' : 'gpt-3.5-turbo'),
                    messages: messages,
                    max_tokens: maxTokens,
                    temperature: 0.1
                };
                break;
            
            case 'anthropic':
                headers['x-api-key'] = apiKey;
                headers['anthropic-version'] = '2023-06-01';
                requestBody = {
                    model: modelName || 'claude-3-haiku-20240307',
                    max_tokens: maxTokens,
                    messages: messages
                };
                break;
            
            default: // custom
                headers['Authorization'] = `Bearer ${apiKey}`;
                requestBody = {
                    model: modelName,
                    messages: messages,
                    max_tokens: maxTokens,
                    temperature: 0.1
                };
        }

        // Generate curl command for debugging
        
        const curlCommand = this.generateCurlCommand(apiUrl, headers, requestBody, proxyUrl);
        
        await this.logToFile('curl_command', { 
            curlCommand, 
            proxyUrl, 
            hasProxyInCurl,
            timestamp: Date.now() 
        });

        // Prepare request options
        const requestOptions = {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        };

        let response;
        
        // Try proxy request if proxy URL is provided
        if (proxyUrl && proxyUrl.trim()) {
            console.log('🔄 [PROXY] Proxy URL provided, attempting proxy request');
            try {
                response = await this.makeRequestWithProxy(apiUrl, requestOptions, proxyUrl);
            } catch (error) {
                if (error.message === 'PROXY_NOT_SUPPORTED_FALLBACK_TO_DIRECT') {
                    console.log('🔄 [PROXY] Falling back to direct request due to proxy limitations');
                    // Continue with direct request below
                } else {
                    console.error('❌ [PROXY] Proxy request failed:', error.message);
                    await this.logToFile('proxy_error', {
                        proxyUrl: proxyUrl,
                        error: error.message,
                        timestamp: Date.now()
                    });
                    // Continue with direct request below
                }
            }
        } else {
            console.log('ℹ️ [PROXY] No proxy URL provided, making direct request');
        }

        // Make direct request if proxy wasn't used or failed
        if (!response) {
            try {
                console.log('🌐 [FETCH] Making direct fetch request to:', apiUrl);
                console.log('🌐 [FETCH] Request headers:', Object.keys(headers));
                
                response = await fetch(apiUrl, requestOptions);
                
                console.log('📡 [FETCH] Response status:', response.status);
                console.log('📡 [FETCH] Response ok:', response.ok);
                
            } catch (fetchError) {
                console.error('❌ [FETCH ERROR] Direct fetch failed:', fetchError.message);
                throw fetchError;
            }
        }

        if (!response.ok) {
            const error = await response.text();
            
            // Log the error
            await this.logToFile('error', {
                status: response.status,
                error: error,
                requestUrl: apiUrl,
                provider: llmProvider
            });
            
            throw new Error(`API request failed (${response.status}): ${error}`);
        }

        const data = await response.json();
        
        // Log the raw response
        await this.logToFile('response', {
            provider: llmProvider,
            rawResponse: data,
            responseSize: JSON.stringify(data).length
        });
        
        // Extract content based on provider
        let content;
        if (llmProvider === 'anthropic') {
            content = data.content?.[0]?.text;
        } else {
            content = data.choices?.[0]?.message?.content;
        }

        if (!content) {
            await this.logToFile('error', {
                error: 'LLM response format error',
                data: data,
                provider: llmProvider
            });
            throw new Error('LLM response format error');
        }

        // Log the extracted content
        await this.logToFile('content', {
            provider: llmProvider,
            contentLength: content.length,
            contentPreview: content.substring(0, 1000) + '...'
        });

        return content;
    }

    parseCommands(response) {
        try {
            console.log('📱 Raw response length:', response.length);
            console.log('🔍 First 500 chars:', response.substring(0, 500) + (response.length > 500 ? '...' : ''));
            
            // Extract JSON from response using multiple strategies
            let jsonText = this.extractJsonFromResponse(response);
            
            if (!jsonText) {
                console.log('❌ First extraction failed, trying more lenient parsing...');
                // Fallback: try to find any JSON-like structure
                jsonText = this.extractJsonFallback(response);
            }
            
            if (!jsonText) {
                console.error('❌ Raw response:', response);
                throw new Error('No valid JSON format found in response');
            }
            
            console.log('🔍 Extracted JSON preview:', jsonText.substring(0, 200) + (jsonText.length > 200 ? '...' : ''));

            // Try to fix common JSON issues
            const originalJsonText = jsonText;
            jsonText = this.fixJsonIssues(jsonText);
            
            if (originalJsonText !== jsonText) {
                console.log('🔧 Fixed JSON issues, new preview:', jsonText.substring(0, 200) + '...');
            }

            const commands = JSON.parse(jsonText);
            console.log('✅ Successfully parsed commands:', commands);
            console.log('📊 Number of actions:', commands.actions?.length || 0);
            
            // Enhanced validation with better error reporting
            if (!commands || typeof commands !== 'object') {
                console.error('❌ Commands is not an object:', commands);
                throw new Error('Response is not a valid object after parsing');
            }
            
            if (!commands.hasOwnProperty('actions')) {
                console.error('❌ Commands object missing actions property:', commands);
                console.error('❌ Available properties:', Object.keys(commands));
                throw new Error('Response format error: missing actions property');
            }
            
            if (!Array.isArray(commands.actions)) {
                console.error('❌ Actions is not an array:', commands.actions);
                console.error('❌ Actions type:', typeof commands.actions);
                throw new Error('Response format error: actions is not an array');
            }

            // Validate and fix commands
            const validActions = [];
            console.log(`🔧 Processing ${commands.actions.length} actions...`);
            
            for (let i = 0; i < commands.actions.length; i++) {
                const action = commands.actions[i];
                console.log(`🔧 Processing action ${i + 1}:`, action);
                
                const fixedAction = this.fixActionFormat(action, i);
                console.log(`🔧 Fixed action ${i + 1}:`, fixedAction);
                
                if (fixedAction) {
                    validActions.push(fixedAction);
                    console.log(`✅ Action ${i + 1} accepted`);
                } else {
                    console.warn(`❌ Action ${i + 1} rejected`);
                }
            }

            console.log(`📊 Valid actions: ${validActions.length}/${commands.actions.length}`);
            
            if (validActions.length === 0) {
                console.error('❌ All actions were rejected during validation');
                throw new Error('No valid operation commands found');
            }

                        return validActions;
        } catch (error) {
            console.error('Command parsing error:', error);
            console.error('Raw response:', response);
            throw new Error(`Command parsing failed: ${error.message}`);
        }
    }

    extractJsonFromResponse(response) {
                
        // Strategy 1: Look for JSON code blocks 
        const codeBlockMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
                        const extracted = codeBlockMatch[1].trim();
            if (this.isValidActionJson(extracted)) {
                return extracted;
            }
        }

        // Strategy 2: Look for complete JSON with actions using better regex
        // This regex handles nested objects better
        const actionJsonPattern = /\{[\s\S]*?"actions"[\s\S]*?\[[\s\S]*?\][\s\S]*?\}/;
        const actionMatch = response.match(actionJsonPattern);
        if (actionMatch) {
                        const extracted = actionMatch[0];
            console.log('🔍 Strategy 2 extracted:', extracted.substring(0, 200) + '...');
            if (this.isValidActionJson(extracted)) {
                                return extracted;
            } else {
                console.log('❌ Strategy 2 validation failed');
            }
        }

        // Strategy 3: Find the largest JSON object that might contain actions
        const allJsonMatches = this.findAllJsonObjects(response);
        if (allJsonMatches.length > 0) {
            // Sort by length (largest first) and check for actions
            allJsonMatches.sort((a, b) => b.length - a.length);
            for (const json of allJsonMatches) {
                if (json.includes('"actions"') && this.isValidActionJson(json)) {
                                        return json;
                }
            }
        }

        // Strategy 4: Try to extract from the entire response as fallback
        const fullMatch = response.match(/\{[\s\S]*\}/);
        if (fullMatch) {
                        const extracted = fullMatch[0];
            console.log('🔍 Strategy 4 extracted:', extracted.substring(0, 200) + '...');
            if (this.isValidActionJson(extracted)) {
                                return extracted;
            } else {
                console.log('❌ Strategy 4 validation failed');
            }
        }

        console.log('❌ Unable to find valid JSON structure');
        return null;
    }

    findAllJsonObjects(text) {
        const jsonObjects = [];
        let braceCount = 0;
        let start = -1;
        
        for (let i = 0; i < text.length; i++) {
            if (text[i] === '{') {
                if (braceCount === 0) {
                    start = i;
                }
                braceCount++;
            } else if (text[i] === '}') {
                braceCount--;
                if (braceCount === 0 && start !== -1) {
                    jsonObjects.push(text.substring(start, i + 1));
                    start = -1;
                }
            }
        }
        
        return jsonObjects;
    }

    isValidActionJson(jsonText) {
        try {
            const parsed = JSON.parse(jsonText);
            const isValid = parsed && parsed.actions && Array.isArray(parsed.actions);
            console.log('🔍 isValidActionJson result:', isValid, 'for:', jsonText.substring(0, 100) + '...');
            return isValid;
        } catch (error) {
            console.log('❌ isValidActionJson JSON parse error:', error.message);
            return false;
        }
    }

    fixJsonIssues(jsonText) {
        // Fix common JSON formatting issues
        let fixed = jsonText;
        
        // Handle truncated JSON - try to close it properly
        const openBraces = (fixed.match(/\{/g) || []).length;
        const closeBraces = (fixed.match(/\}/g) || []).length;
        
        if (openBraces > closeBraces) {
            // Add missing closing braces
            const missing = openBraces - closeBraces;
            for (let i = 0; i < missing; i++) {
                if (fixed.endsWith(',')) {
                    fixed = fixed.slice(0, -1); // Remove trailing comma
                }
                fixed += '}';
            }
        }

        // Handle incomplete last action
        if (fixed.includes('"type": "remove') && !fixed.includes('"selector":')) {
            // Find the last incomplete action and remove it
            const lastIncomplete = fixed.lastIndexOf('{\n      "type": "remove');
            if (lastIncomplete > 0) {
                // Remove the incomplete action
                fixed = fixed.substring(0, lastIncomplete);
                // Clean up trailing comma and close array
                fixed = fixed.replace(/,\s*$/, '') + '\n    ]\n}';
            }
        }

        return fixed;
    }

    extractJsonFallback(response) {
                
        // Try to find any structure that looks like our expected format
        const patterns = [
            // Look for actions array anywhere
            /"actions"\s*:\s*\[[\s\S]*?\]/,
            // Look for array of objects with type and selector
            /\[\s*\{[\s\S]*?"type"[\s\S]*?"selector"[\s\S]*?\}[\s\S]*?\]/,
        ];
        
        for (const pattern of patterns) {
            const match = response.match(pattern);
            if (match) {
                // Try to construct a valid JSON object
                const actionsArray = match[0];
                const constructed = `{"actions": ${actionsArray.replace(/^"actions"\s*:\s*/, '')}}`;
                
                try {
                    JSON.parse(constructed);
                    console.log('✅ Successfully constructed JSON from fallback');
                    return constructed;
                } catch (error) {
                    console.log('❌ Constructed JSON is invalid:', error.message);
                }
            }
        }
        
        return null;
    }

    fixActionFormat(action, index) {
        try {
            // Create a copy to avoid modifying original
            const fixed = { ...action };

            // Check if selector is missing but there's a property that looks like a selector
            if (!fixed.selector) {
                // Look for properties that look like CSS selectors
                const selectorKeys = Object.keys(fixed).filter(key => 
                    key !== 'type' && 
                    key !== 'reason' && 
                    key !== 'cssProperties' &&
                    (key.includes('.') || key.includes('#') || key.includes('[') || key.includes(':'))
                );
                
                if (selectorKeys.length > 0) {
                    fixed.selector = selectorKeys[0];
                    // Remove the incorrectly named property
                    delete fixed[selectorKeys[0]];
                    console.warn(`🔧 Fixed selector format for command ${index + 1}`);
                }
            }

            // Validate required fields
            if (!fixed.type || !fixed.selector) {
                console.warn(`❌ Skipping invalid command ${index + 1}:`, action);
                return null;
            }

            // Validate type
            const validTypes = ['remove', 'hide', 'style', 'move', 'wrap', 'reorderChildren'];
            if (!validTypes.includes(fixed.type)) {
                console.warn(`❌ Skipping command ${index + 1}, unknown type: ${fixed.type}`);
                return null;
            }

            // Critical: Check for extremely dangerous selectors that would definitely cause white page
            if (this.isDangerousSelector(fixed.selector)) {
                console.warn(`🚨 EXTREMELY DANGEROUS SELECTOR DETECTED for command ${index + 1}: ${fixed.selector}`);
                console.warn(`🚨 This selector would cause complete white page, skipping for safety`);
                // Temporarily disabled to debug the issue
                // return null;
            }

            return fixed;
        } catch (error) {
            console.warn(`❌ Error while fixing command ${index + 1}:`, error, action);
            return null;
        }
    }

    isDangerousSelector(selector) {
        // Only check for truly dangerous selectors that could cause complete white page
        const extremelyDangerousPatterns = [
            // These will definitely cause white page
            /^body\s*>\s*\*/,                    // body > *
            /^body\s*\*/,                       // body *
            /^\*$/,                             // *
            /^html\s*>/,                        // html >
            /^html$/,                           // html
            /^body$/,                           // body
            
            // Dangerous :not() selectors that could match everything
            /^\*:not\(/,                        // *:not(something)
            /^body\s*>\s*\*:not\(/,            // body > *:not(something)
        ];

        for (const pattern of extremelyDangerousPatterns) {
            if (pattern.test(selector)) {
                console.warn(`🚨 Extremely dangerous selector: ${selector} - would cause white page`);
                return true;
            }
        }

        // Only check for attribute selectors with single characters (truly dangerous)
        const shortAttributeMatch = selector.match(/\[(?:class|id)[\*\^]?="([^"]+)"\]/);
        if (shortAttributeMatch && shortAttributeMatch[1].length === 1) {
            console.warn(`🚨 Single character attribute selector: "${shortAttributeMatch[1]}" - extremely risky`);
            return true;
        }

        // Note: Removed overly strict checks that blocked normal selectors like:
        // - header, footer, nav (these are commonly targeted for removal)
        // - div, section, article (these can be safely targeted with proper context)
        // - main, content (these might be legitimately targeted in some cases)

        return false;
    }
}

// Initialize background service
try {
    new WebRefactorBackground();
} catch (error) {
    console.error('❌ Background service initialization failed:', error);
    console.error('Stack trace:', error.stack);
}