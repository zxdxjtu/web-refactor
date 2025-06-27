describe('WebRefactorBackground', () => {
    let backgroundService;
    let aiService;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock AIService
        jest.mock('../background.js', () => {
            const originalModule = jest.requireActual('../background.js');
            return {
                ...originalModule,
                AIService: jest.fn().mockImplementation(() => ({
                    generateRefactorCommands: jest.fn().mockResolvedValue([
                        { type: 'hide', selector: '.ad' }
                    ]),
                    testConnection: jest.fn().mockResolvedValue({ 
                        message: 'API connection test successful' 
                    })
                }))
            };
        });

        const { WebRefactorBackground } = require('../background.js');
        backgroundService = new WebRefactorBackground();
        aiService = backgroundService.aiService;
    });

    describe('Page Support Detection', () => {
        it('should support http and https URLs', () => {
            expect(backgroundService.isPageSupported('http://example.com')).toBe(true);
            expect(backgroundService.isPageSupported('https://example.com')).toBe(true);
        });

        it('should support file URLs', () => {
            expect(backgroundService.isPageSupported('file:///path/to/file.html')).toBe(true);
        });

        it('should not support chrome URLs', () => {
            expect(backgroundService.isPageSupported('chrome://extensions')).toBe(false);
            expect(backgroundService.isPageSupported('chrome-extension://id/page.html')).toBe(false);
        });

        it('should not support other browser internal URLs', () => {
            expect(backgroundService.isPageSupported('edge://settings')).toBe(false);
            expect(backgroundService.isPageSupported('about:blank')).toBe(false);
        });
    });

    describe('Domain Extraction', () => {
        it('should extract domain from URL', () => {
            expect(backgroundService.extractDomain('https://example.com/path')).toBe('example.com');
            expect(backgroundService.extractDomain('http://sub.example.com')).toBe('sub.example.com');
        });

        it('should handle invalid URLs', () => {
            expect(backgroundService.extractDomain('invalid-url')).toBe('invalid-url');
        });
    });

    describe('Message Handling', () => {
        it('should handle refactor message', async () => {
            const mockTab = { id: 1, url: 'https://example.com' };
            chrome.tabs.get.mockResolvedValue(mockTab);
            chrome.tabs.sendMessage.mockResolvedValue({ 
                success: true, 
                data: { 
                    analysis: {}, 
                    interactiveElements: [],
                    originalState: {}
                }
            });

            const sendResponse = jest.fn();
            await backgroundService.handleRefactor(
                { tabId: 1, prompt: 'Remove ads' },
                {},
                sendResponse
            );

            expect(sendResponse).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    result: expect.any(Object)
                })
            );
        });

        it('should reject unsupported pages', async () => {
            const mockTab = { id: 1, url: 'chrome://extensions' };
            chrome.tabs.get.mockResolvedValue(mockTab);

            const sendResponse = jest.fn();
            await backgroundService.handleRefactor(
                { tabId: 1, prompt: 'Remove ads' },
                {},
                sendResponse
            );

            expect(sendResponse).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    error: expect.stringContaining('Unsupported page type')
                })
            );
        });

        it('should handle reset message', async () => {
            // Set up original state
            backgroundService.originalStates.set(1, { html: '<div>Original</div>' });

            chrome.tabs.sendMessage.mockResolvedValue({ success: true });

            const sendResponse = jest.fn();
            await backgroundService.handleReset(
                { tabId: 1 },
                {},
                sendResponse
            );

            expect(sendResponse).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true
                })
            );
        });

        it('should handle test connection message', async () => {
            const sendResponse = jest.fn();
            await backgroundService.handleTestConnection(
                { settings: { apiKey: 'test', apiUrl: 'https://api.test.com' } },
                {},
                sendResponse
            );

            expect(sendResponse).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    result: expect.objectContaining({
                        message: 'API connection test successful'
                    })
                })
            );
        });
    });

    describe('Content Script Injection', () => {
        it('should skip injection if script already exists', async () => {
            chrome.tabs.sendMessage.mockResolvedValue({ pong: true });

            await backgroundService.injectContentScript(1);

            expect(chrome.scripting.executeScript).not.toHaveBeenCalled();
        });

        it('should inject script if not present', async () => {
            chrome.tabs.sendMessage
                .mockRejectedValueOnce(new Error('Not found'))
                .mockResolvedValue({ pong: true });

            chrome.scripting.executeScript.mockResolvedValue();

            await backgroundService.injectContentScript(1);

            expect(chrome.scripting.executeScript).toHaveBeenCalledWith({
                target: { tabId: 1 },
                files: ['content.js']
            });
        });

        it('should handle injection failure', async () => {
            chrome.tabs.sendMessage.mockRejectedValue(new Error('Not found'));
            chrome.scripting.executeScript.mockRejectedValue(new Error('Permission denied'));

            await expect(backgroundService.injectContentScript(1))
                .rejects.toThrow('Unable to run extension on this page');
        });
    });

    describe('Domain Memory', () => {
        it('should save domain memory', async () => {
            const memoryEntry = {
                timestamp: Date.now(),
                domain: 'example.com',
                prompt: 'Remove ads',
                commands: [{ type: 'hide', selector: '.ad' }]
            };

            await backgroundService.saveDomainMemory('example.com', memoryEntry);

            expect(chrome.storage.local.set).toHaveBeenCalledWith(
                expect.objectContaining({
                    'memory_example.com': expect.arrayContaining([
                        expect.objectContaining({
                            domain: 'example.com',
                            prompt: 'Remove ads'
                        })
                    ])
                })
            );
        });

        it('should load domain memory', async () => {
            const mockMemory = [{
                timestamp: Date.now(),
                domain: 'example.com',
                prompt: 'Remove ads'
            }];

            chrome.storage.local.get.mockResolvedValue({
                'memory_example.com': mockMemory
            });

            const memory = await backgroundService.loadDomainMemory('example.com');
            expect(memory).toEqual(mockMemory);
        });

        it('should clean up old memory entries', async () => {
            const oldEntry = {
                timestamp: Date.now() - 40 * 24 * 60 * 60 * 1000, // 40 days old
                domain: 'example.com'
            };
            const newEntry = {
                timestamp: Date.now(),
                domain: 'example.com'
            };

            chrome.storage.local.get.mockResolvedValue({
                'memory_example.com': [oldEntry, newEntry]
            });
            chrome.storage.sync.get.mockResolvedValue({
                maxMemoryEntries: 5,
                memoryRetentionDays: 30
            });

            await backgroundService.saveDomainMemory('example.com', newEntry);

            expect(chrome.storage.local.set).toHaveBeenCalledWith(
                expect.objectContaining({
                    'memory_example.com': expect.not.arrayContaining([oldEntry])
                })
            );
        });
    });

    describe('AIService', () => {
        let aiServiceInstance;

        beforeEach(() => {
            const { AIService } = require('../background.js');
            aiServiceInstance = new AIService();
        });

        it('should parse valid command response', () => {
            const response = JSON.stringify({
                actions: [
                    { type: 'hide', selector: '.ad' },
                    { type: 'remove', selector: '.popup' }
                ]
            });

            const commands = aiServiceInstance.parseCommands(response);
            expect(commands).toHaveLength(2);
            expect(commands[0]).toEqual({ type: 'hide', selector: '.ad' });
        });

        it('should handle response with code block', () => {
            const response = `
Here are the commands:
\`\`\`json
{
    "actions": [
        { "type": "hide", "selector": ".ad" }
    ]
}
\`\`\`
            `;

            const commands = aiServiceInstance.parseCommands(response);
            expect(commands).toHaveLength(1);
        });

        it('should fix common JSON issues', () => {
            const response = `{
                "actions": [
                    { "type": "hide", "selector": ".ad" },
                ]
            }`;

            const commands = aiServiceInstance.parseCommands(response);
            expect(commands).toHaveLength(1);
        });

        it('should validate command types', () => {
            const response = JSON.stringify({
                actions: [
                    { type: 'hide', selector: '.ad' },
                    { type: 'invalid', selector: '.test' },
                    { type: 'remove', selector: '.popup' }
                ]
            });

            const commands = aiServiceInstance.parseCommands(response);
            expect(commands).toHaveLength(2);
            expect(commands.find(cmd => cmd.type === 'invalid')).toBeUndefined();
        });

        it('should throw error for invalid response format', () => {
            expect(() => aiServiceInstance.parseCommands('not json'))
                .toThrow('No valid JSON format found in response');
            
            expect(() => aiServiceInstance.parseCommands('{"no": "actions"}'))
                .toThrow('Missing actions field');
        });
    });
});