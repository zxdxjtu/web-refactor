// Mock DOM environment
document.body.innerHTML = `
    <div id="test-container">
        <header id="header">
            <nav>
                <a href="/">Home</a>
                <a href="/about">About</a>
            </nav>
        </header>
        <main>
            <article id="main-content">
                <h1>Test Article</h1>
                <p>This is test content.</p>
            </article>
            <aside class="sidebar ad-banner">
                <div class="advertisement">Ad content</div>
            </aside>
        </main>
        <footer>
            <p>Footer content</p>
        </footer>
    </div>
`;

describe('WebRefactorContent', () => {
    let webRefactorContent;

    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();
        
        // Reset DOM
        document.body.innerHTML = `
            <div id="test-container">
                <header id="header">
                    <nav>
                        <a href="/">Home</a>
                        <a href="/about">About</a>
                    </nav>
                </header>
                <main>
                    <article id="main-content">
                        <h1>Test Article</h1>
                        <p>This is test content.</p>
                    </article>
                    <aside class="sidebar ad-banner">
                        <div class="advertisement">Ad content</div>
                    </aside>
                </main>
                <footer>
                    <p>Footer content</p>
                </footer>
            </div>
        `;
        
        // Load content script
        require('../content.js');
        webRefactorContent = window.webRefactorContent;
    });

    describe('Message Handling', () => {
        it('should respond to ping message', (done) => {
            const mockSendResponse = jest.fn((response) => {
                expect(response).toEqual({ pong: true });
                done();
            });

            webRefactorContent.handleMessage(
                { action: 'ping' },
                {},
                mockSendResponse
            );
        });

        it('should handle unknown action', (done) => {
            const mockSendResponse = jest.fn((response) => {
                expect(response.success).toBe(false);
                expect(response.error).toBe('Unknown action');
                done();
            });

            webRefactorContent.handleMessage(
                { action: 'unknown' },
                {},
                mockSendResponse
            );
        });
    });

    describe('InteractiveElementDetector', () => {
        it('should detect interactive elements', () => {
            const detector = webRefactorContent.interactiveDetector;
            const elements = detector.detectInteractiveElements();

            expect(elements.length).toBeGreaterThan(0);
            
            // Should find navigation links
            const navLinks = elements.filter(el => 
                el.element.tagName === 'A' && el.element.closest('nav')
            );
            expect(navLinks.length).toBe(2);
            expect(navLinks.every(link => link.isUseful)).toBe(true);
        });

        it('should mark ads as removable', () => {
            const detector = webRefactorContent.interactiveDetector;
            const elements = detector.detectInteractiveElements();
            
            const adElements = elements.filter(el => 
                el.element.classList.contains('advertisement') ||
                el.element.classList.contains('ad-banner')
            );
            
            expect(adElements.length).toBeGreaterThan(0);
            expect(adElements.every(ad => ad.canBeRemoved)).toBe(true);
        });
    });

    describe('CommandExecutor', () => {
        it('should execute hide command', async () => {
            const executor = webRefactorContent.commandExecutor;
            const command = {
                type: 'hide',
                selector: '.advertisement'
            };

            const result = await executor.executeCommand(command);
            
            const adElement = document.querySelector('.advertisement');
            expect(adElement.style.display).toBe('none');
            expect(adElement.getAttribute('data-refactor-hidden')).toBe('true');
        });

        it('should execute remove command', async () => {
            const executor = webRefactorContent.commandExecutor;
            const command = {
                type: 'remove',
                selector: '.ad-banner'
            };

            await executor.executeCommand(command);
            
            const adBanner = document.querySelector('.ad-banner');
            expect(adBanner).toBeNull();
        });

        it('should execute style command', async () => {
            const executor = webRefactorContent.commandExecutor;
            const command = {
                type: 'style',
                selector: '#main-content',
                styles: {
                    backgroundColor: 'white',
                    padding: '20px'
                }
            };

            await executor.executeCommand(command);
            
            const mainContent = document.querySelector('#main-content');
            expect(mainContent.style.backgroundColor).toBe('white');
            expect(mainContent.style.padding).toBe('20px');
        });

        it('should throw error for non-existent selector', async () => {
            const executor = webRefactorContent.commandExecutor;
            const command = {
                type: 'hide',
                selector: '.non-existent'
            };

            await expect(executor.executeCommand(command))
                .rejects.toThrow('No matching elements found');
        });
    });

    describe('DOMAnalyzer', () => {
        it('should analyze page structure', () => {
            const analyzer = webRefactorContent.domAnalyzer;
            const analysis = analyzer.analyzePage([]);

            expect(analysis).toHaveProperty('title');
            expect(analysis).toHaveProperty('mainContent');
            expect(analysis).toHaveProperty('navigation');
            expect(analysis).toHaveProperty('advertisements');
            expect(analysis.title).toBe('');
            expect(analysis.mainContent).toContain('Test Article');
        });

        it('should capture original state', () => {
            const analyzer = webRefactorContent.domAnalyzer;
            const originalState = analyzer.captureOriginalState();

            expect(originalState).toHaveProperty('html');
            expect(originalState).toHaveProperty('styles');
            expect(originalState).toHaveProperty('elementStates');
            expect(originalState.html).toContain('Test Article');
        });

        it('should restore original state', () => {
            const analyzer = webRefactorContent.domAnalyzer;
            const originalState = analyzer.captureOriginalState();

            // Modify DOM
            document.querySelector('#main-content').style.display = 'none';
            document.querySelector('.advertisement').remove();

            // Restore
            analyzer.restoreOriginalState(originalState);

            expect(document.querySelector('#main-content').style.display).toBe('');
            expect(document.querySelector('.advertisement')).toBeTruthy();
        });
    });

    describe('Content Extraction', () => {
        it('should extract page content with interactive elements', async () => {
            const mockSendResponse = jest.fn();

            await webRefactorContent.handleExtractContent(mockSendResponse);

            expect(mockSendResponse).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({
                        analysis: expect.any(Object),
                        interactiveElements: expect.any(Array),
                        originalState: expect.any(Object)
                    })
                })
            );
        });
    });

    describe('Command Execution', () => {
        it('should execute multiple commands', async () => {
            const commands = [
                { type: 'hide', selector: '.advertisement' },
                { type: 'style', selector: '#main-content', styles: { maxWidth: '800px' } }
            ];

            const mockSendResponse = jest.fn();
            await webRefactorContent.handleExecuteCommands(commands, mockSendResponse);

            expect(mockSendResponse).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({
                        results: expect.any(Array),
                        executed: 2
                    })
                })
            );

            // Check DOM changes
            expect(document.querySelector('.advertisement').style.display).toBe('none');
            expect(document.querySelector('#main-content').style.maxWidth).toBe('800px');
        });
    });

    describe('Reset Functionality', () => {
        it('should reset page to original state', async () => {
            // First extract content to save original state
            const extractResponse = jest.fn();
            await webRefactorContent.handleExtractContent(extractResponse);

            // Execute some commands
            const commands = [
                { type: 'hide', selector: '.advertisement' },
                { type: 'remove', selector: '.sidebar' }
            ];
            await webRefactorContent.handleExecuteCommands(commands, jest.fn());

            // Reset
            const resetResponse = jest.fn();
            await webRefactorContent.handleReset(null, resetResponse);

            expect(resetResponse).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({
                        message: 'Page has been restored to original state'
                    })
                })
            );

            // Check DOM is restored
            expect(document.querySelector('.advertisement').style.display).not.toBe('none');
            expect(document.querySelector('.sidebar')).toBeTruthy();
        });
    });
});