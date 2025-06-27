// End-to-End Test for Web Refactor Extension
// This script tests the complete workflow: DOM extraction -> LLM processing -> Command execution

const fs = require('fs');
const yaml = require('js-yaml');
const { spawn } = require('child_process');

// Load configuration from ~/.secrets/llm_config.yaml
function loadConfig() {
    try {
        const configPath = '~/.secrets/llm_config.yaml';
        const fileContents = fs.readFileSync(configPath, 'utf8');
        const config = yaml.load(fileContents);
        return config;
    } catch (e) {
        console.error('Failed to load config:', e.message);
        return null;
    }
}

// Simulate DOM extraction from a webpage (like bilibili)
function createMockPageContent() {
    return {
        analysis: {
            title: "哔哩哔哩 (゜-゜)つロ 干杯~-bilibili",
            url: "https://www.bilibili.com/",
            mainContent: {
                selector: "main",
                text: "推荐视频内容区域，包含各种up主的视频推荐...",
                length: 1500
            },
            advertisements: [
                {
                    selector: ".ad-banner",
                    size: "728x90",
                    text: "广告横幅内容"
                },
                {
                    selector: ".promotion-sidebar",
                    size: "300x250",
                    text: "侧边栏推广内容"
                }
            ],
            navigation: [
                {
                    selector: "nav.nav-bar",
                    text: "首页 动画 番剧 国创 音乐 舞蹈"
                }
            ],
            sidebars: [
                {
                    selector: ".right-sidebar",
                    text: "右侧边栏，包含推荐up主、热门话题等"
                }
            ],
            contentStructure: {
                headings: 15,
                paragraphs: 45,
                lists: 8,
                images: 60,
                links: 120
            }
        },
        interactiveElements: [
            {
                selector: ".video-card .play-btn",
                type: "button",
                text: "播放",
                important: true
            },
            {
                selector: ".follow-btn",
                type: "button", 
                text: "关注",
                important: true
            },
            {
                selector: ".search-input",
                type: "input",
                text: "",
                important: true
            },
            {
                selector: ".ad-close-btn",
                type: "button",
                text: "关闭广告",
                important: false
            }
        ],
        originalState: {
            html: "<html>...</html>",
            title: "哔哩哔哩",
            url: "https://www.bilibili.com/",
            timestamp: Date.now()
        }
    };
}

// LLM Service implementation
class LLMService {
    constructor(provider, config) {
        this.provider = provider;
        this.config = config;
    }

    buildSystemPrompt() {
        return `You are a professional web refactoring assistant. Your task is to analyze web content and generate JSON-formatted DOM manipulation commands to refactor the page.

**Important Principles:**
1. You can completely remove, hide, or rearrange any elements, including interactive elements (such as ad buttons, promotional links, etc.)
2. If an interactive element is retained, you must ensure its interactive functionality is not affected
3. Prioritize removing ads, promotional content, irrelevant sidebars, and other distracting elements
4. Preserve and optimize the layout and presentation of main content

**Available Commands:**
- remove: Completely delete element (recommended for ads, promotional content)
- hide: Hide element (CSS display: none)
- move: Move element to new position
- style: Modify element style (size, color, layout, etc.)
- wrap: Wrap element with new container

**Output Format Requirements:**
Must strictly follow this format with no deviations:

{
  "actions": [
    {
      "type": "remove",
      "selector": ".advertisement-banner",
      "reason": "Remove advertisement banner"
    }
  ]
}

**Absolutely Prohibited:**
- No explanatory text
- No code block markers
- JSON must start and end with {}
- Must contain "actions" array field

Please return JSON in the above format directly, without any other content.`;
    }

    buildUserMessage(pageContent, userPrompt) {
        return `Please refactor the web content based on the following user requirements:

**User Requirements:** ${userPrompt}

**Page Content Analysis:**
${JSON.stringify(pageContent.analysis, null, 2)}

**Page Interactive Elements Information:**
${JSON.stringify(pageContent.interactiveElements, null, 2)}

**Important Reminders:**
- You can remove any elements, including interactive elements (such as ads, promotional buttons, etc.)
- If retaining an interactive element, please ensure not to break its DOM structure and attributes
- Prioritize removing obvious ads, promotional content, and irrelevant elements
- Focus on optimizing the display effect of main content

Please generate DOM manipulation commands to implement the user's requirements. Must strictly return in the JSON format specified in the system prompt, without any other content.`;
    }

    async callLLM(messages) {
        const { url, key, model } = this.config;
        
        const requestBody = {
            model: model,
            messages: messages,
            max_tokens: 2000,
            temperature: 0.1
        };

        console.log(`🔄 Calling ${this.provider} LLM...`);
        console.log(`📡 URL: ${url}`);
        console.log(`🤖 Model: ${model}`);

        return new Promise((resolve, reject) => {
            // Use curl command to make the request
            const curlArgs = [
                '-s', '-X', 'POST',
                url,
                '-H', 'Content-Type: application/json',
                '-H', `Authorization: Bearer ${key}`,
                '-d', JSON.stringify(requestBody)
            ];

            const curl = spawn('curl', curlArgs);
            let output = '';
            let error = '';

            curl.stdout.on('data', (data) => {
                output += data.toString();
            });

            curl.stderr.on('data', (data) => {
                error += data.toString();
            });

            curl.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Curl failed with code ${code}: ${error}`));
                    return;
                }

                try {
                    const response = JSON.parse(output);
                    console.log('✅ LLM response received');
                    
                    let content;
                    if (response.choices && response.choices[0]) {
                        content = response.choices[0].message.content;
                    } else if (response.content && response.content[0]) {
                        content = response.content[0].text;
                    } else {
                        throw new Error('Unexpected response format');
                    }

                    if (!content) {
                        throw new Error('No content in response');
                    }

                    resolve(content);
                } catch (parseError) {
                    console.error('❌ Failed to parse response:', parseError.message);
                    console.error('Raw output:', output.substring(0, 500));
                    reject(parseError);
                }
            });
        });
    }

    parseCommands(response) {
        try {
            console.log('🔍 Raw response length:', response.length);
            console.log('📄 First 300 chars:', response.substring(0, 300) + '...');

            // Extract JSON from response
            const startIndex = response.indexOf('{');
            const lastIndex = response.lastIndexOf('}');
            
            if (startIndex === -1 || lastIndex === -1) {
                throw new Error('No JSON found in response');
            }
            
            const jsonText = response.substring(startIndex, lastIndex + 1);
            console.log('🔍 Extracted JSON:', jsonText.substring(0, 200) + '...');
            
            const commands = JSON.parse(jsonText);
            
            if (!commands.actions || !Array.isArray(commands.actions)) {
                throw new Error('Invalid command format - missing actions array');
            }
            
            console.log(`✅ Parsed ${commands.actions.length} commands successfully`);
            return commands;
            
        } catch (error) {
            console.error('❌ Failed to parse commands:', error.message);
            console.error('Raw response:', response);
            throw error;
        }
    }

    async generateRefactorCommands(pageContent, userPrompt) {
        const systemPrompt = this.buildSystemPrompt();
        const userMessage = this.buildUserMessage(pageContent, userPrompt);

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
        ];

        try {
            const response = await this.callLLM(messages);
            const commands = this.parseCommands(response);
            return commands;
        } catch (error) {
            console.error('❌ LLM processing failed:', error);
            throw error;
        }
    }
}

// DOM Command Executor (simulated)
class DOMCommandExecutor {
    constructor() {
        this.executedCommands = [];
    }

    validateCommand(command) {
        const requiredFields = ['type', 'selector'];
        for (const field of requiredFields) {
            if (!command[field]) {
                throw new Error(`Command missing required field: ${field}`);
            }
        }

        const validTypes = ['remove', 'hide', 'move', 'style', 'wrap'];
        if (!validTypes.includes(command.type)) {
            throw new Error(`Invalid command type: ${command.type}`);
        }

        // Basic CSS selector validation
        if (typeof command.selector !== 'string' || command.selector.trim().length === 0) {
            throw new Error(`Invalid selector: ${command.selector}`);
        }

        return true;
    }

    simulateCommandExecution(command) {
        // Simulate DOM manipulation
        console.log(`  🔧 Executing: ${command.type} on "${command.selector}"`);
        
        switch (command.type) {
            case 'remove':
                console.log(`    ➤ Removing elements matching "${command.selector}"`);
                break;
            case 'hide':
                console.log(`    ➤ Hiding elements matching "${command.selector}"`);
                break;
            case 'style':
                console.log(`    ➤ Styling elements matching "${command.selector}"`);
                if (command.cssProperties) {
                    console.log(`      CSS: ${JSON.stringify(command.cssProperties)}`);
                }
                break;
            case 'move':
                console.log(`    ➤ Moving elements from "${command.selector}" to "${command.destination}"`);
                break;
            case 'wrap':
                console.log(`    ➤ Wrapping elements "${command.selector}" with "${command.wrapperTag}"`);
                break;
        }

        return {
            success: true,
            selector: command.selector,
            type: command.type,
            elementsAffected: Math.floor(Math.random() * 5) + 1 // Simulate 1-5 elements affected
        };
    }

    async executeCommands(commands) {
        console.log(`⚡ Executing ${commands.actions.length} refactor commands...`);
        
        const results = [];
        
        for (let i = 0; i < commands.actions.length; i++) {
            const command = commands.actions[i];
            
            try {
                // Validate command
                this.validateCommand(command);
                
                // Execute command (simulated)
                const result = this.simulateCommandExecution(command);
                results.push({ commandIndex: i, ...result });
                
                this.executedCommands.push(command);
                
            } catch (error) {
                console.error(`  ❌ Command ${i} failed:`, error.message);
                results.push({
                    commandIndex: i,
                    success: false,
                    error: error.message,
                    command: command
                });
            }
        }
        
        const successCount = results.filter(r => r.success).length;
        console.log(`✅ Executed ${successCount}/${commands.actions.length} commands successfully`);
        
        return { results, executedCount: successCount };
    }
}

// Main test runner
async function runEndToEndTest() {
    console.log('🚀 Starting End-to-End Web Refactor Test');
    console.log('=' .repeat(80));

    try {
        // 1. Load configuration
        console.log('\n📂 Step 1: Loading LLM configuration...');
        const config = loadConfig();
        if (!config) {
            throw new Error('Failed to load LLM configuration');
        }
        
        // Choose provider (try gemini first, fallback to qwen)
        let provider = 'gemini';
        let llmConfig = config.gemini;
        
        if (!llmConfig || !llmConfig.key) {
            provider = 'qwen';
            llmConfig = config.qwen;
        }
        
        if (!llmConfig || !llmConfig.key) {
            throw new Error('No valid LLM configuration found');
        }
        
        console.log(`✅ Using ${provider} provider`);
        console.log(`   Model: ${llmConfig.model}`);
        
        // 2. Create mock page content (simulating content script extraction)
        console.log('\n📄 Step 2: Creating mock page content (simulating bilibili.com)...');
        const pageContent = createMockPageContent();
        console.log('✅ Page content created');
        console.log(`   Title: ${pageContent.analysis.title}`);
        console.log(`   Interactive elements: ${pageContent.interactiveElements.length}`);
        console.log(`   Advertisements: ${pageContent.analysis.advertisements.length}`);
        
        // 3. Generate refactor commands using LLM
        console.log('\n🤖 Step 3: Generating refactor commands with LLM...');
        const userPrompt = "移除所有广告和推广内容，保留主要的视频内容和导航功能";
        console.log(`   User prompt: "${userPrompt}"`);
        
        const llmService = new LLMService(provider, llmConfig);
        const startTime = Date.now();
        
        const commands = await llmService.generateRefactorCommands(pageContent, userPrompt);
        
        const endTime = Date.now();
        console.log(`✅ Commands generated in ${endTime - startTime}ms`);
        console.log(`   Generated ${commands.actions.length} commands`);
        
        // 4. Display generated commands
        console.log('\n📋 Step 4: Generated commands:');
        commands.actions.forEach((action, index) => {
            console.log(`   ${index + 1}. ${action.type.toUpperCase()}: ${action.selector}`);
            if (action.reason) {
                console.log(`      Reason: ${action.reason}`);
            }
        });
        
        // 5. Execute commands (simulated)
        console.log('\n⚡ Step 5: Executing refactor commands...');
        const executor = new DOMCommandExecutor();
        const executionResult = await executor.executeCommands(commands);
        
        // 6. Generate test report
        console.log('\n📊 Step 6: Test Results Summary');
        console.log('=' .repeat(50));
        console.log(`✅ Test Status: SUCCESS`);
        console.log(`🕒 LLM Processing Time: ${endTime - startTime}ms`);
        console.log(`📝 Commands Generated: ${commands.actions.length}`);
        console.log(`⚡ Commands Executed: ${executionResult.executedCount}`);
        console.log(`📈 Success Rate: ${Math.round(executionResult.executedCount / commands.actions.length * 100)}%`);
        
        // Analyze command types
        const commandTypes = {};
        commands.actions.forEach(action => {
            commandTypes[action.type] = (commandTypes[action.type] || 0) + 1;
        });
        
        console.log('\n📈 Command Type Distribution:');
        Object.entries(commandTypes).forEach(([type, count]) => {
            console.log(`   ${type}: ${count}`);
        });
        
        // Save test results
        const testResult = {
            timestamp: new Date().toISOString(),
            provider: provider,
            model: llmConfig.model,
            userPrompt: userPrompt,
            processingTime: endTime - startTime,
            generatedCommands: commands,
            executionResult: executionResult,
            statistics: {
                commandCount: commands.actions.length,
                successCount: executionResult.executedCount,
                successRate: Math.round(executionResult.executedCount / commands.actions.length * 100),
                commandTypes: commandTypes
            }
        };
        
        const resultFile = `test_result_${Date.now()}.json`;
        fs.writeFileSync(resultFile, JSON.stringify(testResult, null, 2));
        console.log(`\n💾 Test results saved to: ${resultFile}`);
        
        console.log('\n🎉 End-to-End test completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Check dependencies
try {
    require.resolve('js-yaml');
} catch (e) {
    console.log('Installing js-yaml...');
    const { execSync } = require('child_process');
    execSync('npm install js-yaml', { stdio: 'inherit' });
}

// Run the test
if (require.main === module) {
    runEndToEndTest();
}

module.exports = { LLMService, DOMCommandExecutor, createMockPageContent, runEndToEndTest };