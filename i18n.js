/**
 * Internationalization utility class
 */
class I18n {
    constructor() {
        this.currentLanguage = 'en'; // Default English
        this.messages = {};
        this.fallbackLanguage = 'en';
    }

    /**
     * Initialize internationalization
     * @param {string} language - Language code (en/zh)
     */
    async init(language = null) {
        try {
            // Get user configured language
            if (!language) {
                const settings = await chrome.storage.sync.get(['language']);
                language = settings.language || this.detectBrowserLanguage();
            }

            this.currentLanguage = language;
            await this.loadMessages(language);

            // If not English, also load English as fallback
            if (language !== this.fallbackLanguage) {
                await this.loadMessages(this.fallbackLanguage, false);
            }

                    } catch (error) {
            console.error('❌ I18n initialization failed:', error);
            // Use English on failure
            this.currentLanguage = this.fallbackLanguage;
            await this.loadMessages(this.fallbackLanguage);
        }
    }

    /**
     * Detect browser language
     */
    detectBrowserLanguage() {
        const browserLang = navigator.language || navigator.userLanguage;
        
        // Simple language mapping
        if (browserLang.startsWith('zh')) {
            return 'zh';
        }
        
        return 'en'; // Default English
    }

    /**
     * Load language pack
     * @param {string} language - Language code
     * @param {boolean} setPrimary - Whether to set as primary language
     */
    async loadMessages(language, setPrimary = true) {
        try {
            const response = await fetch(chrome.runtime.getURL(`locales/${language}.json`));
            const messages = await response.json();
            
            if (setPrimary) {
                this.messages = messages;
            } else {
                // As fallback language, only fill missing keys
                this.messages = this.deepMerge(messages, this.messages);
            }
        } catch (error) {
            console.error(`❌ Failed to load language pack: ${language}`, error);
            throw error;
        }
    }

    /**
     * Deep merge objects (fallback language filling)
     */
    deepMerge(source, target) {
        const result = { ...target };
        
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
                    result[key] = this.deepMerge(source[key], result[key] || {});
                } else if (!(key in result)) {
                    result[key] = source[key];
                }
            }
        }
        
        return result;
    }

    /**
     * Get translated text
     * @param {string} key - Key path, like 'popup.main.title'
     * @param {object} params - Parameter replacement object
     * @returns {string} Translated text
     */
    t(key, params = {}) {
        try {
            const keys = key.split('.');
            let value = this.messages;

            for (const k of keys) {
                if (value && typeof value === 'object') {
                    value = value[k];
                } else {
                    value = undefined;
                    break;
                }
            }

            if (value === undefined) {
                console.warn(`🔍 Translation key not found: ${key}`);
                return key; // Return key name as fallback
            }

            // Parameter replacement
            if (typeof value === 'string' && Object.keys(params).length > 0) {
                return this.interpolate(value, params);
            }

            return value;
        } catch (error) {
            console.error(`❌ Translation error for key: ${key}`, error);
            return key;
        }
    }

    /**
     * String interpolation replacement
     * @param {string} template - Template string
     * @param {object} params - Parameter object
     */
    interpolate(template, params) {
        return template.replace(/\{(\w+)\}/g, (match, key) => {
            return params[key] !== undefined ? params[key] : match;
        });
    }

    /**
     * Switch language
     * @param {string} language - New language code
     */
    async switchLanguage(language) {
        if (language === this.currentLanguage) {
            return;
        }

        this.currentLanguage = language;
        await this.loadMessages(language);

        // Save to storage
        await chrome.storage.sync.set({ language });

        // Trigger language change event
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('languageChanged', {
                detail: { language }
            }));
        }
    }

    /**
     * Get current language
     */
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    /**
     * Get supported languages list
     */
    getSupportedLanguages() {
        return [
            { code: 'en', name: 'English' },
            { code: 'zh', name: 'Chinese' }
        ];
    }

    /**
     * Get language display name
     * @param {string} code - Language code
     */
    getLanguageName(code) {
        const languages = this.getSupportedLanguages();
        const lang = languages.find(l => l.code === code);
        return lang ? lang.name : code;
    }
}

// Create global instance
const i18n = new I18n();

// Disable auto-initialization, controlled manually by popup.js
// This avoids duplicate initialization and timing issues

// Export for use by other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = I18n;
}