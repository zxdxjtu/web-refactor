describe('I18n', () => {
    let i18n;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Import I18n class
        const I18n = require('../i18n.js');
        i18n = new I18n();
    });

    describe('initialization', () => {
        it('should initialize with default English language', () => {
            expect(i18n.currentLanguage).toBe('en');
            expect(i18n.fallbackLanguage).toBe('en');
        });

        it('should detect browser language correctly', () => {
            // Test Chinese detection
            Object.defineProperty(navigator, 'language', {
                value: 'zh-CN',
                configurable: true
            });
            expect(i18n.detectBrowserLanguage()).toBe('zh');

            // Test English as default
            Object.defineProperty(navigator, 'language', {
                value: 'fr-FR',
                configurable: true
            });
            expect(i18n.detectBrowserLanguage()).toBe('en');
        });

        it('should load language from storage', async () => {
            chrome.storage.sync.get.mockImplementation((keys, callback) => {
                callback({ language: 'zh' });
            });

            await i18n.init();
            expect(i18n.currentLanguage).toBe('zh');
        });

        it('should load language pack successfully', async () => {
            global.fetch.mockResolvedValueOnce({
                json: async () => ({
                    test: { message: 'Test message' }
                })
            });

            await i18n.loadMessages('en');
            expect(i18n.messages).toHaveProperty('test');
            expect(i18n.messages.test.message).toBe('Test message');
        });

        it('should handle language pack loading failure', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Network error'));

            await expect(i18n.loadMessages('invalid')).rejects.toThrow();
        });
    });

    describe('translation', () => {
        beforeEach(async () => {
            i18n.messages = {
                popup: {
                    title: 'Web Refactor',
                    main: {
                        prompt: 'Enter your requirements'
                    }
                },
                messages: {
                    error: 'Error: {message}',
                    success: 'Successfully {action}'
                }
            };
        });

        it('should translate simple keys', () => {
            expect(i18n.t('popup.title')).toBe('Web Refactor');
            expect(i18n.t('popup.main.prompt')).toBe('Enter your requirements');
        });

        it('should return key for missing translations', () => {
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            expect(i18n.t('missing.key')).toBe('missing.key');
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('Translation key not found: missing.key')
            );
            
            consoleWarnSpy.mockRestore();
        });

        it('should handle parameter interpolation', () => {
            expect(i18n.t('messages.error', { message: 'Network failed' }))
                .toBe('Error: Network failed');
            
            expect(i18n.t('messages.success', { action: 'saved' }))
                .toBe('Successfully saved');
        });

        it('should handle missing parameters gracefully', () => {
            expect(i18n.t('messages.error', {}))
                .toBe('Error: {message}');
        });
    });

    describe('language switching', () => {
        it('should switch language successfully', async () => {
            const dispatchEventSpy = jest.spyOn(window, 'dispatchEvent');
            
            global.fetch.mockResolvedValueOnce({
                json: async () => ({ test: 'Chinese content' })
            });

            await i18n.switchLanguage('zh');

            expect(i18n.currentLanguage).toBe('zh');
            expect(chrome.storage.sync.set).toHaveBeenCalledWith({ language: 'zh' });
            expect(dispatchEventSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'languageChanged',
                    detail: { language: 'zh' }
                })
            );
        });

        it('should not switch if already on the same language', async () => {
            i18n.currentLanguage = 'en';
            await i18n.switchLanguage('en');
            
            expect(chrome.storage.sync.set).not.toHaveBeenCalled();
        });
    });

    describe('utility methods', () => {
        it('should return supported languages', () => {
            const languages = i18n.getSupportedLanguages();
            expect(languages).toHaveLength(2);
            expect(languages).toEqual([
                { code: 'en', name: 'English' },
                { code: 'zh', name: 'Chinese' }
            ]);
        });

        it('should get language display name', () => {
            expect(i18n.getLanguageName('en')).toBe('English');
            expect(i18n.getLanguageName('zh')).toBe('Chinese');
            expect(i18n.getLanguageName('unknown')).toBe('unknown');
        });

        it('should get current language', () => {
            i18n.currentLanguage = 'zh';
            expect(i18n.getCurrentLanguage()).toBe('zh');
        });
    });

    describe('deep merge', () => {
        it('should merge objects correctly', () => {
            const source = {
                a: 1,
                b: { c: 2, d: 3 },
                e: [1, 2, 3]
            };
            const target = {
                b: { c: 4, f: 5 },
                g: 6
            };

            const result = i18n.deepMerge(source, target);
            
            expect(result).toEqual({
                a: 1,
                b: { c: 4, d: 3, f: 5 },
                e: [1, 2, 3],
                g: 6
            });
        });
    });
});