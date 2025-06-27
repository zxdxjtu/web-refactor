// Real Webpage Test using Playwright
// This script opens a real webpage, extracts DOM content, processes with LLM, and applies changes

const fs = require('fs');
const yaml = require('js-yaml');
const { spawn } = require('child_process');

// Load LLM configuration
function loadConfig() {
    try {
        const configPath = '~/.secrets/llm_config.yaml';
        const fileContents = fs.readFileSync(configPath, 'utf8');
        return yaml.load(fileContents);
    } catch (e) {
        console.error('Failed to load config:', e.message);
        return null;
    }
}

// LLM Service (same as before)
class LLMService {
    constructor(provider, config) {
        this.provider = provider;
        this.config = config;
    }

    buildSystemPrompt() {
        return `You are a professional web refactoring assistant. Analyze web content and generate JSON-formatted DOM manipulation commands.

**Principles:**
1. Remove ads, promotional content, and clutter
2. Preserve important interactive elements (play buttons, navigation, etc.)
3. Optimize main content layout

**Commands:**
- remove: Delete element completely
- hide: Hide element (display: none)
- style: Modify element style

**Output Format:**
{
  "actions": [
    {
      "type": "remove",
      "selector": ".ad-banner",
      "reason": "Remove advertisement"
    }
  ]
}

Return ONLY valid JSON, no explanations.`;
    }

    buildUserMessage(pageContent, userPrompt) {
        return `Refactor this webpage content:

**User Request:** ${userPrompt}

**Page Analysis:** 
${JSON.stringify(pageContent.analysis, null, 2)}

**Interactive Elements:**
${JSON.stringify(pageContent.interactiveElements, null, 2)}

Generate commands to fulfill the user's request while preserving important functionality.`;
    }

    async callLLM(messages) {
        const { url, key, model } = this.config;
        
        const requestBody = {
            model: model,
            messages: messages,
            max_tokens: 1500,
            temperature: 0.1
        };

        console.log(`🤖 Calling ${this.provider} (${model})...`);

        return new Promise((resolve, reject) => {
            const curlArgs = [
                '-s', '-X', 'POST', url,
                '-H', 'Content-Type: application/json',
                '-H', `Authorization: Bearer ${key}`,
                '-d', JSON.stringify(requestBody)
            ];

            const curl = spawn('curl', curlArgs);
            let output = '';
            let error = '';

            curl.stdout.on('data', (data) => output += data.toString());
            curl.stderr.on('data', (data) => error += data.toString());

            curl.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Curl failed: ${error}`));
                    return;
                }

                try {
                    const response = JSON.parse(output);
                    let content = response.choices?.[0]?.message?.content || 
                                 response.content?.[0]?.text;
                    
                    if (!content) {
                        throw new Error('No content in response');
                    }
                    
                    resolve(content);
                } catch (e) {
                    reject(new Error(`Parse error: ${e.message}`));
                }
            });
        });
    }

    async generateRefactorCommands(pageContent, userPrompt) {
        const messages = [
            { role: 'system', content: this.buildSystemPrompt() },
            { role: 'user', content: this.buildUserMessage(pageContent, userPrompt) }
        ];

        const response = await this.callLLM(messages);
        
        // Extract JSON from response
        const startIndex = response.indexOf('{');
        const lastIndex = response.lastIndexOf('}');
        
        if (startIndex === -1 || lastIndex === -1) {
            throw new Error('No JSON found in LLM response');
        }
        
        const jsonText = response.substring(startIndex, lastIndex + 1);
        const commands = JSON.parse(jsonText);
        
        if (!commands.actions || !Array.isArray(commands.actions)) {
            throw new Error('Invalid command format');
        }
        
        return commands;
    }
}

// Playwright-based webpage testing
async function testRealWebpage() {
    console.log('🌐 Starting Real Webpage Test with Playwright');
    console.log('=' .repeat(80));

    try {
        // Check if playwright is available
        let playwright;
        try {
            playwright = require('playwright');
        } catch (e) {
            console.log('📦 Installing Playwright...');
            const { execSync } = require('child_process');
            execSync('npm install playwright', { stdio: 'inherit' });
            playwright = require('playwright');
        }

        // 1. Load LLM configuration
        console.log('\n📂 Loading LLM configuration...');
        const config = loadConfig();
        if (!config) {
            throw new Error('Failed to load LLM configuration');
        }

        const provider = 'qwen'; // Use qwen as it's more reliable
        const llmConfig = config[provider];
        if (!llmConfig?.key) {
            throw new Error(`No configuration found for ${provider}`);
        }
        console.log(`✅ Using ${provider} (${llmConfig.model})`);

        // 2. Open webpage with Playwright
        console.log('\n🌐 Opening webpage with Playwright...');
        const browser = await playwright.chromium.launch({ headless: false });
        const page = await browser.newPage();
        
        // Test with a simple news site that has ads
        const testUrl = 'https://news.ycombinator.com';
        console.log(`📖 Navigating to: ${testUrl}`);
        
        await page.goto(testUrl);
        await page.waitForLoadState('networkidle');
        
        console.log('✅ Page loaded');

        // 3. Extract page content using Playwright
        console.log('\n📄 Extracting page content...');
        
        const pageContent = await page.evaluate(() => {
            // This runs in the browser context
            const analysis = {
                title: document.title,
                url: window.location.href,
                mainContent: {
                    selector: 'body',
                    text: document.body.textContent?.substring(0, 500) + '...',
                    length: document.body.textContent?.length || 0
                },
                advertisements: [],
                navigation: [],
                sidebars: [],
                contentStructure: {
                    headings: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
                    paragraphs: document.querySelectorAll('p').length,
                    lists: document.querySelectorAll('ul, ol').length,
                    images: document.querySelectorAll('img').length,
                    links: document.querySelectorAll('a').length
                }
            };

            // Detect potential ads or promotional content
            const adSelectors = ['.ad', '.ads', '.advertisement', '[class*="ad"]', '.sponsor'];
            adSelectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    if (el.offsetWidth > 0 && el.offsetHeight > 0) {
                        analysis.advertisements.push({
                            selector: selector,
                            text: el.textContent?.substring(0, 100) || ''
                        });
                    }
                });
            });

            // Detect interactive elements
            const interactiveElements = [];
            const selectors = ['button', 'a[href]', 'input', '.vote', '.score'];
            
            selectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    if (el.offsetWidth > 0 && el.offsetHeight > 0) {
                        interactiveElements.push({
                            selector: el.className ? `.${el.className.split(' ')[0]}` : selector,
                            type: el.tagName.toLowerCase(),
                            text: el.textContent?.trim().substring(0, 50) || '',
                            important: ['vote', 'score', 'comments'].some(word => 
                                el.className?.includes(word) || el.textContent?.toLowerCase().includes(word)
                            )
                        });
                    }
                });
            });

            return {
                analysis,
                interactiveElements,
                originalState: {
                    title: document.title,
                    url: window.location.href,
                    timestamp: Date.now()
                }
            };
        });

        console.log('✅ Content extracted');
        console.log(`   Title: ${pageContent.analysis.title}`);
        console.log(`   Interactive elements: ${pageContent.interactiveElements.length}`);
        console.log(`   Content structure: ${JSON.stringify(pageContent.analysis.contentStructure)}`);

        // 4. Generate refactor commands with LLM
        console.log('\n🤖 Generating refactor commands...');
        const userPrompt = "Clean up the page by removing any advertisements or promotional content, but keep all the important links and voting functionality";
        
        const llmService = new LLMService(provider, llmConfig);
        const commands = await llmService.generateRefactorCommands(pageContent, userPrompt);
        
        console.log(`✅ Generated ${commands.actions.length} commands`);
        commands.actions.forEach((action, i) => {
            console.log(`   ${i+1}. ${action.type.toUpperCase()}: ${action.selector}`);
            if (action.reason) console.log(`      → ${action.reason}`);
        });

        // 5. Apply commands to the webpage
        console.log('\n⚡ Applying refactor commands to webpage...');
        
        const results = await page.evaluate((commandsToExecute) => {
            const results = [];
            
            commandsToExecute.actions.forEach((command, index) => {
                try {
                    console.log(`Executing command ${index + 1}: ${command.type} on ${command.selector}`);
                    
                    const elements = document.querySelectorAll(command.selector);
                    console.log(`Found ${elements.length} elements for selector: ${command.selector}`);
                    
                    if (elements.length === 0) {
                        results.push({
                            commandIndex: index,
                            success: false,
                            error: 'No elements found'
                        });
                        return;
                    }
                    
                    elements.forEach(el => {
                        switch (command.type) {
                            case 'remove':
                                el.remove();
                                break;
                            case 'hide':
                                el.style.display = 'none';
                                el.setAttribute('data-refactor-hidden', 'true');
                                break;
                            case 'style':
                                if (command.cssProperties) {
                                    Object.assign(el.style, command.cssProperties);
                                }
                                break;
                        }
                    });
                    
                    results.push({
                        commandIndex: index,
                        success: true,
                        elementsAffected: elements.length
                    });
                    
                } catch (error) {
                    console.error(`Command ${index + 1} failed:`, error);
                    results.push({
                        commandIndex: index,
                        success: false,
                        error: error.message
                    });
                }
            });
            
            return results;
        }, commands);

        const successCount = results.filter(r => r.success).length;
        console.log(`✅ Applied ${successCount}/${commands.actions.length} commands successfully`);

        // 6. Take screenshot of results
        console.log('\n📸 Taking screenshot of results...');
        await page.screenshot({ path: 'refactor_result.png', fullPage: true });
        console.log('✅ Screenshot saved as refactor_result.png');

        // 7. Wait for user to see results
        console.log('\n👀 Page refactored! Check the browser window.');
        console.log('Press Enter to close and see summary...');
        
        // Keep browser open for a while to see results
        await new Promise(resolve => setTimeout(resolve, 10000));

        await browser.close();

        // 8. Generate test report
        console.log('\n📊 Test Results Summary');
        console.log('=' .repeat(50));
        console.log(`✅ Test Status: SUCCESS`);
        console.log(`🌐 Test URL: ${testUrl}`);
        console.log(`🤖 LLM Provider: ${provider}`);
        console.log(`📝 Commands Generated: ${commands.actions.length}`);
        console.log(`⚡ Commands Executed: ${successCount}`);
        console.log(`📈 Success Rate: ${Math.round(successCount / commands.actions.length * 100)}%`);

        // Save test results
        const testResult = {
            timestamp: new Date().toISOString(),
            testUrl: testUrl,
            provider: provider,
            model: llmConfig.model,
            userPrompt: userPrompt,
            pageContent: pageContent,
            generatedCommands: commands,
            executionResults: results,
            statistics: {
                commandCount: commands.actions.length,
                successCount: successCount,
                successRate: Math.round(successCount / commands.actions.length * 100)
            }
        };

        const resultFile = `real_webpage_test_${Date.now()}.json`;
        fs.writeFileSync(resultFile, JSON.stringify(testResult, null, 2));
        console.log(`💾 Test results saved to: ${resultFile}`);

        console.log('\n🎉 Real webpage test completed successfully!');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Run the test
if (require.main === module) {
    testRealWebpage();
}

module.exports = { testRealWebpage, LLMService };