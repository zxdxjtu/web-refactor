class WebRefactorPopup {
    constructor() {
        this.currentDomain = null;
        this.lastExecutedPrompt = null; // Record the last executed prompt
        this.initializeElements();
        this.bindEvents();
        this.initializeI18n();
    }

    async initializeI18n() {
        // Wait for i18n initialization
        await i18n.init();
        // I18n initialized
        
        // Load settings first to ensure correct language is used
        await this.loadSettings();
        
        // Force apply translations to ensure UI updates
        setTimeout(() => {
            // Force applying translations after settings load
            this.debugTranslations();
            this.applyTranslations();
        }, 100);
        
        // Load presets and current domain
        await this.loadPresets();
        await this.loadCurrentDomain();
        
        // Listen for language change events
        window.addEventListener('languageChanged', () => {
            // Language change event received
            this.applyTranslations();
        });
    }

    debugTranslations() {
    }

    applyTranslations() {
        // Applying translations
        
        let translatedCount = 0;
        // Translate all elements with data-i18n attribute
        const elementsToTranslate = document.querySelectorAll('[data-i18n]');
        // Found elements to translate
        
        elementsToTranslate.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = i18n.t(key);
            
            // Translating element
            
            if (element.tagName === 'INPUT' && element.type !== 'checkbox') {
                element.value = translation;
            } else if (element.tagName === 'OPTION') {
                // Special handling for option elements
                element.textContent = translation;
            } else {
                element.textContent = translation;
            }
            translatedCount++;
        });
        // Total elements translated

        // Translate placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            element.placeholder = i18n.t(key);
        });

        // Update page language attribute
        document.documentElement.lang = i18n.getCurrentLanguage();
        
        // Update page title
        document.title = i18n.t('common.appName');
        
    }

    initializeElements() {
        // Tab elements
        this.tabBtns = document.querySelectorAll('.tab-btn');
        this.tabContents = document.querySelectorAll('.tab-content');
        
        // Main tab elements
        this.domainInfo = document.getElementById('domain-info');
        this.userPrompt = document.getElementById('user-prompt');
        this.presetBtns = document.querySelectorAll('.preset-btn');
        this.refactorBtn = document.getElementById('refactor-btn');
        this.status = document.getElementById('status');
        this.statusText = this.status.querySelector('.status-text');
        
        // Settings elements
        this.llmProvider = document.getElementById('llm-provider');
        this.apiUrl = document.getElementById('api-url');
        this.apiKey = document.getElementById('api-key');
        this.modelName = document.getElementById('model-name');
        this.maxTokens = document.getElementById('max-tokens');
        this.proxyUrl = document.getElementById('proxy-url');
        
        // Element initialization
        this.languageSelect = document.getElementById('language');
        this.enableAutoRefactor = document.getElementById('enable-auto-refactor');
        // Domain memory elements
        this.saveDomainConfigBtn = document.getElementById('save-domain-config');
        this.viewDomainMemoriesBtn = document.getElementById('view-domain-memories');
        this.domainStatus = document.getElementById('domain-status');
        this.currentDomainName = document.getElementById('current-domain-name');
        this.saveSettingsBtn = document.getElementById('save-settings');
        this.testConnectionBtn = document.getElementById('test-connection');
        // Removed viewLogsBtn - no longer needed
        
        // Memories tab elements
        this.backToMainBtn = document.getElementById('back-to-main');
        this.memoriesList = document.getElementById('memories-list');
        this.clearAllMemoriesBtn = document.getElementById('clear-all-memories');
        
        // History elements
        this.historyBtn = document.getElementById('history-btn');
        this.historyDropdown = document.getElementById('history-dropdown');
        this.historyList = document.getElementById('history-list');
        this.clearHistoryBtn = document.getElementById('clear-history-btn');
    }

    bindEvents() {
        // Tab switching
        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        // Preset buttons
        this.presetBtns.forEach(btn => {
            btn.addEventListener('click', () => this.selectPreset(btn.dataset.preset));
        });

        // Main actions
        this.refactorBtn.addEventListener('click', () => this.startRefactor());

        // Settings
        this.llmProvider.addEventListener('change', () => {
            this.handleProviderChange();
            this.autoSaveSettings();
        });
        this.languageSelect.addEventListener('change', () => this.changeLanguage());
        this.saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        this.testConnectionBtn.addEventListener('click', () => this.testConnection());
        // Removed viewLogs event listener - no longer needed
        
        // Auto-save settings when user changes values
        this.apiUrl.addEventListener('input', () => this.autoSaveSettings());
        this.apiKey.addEventListener('input', () => this.autoSaveSettings());
        this.modelName.addEventListener('input', () => this.autoSaveSettings());
        this.maxTokens.addEventListener('input', () => this.autoSaveSettings());
        this.proxyUrl.addEventListener('input', () => this.autoSaveSettings());
        this.enableAutoRefactor.addEventListener('change', () => this.autoSaveSettings());
        
        // Domain memory
        this.saveDomainConfigBtn.addEventListener('click', () => this.saveDomainConfig());
        this.viewDomainMemoriesBtn.addEventListener('click', () => this.showMemoriesTab());
        
        // Memories tab
        if (this.backToMainBtn) {
            this.backToMainBtn.addEventListener('click', () => this.switchTab('main'));
        }
        if (this.clearAllMemoriesBtn) {
            this.clearAllMemoriesBtn.addEventListener('click', () => this.clearAllMemories());
        }
        
        // History functionality
        if (this.historyBtn) {
            this.historyBtn.addEventListener('click', () => this.toggleHistoryDropdown());
        }
        if (this.clearHistoryBtn) {
            this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
        }
        
        // Click outside to close history dropdown
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.user-input')) {
                this.hideHistoryDropdown();
            }
        });
        
        // Add debug feature: double-click title to export logs
        const titleElement = document.querySelector('h1');
        if (titleElement) {
            titleElement.addEventListener('dblclick', () => {
                this.exportDebugLogs();
            });
            titleElement.style.cursor = 'help';
            titleElement.title = 'Double-click to export debug logs';
        }

    }

    switchTab(tabName) {
        // Update tab buttons
        this.tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab contents
        this.tabContents.forEach(content => {
            content.style.display = content.id === `${tabName}-tab` ? 'block' : 'none';
        });

        // Handle memories tab specially since it doesn't have a tab button
        if (tabName === 'memories') {
            // Hide all tab contents first
            this.tabContents.forEach(content => {
                content.style.display = 'none';
            });
            // Show memories tab
            const memoriesTab = document.getElementById('memories-tab');
            if (memoriesTab) {
                memoriesTab.style.display = 'block';
            }
            // Remove active state from all tab buttons
            this.tabBtns.forEach(btn => {
                btn.classList.remove('active');
            });
        }
    }

    selectPreset(preset) {
        // Update active preset button
        this.presetBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.preset === preset);
        });

        // Set preset text
        const presetKey = `presetTexts.${preset}`;
        const presetText = i18n.t(presetKey);
        
        if (presetText && presetText !== presetKey) {
            this.userPrompt.value = presetText;
        }
    }

    async startRefactor() {
        const prompt = this.userPrompt.value.trim();
        if (!prompt) {
            this.showStatus(i18n.t('errors.noPrompt'), 'error');
            return;
        }


        try {
            this.showStatus(i18n.t('popup.main.status.analyzing'), 'loading');
            this.refactorBtn.disabled = true;

            // Get current tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            
            const modelName = this.modelName.value || '';
            const visionKeywords = ['vision', 'vlm', 'claude-3', 'haiku', 'sonnet', 'opus', 'gpt-4o'];
            const useVisualEnhancement = visionKeywords.some(keyword => modelName.toLowerCase().includes(keyword));

            // Model and visual enhancement settings applied

            const message = {
                action: 'refactor',
                tabId: tab.id,
                prompt: prompt,
                visualEnhancement: useVisualEnhancement
            };
            
            const response = await chrome.runtime.sendMessage(message);

            if (response.success) {
                // Record successfully executed prompt
                this.lastExecutedPrompt = prompt;
                // Save to history
                await this.saveToHistory(prompt);
                this.showStatus(i18n.t('popup.main.status.completed'), 'success');
                // Update save button state to show that memory can be saved
                this.updateSaveButtonState(true);
            } else {
                this.showStatus(i18n.t('errors.refactorFailed', { error: response.error }), 'error');
            }
        } catch (error) {
            console.error('Refactor error:', error);
            this.showStatus(i18n.t('errors.refactorFailed', { error: error.message }), 'error');
        } finally {
            this.refactorBtn.disabled = false;
        }
    }

    async changeLanguage() {
        const newLanguage = this.languageSelect.value;
        // Changing language
        
        try {
            await i18n.switchLanguage(newLanguage);
            // Language switched
            
            this.applyTranslations();
            // Translations applied
            
            // Save language setting immediately without waiting for save button
            await chrome.storage.sync.set({ language: newLanguage });
            // Language setting saved
            
            // Refresh the current tab to apply language changes to content script
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && tab.id) {
                chrome.tabs.reload(tab.id);
            }
            
        } catch (error) {
            console.error('❌ Failed to change language:', error);
        }
    }



    showStatus(message, type = 'normal') {
        this.statusText.textContent = message;
        this.status.className = `status ${type}`;
        
        if (type === 'loading') {
            this.statusText.innerHTML = `<span class="loading-spinner"></span>${message}`;
        }
    }

    updateProviderSettings() {
        const provider = this.llmProvider.value;
        const providerConfigs = {
            openai: {
                url: 'https://api.openai.com/v1/chat/completions',
                model: 'gpt-3.5-turbo'
            },
            anthropic: {
                url: 'https://api.anthropic.com/v1/messages',
                model: 'claude-3-haiku-20240307'
            },
            custom: {
                url: '',
                model: ''
            }
        };

        const config = providerConfigs[provider];
        if (config) {
            // Only update if the fields are empty (first time or user cleared them)
            if (!this.apiUrl.value.trim()) {
                this.apiUrl.value = config.url;
            }
            if (!this.modelName.value.trim()) {
                this.modelName.value = config.model;
            }
        }
    }

    handleProviderChange() {
        // Only update URL and model if user explicitly wants to use defaults
        // Don't override existing custom values
        const provider = this.llmProvider.value;
        const providerConfigs = {
            openai: {
                url: 'https://api.openai.com/v1/chat/completions',
                model: 'gpt-3.5-turbo'
            },
            anthropic: {
                url: 'https://api.anthropic.com/v1/messages',
                model: 'claude-3-haiku-20240307'
            },
            custom: {
                url: '',
                model: ''
            }
        };

        const config = providerConfigs[provider];
        if (config && provider !== 'custom') {
            // Ask user if they want to use default settings for this provider
            const useDefaults = confirm(`Switch to default settings for ${provider}?\nURL: ${config.url}\nModel: ${config.model}`);
            if (useDefaults) {
                this.apiUrl.value = config.url;
                this.modelName.value = config.model;
            }
        }
    }

    async loadSettings() {
        try {
            const settings = await chrome.storage.sync.get([
                'llmProvider', 'apiUrl', 'apiKey', 'modelName', 'maxTokens',
                'language', 'enableAutoRefactor', 'proxyUrl'
            ]);

            // Apply saved settings
            if (settings.llmProvider) {
                this.llmProvider.value = settings.llmProvider;
            }
            if (settings.apiUrl) {
                this.apiUrl.value = settings.apiUrl;
            }
            if (settings.apiKey) {
                this.apiKey.value = settings.apiKey;
            }
            if (settings.modelName) {
                this.modelName.value = settings.modelName;
            }
            if (settings.maxTokens) {
                this.maxTokens.value = settings.maxTokens;
            }
            if (settings.proxyUrl) {
                this.proxyUrl.value = settings.proxyUrl;
            }
            if (settings.language) {
                this.languageSelect.value = settings.language;
                // Ensure i18n uses the correct language
                if (settings.language !== i18n.getCurrentLanguage()) {
                    await i18n.switchLanguage(settings.language);
                }
            }
            
            this.enableAutoRefactor.checked = settings.enableAutoRefactor === true;
            
            // Apply translations regardless of saved language settings
            this.applyTranslations();
            
            // Only update provider settings if URL and model are empty (first time setup)
            if (!this.apiUrl.value.trim() && !this.modelName.value.trim()) {
                this.updateProviderSettings();
            }
            
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }

    async saveSettings() {
        try {
            const settings = {
                llmProvider: this.llmProvider.value,
                apiUrl: this.apiUrl.value,
                apiKey: this.apiKey.value,
                modelName: this.modelName.value,
                maxTokens: parseInt(this.maxTokens.value),
                language: this.languageSelect.value,
                enableAutoRefactor: this.enableAutoRefactor.checked,
                proxyUrl: this.proxyUrl.value
            };

            await chrome.storage.sync.set(settings);
            
            
            this.showSettingsStatus(i18n.t('popup.settings.settingsSaved'), 'success');
        } catch (error) {
            console.error('Failed to save settings:', error);
            this.showSettingsStatus(i18n.t('popup.settings.saveFailed'), 'error');
        }
    }

    async autoSaveSettings() {
        // Auto-save settings without showing user feedback to avoid spam
        try {
            const settings = {
                llmProvider: this.llmProvider.value,
                apiUrl: this.apiUrl.value,
                apiKey: this.apiKey.value,
                modelName: this.modelName.value,
                maxTokens: parseInt(this.maxTokens.value) || 2000,
                language: this.languageSelect.value,
                enableAutoRefactor: this.enableAutoRefactor.checked,
                proxyUrl: this.proxyUrl.value
            };

            await chrome.storage.sync.set(settings);
        } catch (error) {
            console.error('Failed to auto-save settings:', error);
        }
    }

    async testConnection() {
        try {
            this.testConnectionBtn.disabled = true;
            this.showSettingsStatus(i18n.t('popup.settings.testing'), 'loading');

            const response = await chrome.runtime.sendMessage({
                action: 'testConnection',
                settings: {
                    llmProvider: this.llmProvider.value,
                    apiUrl: this.apiUrl.value,
                    apiKey: this.apiKey.value,
                    modelName: this.modelName.value,
                    proxyUrl: this.proxyUrl.value
                }
            });

            if (response.success) {
                this.showSettingsStatus(i18n.t('popup.settings.connectionSuccess'), 'success');
            } else {
                this.showSettingsStatus(i18n.t('errors.testConnectionFailed', { error: response.error }), 'error');
            }
        } catch (error) {
            console.error('Connection test error:', error);
            this.showSettingsStatus(i18n.t('errors.testConnectionFailed', { error: error.message }), 'error');
        } finally {
            this.testConnectionBtn.disabled = false;
        }
    }

    showSettingsStatus(message, type) {
        // Use the new settings result display area
        const resultEl = document.getElementById('settings-result');
        const resultContent = document.getElementById('settings-result-content');
        
        if (resultEl && resultContent) {
            resultContent.textContent = message;
            resultEl.className = `settings-result ${type}`;
            resultEl.style.display = 'block';
            
            // Auto hide after 5 seconds
            setTimeout(() => {
                resultEl.style.display = 'none';
            }, 5000);
        }
    }


    loadPresets() {
        // Load user's custom presets if any
        chrome.storage.sync.get(['customPresets']).then(result => {
            if (result.customPresets) {
                // Add custom presets to UI
                console.log('Custom presets loaded:', result.customPresets);
            }
        });
    }


    async loadCurrentDomain() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab?.url) {
                const domain = this.extractDomain(tab.url);
                this.currentDomain = domain;
                
                if (this.currentDomainName) {
                    this.currentDomainName.textContent = domain;
                }
                
                // Check if this domain has saved configuration
                await this.checkDomainConfig(domain);
            }
        } catch (error) {
            console.error('Error loading current domain:', error);
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

    async checkDomainConfig(domain) {
        try {
            const result = await chrome.storage.local.get([`domain_config_${domain}`]);
            if (result[`domain_config_${domain}`]) {
                // Show that this domain has saved configuration
                this.domainStatus.style.display = 'block';
                this.currentDomainName.textContent = domain;
                this.updateSaveButtonState(false); // Memory exists, disable save button
            } else {
                this.domainStatus.style.display = 'none';
                this.updateSaveButtonState(false); // No refactoring executed, disable save button
            }
        } catch (error) {
            console.error('Error checking domain config:', error);
        }
    }

    async saveDomainConfig() {
        if (!this.currentDomain) {
            this.showStatus('Cannot get current domain', 'error');
            return;
        }

        // Use the last executed prompt instead of current input
        if (!this.lastExecutedPrompt) {
            this.showStatus('Please execute refactoring first before saving memory', 'error');
            return;
        }

        try {
            // Get current tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Request background script to save memory with commands
            const response = await chrome.runtime.sendMessage({
                action: 'saveDomainMemoryWithCommands',
                tabId: tab.id,
                domain: this.currentDomain,
                prompt: this.lastExecutedPrompt
            });

            if (response.success) {
                this.showStatus(`Saved memory for ${this.currentDomain}`, 'success');
                this.domainStatus.style.display = 'block';
                this.currentDomainName.textContent = this.currentDomain;
                this.updateSaveButtonState(false); // Saved, disable button
            } else {
                this.showStatus('Failed to save memory: ' + response.error, 'error');
            }

        } catch (error) {
            console.error('Error saving domain memory:', error);
            this.showStatus('Failed to save memory', 'error');
        }
    }

    updateSaveButtonState(canSave) {
        if (this.saveDomainConfigBtn) {
            this.saveDomainConfigBtn.disabled = !canSave;
            if (canSave) {
                this.saveDomainConfigBtn.textContent = '💾 Save Memory';
                this.saveDomainConfigBtn.title = 'Save last executed refactoring requirements and modification commands';
            } else {
                this.saveDomainConfigBtn.textContent = '✅ Saved';
                this.saveDomainConfigBtn.title = 'Memory for this domain has been saved';
            }
        }
    }

    showMemoriesTab() {
        this.switchTab('memories');
        this.loadMemoriesList();
    }

    async loadMemoriesList() {
        try {
            const memoriesListElement = this.memoriesList;
            if (!memoriesListElement) return;

            // Get all domain configurations
            const allStorage = await chrome.storage.local.get(null);
            const domainConfigs = Object.entries(allStorage)
                .filter(([key]) => key.startsWith('domain_config_'))
                .map(([key, value]) => ({
                    domain: key.replace('domain_config_', ''),
                    ...value
                }))
                .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)); // Sort by time descending

            if (domainConfigs.length === 0) {
                memoriesListElement.innerHTML = `
                    <div class="empty-memories">
                        <div class="empty-memories-icon">🧠</div>
                        <div class="empty-memories-text" data-i18n="memories.emptyMessage">暂无保存的记忆</div>
                        <div class="empty-memories-text" data-i18n="memories.emptyHint">使用重构功能后，可以保存域名记忆</div>
                    </div>
                `;
                this.applyTranslations();
                return;
            }

            const memoriesHtml = domainConfigs.map(config => {
                const date = new Date(config.timestamp || Date.now()).toLocaleDateString();
                const prompt = config.prompt || 'Unknown requirement';
                const version = config.version || '1.0';
                const hasCommands = config.commands && config.commands.length > 0;
                
                return `
                    <div class="memory-item" data-domain="${config.domain}">
                        <div class="memory-item-header">
                            <span class="memory-domain">${config.domain}</span>
                            <span class="memory-date">${date} ${version === '2.0' ? '(Smart)' : '(Legacy)'}</span>
                        </div>
                        <div class="memory-prompt">${prompt}</div>
                        <div class="memory-item-actions">
                            <button class="apply-btn" data-domain="${config.domain}" data-i18n="memories.applyMemory">应用</button>
                            <button class="delete-btn" data-domain="${config.domain}" data-i18n="memories.deleteMemory">删除</button>
                            ${hasCommands ? '<span style="font-size: 10px; color: #4caf50;">Has Commands</span>' : ''}
                        </div>
                    </div>
                `;
            }).join('');

            memoriesListElement.innerHTML = memoriesHtml;
            this.applyTranslations();

            // Bind events
            memoriesListElement.addEventListener('click', (e) => {
                if (e.target.classList.contains('apply-btn')) {
                    const domain = e.target.dataset.domain;
                    this.applyDomainMemory(domain);
                } else if (e.target.classList.contains('delete-btn')) {
                    const domain = e.target.dataset.domain;
                    this.deleteDomainMemory(domain);
                }
            });

        } catch (error) {
            console.error('Failed to load memory list:', error);
            this.showStatus('Failed to load memory list: ' + error.message, 'error');
        }
    }

    async applyDomainMemory(domain) {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            const response = await chrome.runtime.sendMessage({
                action: 'applyMemory',
                tabId: tab.id,
                domain: domain
            });

            if (response.success) {
                this.showStatus(i18n.t('memories.memoryApplied'), 'success');
                // Return to main page
                setTimeout(() => {
                    this.switchTab('main');
                }, 1000);
            } else {
                this.showStatus('Failed to apply memory: ' + response.error, 'error');
            }
        } catch (error) {
            console.error('Failed to apply memory:', error);
            this.showStatus('Failed to apply memory: ' + error.message, 'error');
        }
    }

    async deleteDomainMemory(domain) {
        if (!confirm(i18n.t('memories.confirmDelete'))) {
            return;
        }

        try {
            const configKey = `domain_config_${domain}`;
            await chrome.storage.local.remove([configKey]);
            
            this.showStatus(i18n.t('memories.memoryDeleted'), 'success');
            // Reload list
            this.loadMemoriesList();
        } catch (error) {
            console.error('Failed to delete memory:', error);
            this.showStatus('Failed to delete memory: ' + error.message, 'error');
        }
    }

    async clearAllMemories() {
        if (!confirm(i18n.t('memories.confirmClearAll'))) {
            return;
        }

        try {
            const allStorage = await chrome.storage.local.get(null);
            const domainConfigKeys = Object.keys(allStorage)
                .filter(key => key.startsWith('domain_config_'));

            if (domainConfigKeys.length > 0) {
                await chrome.storage.local.remove(domainConfigKeys);
            }

            this.showStatus(i18n.t('memories.memoryCleared'), 'success');
            // Reload list
            this.loadMemoriesList();
        } catch (error) {
            console.error('Failed to clear all memories:', error);
            this.showStatus('Failed to clear all memories: ' + error.message, 'error');
        }
    }
    
    // History functionality
    async toggleHistoryDropdown() {
        if (this.historyDropdown.style.display === 'none') {
            await this.loadHistoryList();
            this.historyDropdown.style.display = 'block';
        } else {
            this.hideHistoryDropdown();
        }
    }
    
    hideHistoryDropdown() {
        this.historyDropdown.style.display = 'none';
    }
    
    async loadHistoryList() {
        try {
            const result = await chrome.storage.local.get(['promptHistory']);
            const history = result.promptHistory || [];
            
            if (history.length === 0) {
                this.historyList.innerHTML = `
                    <div class="empty-history" data-i18n="popup.main.history.empty">
                        暂无历史记录
                    </div>
                `;
                this.applyTranslations();
                return;
            }
            
            const historyHtml = history
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 10) // Only show last 10 items
                .map(item => {
                    const date = new Date(item.timestamp).toLocaleDateString();
                    const time = new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    return `
                        <div class="history-item" data-prompt="${this.escapeHtml(item.prompt)}">
                            <div class="history-item-text">${this.escapeHtml(item.prompt)}</div>
                            <div class="history-item-date">${date} ${time}</div>
                        </div>
                    `;
                }).join('');
                
            this.historyList.innerHTML = historyHtml;
            
            // Bind click events
            this.historyList.addEventListener('click', (e) => {
                const historyItem = e.target.closest('.history-item');
                if (historyItem) {
                    const prompt = historyItem.dataset.prompt;
                    this.selectHistoryItem(prompt);
                }
            });
            
        } catch (error) {
            console.error('Failed to load history:', error);
        }
    }
    
    selectHistoryItem(prompt) {
        this.userPrompt.value = prompt;
        this.hideHistoryDropdown();
    }
    
    async saveToHistory(prompt) {
        try {
            const result = await chrome.storage.local.get(['promptHistory']);
            const history = result.promptHistory || [];
            
            // Check if the same prompt already exists
            const existingIndex = history.findIndex(item => item.prompt === prompt);
            if (existingIndex !== -1) {
                // Update timestamp
                history[existingIndex].timestamp = Date.now();
            } else {
                // Add new record
                history.push({
                    prompt: prompt,
                    timestamp: Date.now()
                });
            }
            
            // Keep only the last 50 records
            const sortedHistory = history
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 50);
            
            await chrome.storage.local.set({ promptHistory: sortedHistory });
        } catch (error) {
            console.error('Failed to save history:', error);
        }
    }
    
    async clearHistory() {
        if (!confirm('Are you sure you want to clear all history?')) {
            return;
        }
        
        try {
            await chrome.storage.local.remove(['promptHistory']);
            await this.loadHistoryList();
            this.showStatus('History cleared', 'success');
        } catch (error) {
            console.error('Failed to clear history:', error);
            this.showStatus('Failed to clear history', 'error');
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    async exportDebugLogs() {
        try {
            // Get current tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Get saved logs from content script
            const response = await chrome.tabs.sendMessage(tab.id, { 
                action: 'getDebugLogs' 
            });
            
            if (response && response.success) {
                const logs = response.data;
                
                // Create log file content
                const logContent = `
=== Web Refactor Debug Logs ===
URL: ${logs.url || 'N/A'}
Generated: ${new Date().toISOString()}

=== Before HTML ===
Time: ${logs.beforeTime || 'N/A'}
Length: ${logs.beforeHtml ? logs.beforeHtml.length : 0}

${logs.beforeHtml || 'No data'}

=== Executed Commands ===
${logs.commands ? JSON.stringify(logs.commands, null, 2) : 'No data'}

=== After HTML ===
Time: ${logs.afterTime || 'N/A'}
Length: ${logs.afterHtml ? logs.afterHtml.length : 0}

${logs.afterHtml || 'No data'}
`;
                
                // Create download link
                const blob = new Blob([logContent], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `webrefactor_debug_${new Date().getTime()}.txt`;
                a.click();
                URL.revokeObjectURL(url);
                
                this.showStatus('Debug logs exported', 'success');
            } else {
                this.showStatus('Cannot get debug logs, please execute refactoring first', 'error');
            }
        } catch (error) {
            console.error('Failed to export debug logs:', error);
            this.showStatus('Failed to export debug logs', 'error');
        }
    }

}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new WebRefactorPopup();
});