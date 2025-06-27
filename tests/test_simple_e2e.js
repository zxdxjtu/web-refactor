// Simple End-to-End Test without external dependencies
// This validates the core LLM processing logic

const fs = require('fs');
const { spawn } = require('child_process');

// Parse YAML config manually (simple parser for our specific format)
function parseSimpleYaml(content) {
    const config = {};
    let currentSection = null;
    
    content.split('\n').forEach(line => {
        line = line.trim();
        if (!line || line.startsWith('#')) return;
        
        if (line.endsWith(':') && !line.includes(' ')) {
            // Section header
            currentSection = line.slice(0, -1);
            config[currentSection] = {};
        } else if (currentSection && line.includes(':')) {
            // Key-value pair
            const [key, ...valueParts] = line.split(':');
            const value = valueParts.join(':').trim();
            config[currentSection][key.trim()] = value;
        }
    });
    
    return config;
}

// Load configuration
function loadConfig() {
    try {
        const configPath = '~/.secrets/llm_config.yaml';
        const fileContents = fs.readFileSync(configPath, 'utf8');
        return parseSimpleYaml(fileContents);
    } catch (e) {
        console.error('Failed to load config:', e.message);
        return null;
    }
}

// Mock page content (representing a typical bilibili page)
function createBilibiliMockContent() {
    return {
        analysis: {
            title: "哔哩哔哩 (゜-゜)つロ 干杯~-bilibili",
            url: "https://www.bilibili.com/",
            mainContent: {
                selector: ".main-content",
                text: "推荐视频区域，包含各种优质内容创作者的视频作品，涵盖动画、游戏、音乐、科技等多个分类...",
                length: 2500
            },
            advertisements: [
                {
                    selector: ".ad-banner-top",
                    size: "1200x120",
                    text: "顶部广告横幅 - 游戏推广内容"
                },
                {
                    selector: ".promotion-card",
                    size: "300x400",
                    text: "推广卡片 - 商品推荐"
                },
                {
                    selector: ".sidebar-ad",
                    size: "300x250",
                    text: "侧边栏广告 - 直播推广"
                }
            ],
            navigation: [
                {
                    selector: ".nav-bar",
                    text: "首页 动画 番剧 国创 音乐 舞蹈 游戏 知识 数码 生活 美食"
                }
            ],
            sidebars: [
                {
                    selector: ".right-sidebar",
                    text: "右侧边栏：推荐关注、热门话题、直播推荐"
                }
            ],
            contentStructure: {
                headings: 25,
                paragraphs: 0,
                lists: 12,
                images: 80,
                links: 150
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
                selector: ".video-card .like-btn",
                type: "button", 
                text: "点赞",
                important: true
            },
            {
                selector: ".video-card .coin-btn",
                type: "button",
                text: "投币",
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
            },
            {
                selector: ".promotion-link",
                type: "link",
                text: "查看详情",
                important: false
            }
        ]
    };
}

// LLM Service for testing
class TestLLMService {
    constructor(provider, config) {
        this.provider = provider;
        this.config = config;
    }

    buildSystemPrompt() {
        return `You are a professional web refactoring assistant. Analyze web content and generate JSON commands to improve the page.

**Core Principles:**
1. Remove advertisements and promotional content completely
2. Preserve all important interactive features (play, like, follow buttons)
3. Keep navigation and core functionality intact
4. Focus on improving user experience

**Available Commands:**
- remove: Completely delete element (use for ads, promotions)
- hide: Hide element with display:none (alternative to remove)
- style: Modify element styling (for layout improvements)

**Required Output Format:**
{
  "actions": [
    {
      "type": "remove",
      "selector": ".ad-banner",
      "reason": "Remove advertisement banner"
    }
  ]
}

IMPORTANT: Return ONLY valid JSON. No explanations, no code blocks, no additional text.`;
    }

    buildUserMessage(pageContent, userPrompt) {
        // Simplified message to avoid token limits
        const simplifiedAnalysis = {
            title: pageContent.analysis.title,
            url: pageContent.analysis.url,
            advertisements: pageContent.analysis.advertisements.map(ad => ({
                selector: ad.selector,
                text: ad.text.substring(0, 50)
            })),
            mainContent: {
                selector: pageContent.analysis.mainContent.selector,
                summary: "Main video content area"
            }
        };

        const importantElements = pageContent.interactiveElements
            .filter(el => el.important)
            .map(el => ({
                selector: el.selector,
                type: el.type,
                text: el.text
            }));

        return `请根据用户需求重构网页：

**用户需求:** ${userPrompt}

**页面分析:**
${JSON.stringify(simplifiedAnalysis, null, 2)}

**重要交互元素 (必须保留):**
${JSON.stringify(importantElements, null, 2)}

请生成重构命令来满足用户需求，同时保留所有重要的交互功能。`;
    }

    async callLLM(messages) {
        const { url, key, model } = this.config;
        
        const requestBody = {
            model: model,
            messages: messages,
            max_tokens: 1000,
            temperature: 0.1
        };

        console.log(`🤖 Calling ${this.provider} LLM (${model})...`);

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
                    reject(new Error(`API call failed: ${error}`));
                    return;
                }

                try {
                    const response = JSON.parse(output);
                    
                    // Handle different API response formats
                    let content;
                    if (response.choices && response.choices[0]) {
                        content = response.choices[0].message.content;
                    } else if (response.content && response.content[0]) {
                        content = response.content[0].text;
                    } else {
                        console.error('Unexpected response format:', response);
                        throw new Error('Unexpected API response format');
                    }

                    if (!content) {
                        throw new Error('No content in API response');
                    }

                    resolve(content);
                } catch (parseError) {
                    console.error('Failed to parse API response:', parseError.message);
                    console.error('Raw output (first 300 chars):', output.substring(0, 300));
                    reject(parseError);
                }
            });
        });
    }

    parseCommands(response) {
        console.log('🔍 Parsing LLM response...');
        console.log('📄 Response length:', response.length);
        console.log('📄 First 200 chars:', response.substring(0, 200) + '...');

        try {
            // Extract JSON from response
            const startIndex = response.indexOf('{');
            const lastIndex = response.lastIndexOf('}');
            
            if (startIndex === -1 || lastIndex === -1) {
                throw new Error('No JSON structure found in response');
            }
            
            const jsonText = response.substring(startIndex, lastIndex + 1);
            console.log('🔍 Extracted JSON length:', jsonText.length);
            
            const commands = JSON.parse(jsonText);
            
            if (!commands.actions || !Array.isArray(commands.actions)) {
                throw new Error('Invalid command format - missing or invalid actions array');
            }
            
            // Validate each command
            commands.actions.forEach((action, index) => {
                if (!action.type || !action.selector) {
                    throw new Error(`Command ${index + 1} missing required fields (type, selector)`);
                }
                
                const validTypes = ['remove', 'hide', 'style', 'move', 'wrap'];
                if (!validTypes.includes(action.type)) {
                    console.warn(`Command ${index + 1} has unknown type: ${action.type}`);
                }
            });
            
            console.log(`✅ Successfully parsed ${commands.actions.length} commands`);
            return commands;
            
        } catch (error) {
            console.error('❌ Failed to parse commands:', error.message);
            console.error('📄 Full response:', response);
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

        console.log('📤 Message lengths:');
        console.log(`   System: ${systemPrompt.length} chars`);
        console.log(`   User: ${userMessage.length} chars`);

        try {
            const startTime = Date.now();
            const response = await this.callLLM(messages);
            const endTime = Date.now();
            
            console.log(`⏱️ LLM call took ${endTime - startTime}ms`);
            
            const commands = this.parseCommands(response);
            return commands;
        } catch (error) {
            console.error('❌ LLM processing failed:', error.message);
            throw error;
        }
    }
}

// Command validator and simulator
class CommandValidator {
    validateAndSimulate(commands) {
        console.log(`🔧 Validating and simulating ${commands.actions.length} commands...`);
        
        const results = [];
        const stats = {
            remove: 0,
            hide: 0,
            style: 0,
            other: 0
        };
        
        commands.actions.forEach((command, index) => {
            try {
                // Basic validation
                if (!command.type || !command.selector) {
                    throw new Error('Missing required fields');
                }
                
                // Simulate execution
                console.log(`   ${index + 1}. ${command.type.toUpperCase()}: ${command.selector}`);
                if (command.reason) {
                    console.log(`      → ${command.reason}`);
                }
                
                // Count command types
                stats[command.type] = (stats[command.type] || 0) + 1;
                
                // Simulate finding elements (mock)
                const simulatedElementCount = Math.floor(Math.random() * 3) + 1;
                
                results.push({
                    commandIndex: index,
                    success: true,
                    elementsAffected: simulatedElementCount,
                    type: command.type,
                    selector: command.selector
                });
                
            } catch (error) {
                console.error(`   ❌ Command ${index + 1} failed: ${error.message}`);
                results.push({
                    commandIndex: index,
                    success: false,
                    error: error.message
                });
            }
        });
        
        const successCount = results.filter(r => r.success).length;
        console.log(`✅ Validation complete: ${successCount}/${commands.actions.length} commands valid`);
        
        return { results, stats, successCount };
    }
}

// Main test function
async function runSimpleE2ETest() {
    console.log('🚀 Starting Simple End-to-End Test');
    console.log('=' .repeat(80));

    try {
        // 1. Load configuration
        console.log('\n📂 Step 1: Loading LLM configuration...');
        const config = loadConfig();
        if (!config) {
            throw new Error('Failed to load LLM configuration');
        }

        // Choose available provider
        let provider, llmConfig;
        if (config.qwen && config.qwen.key) {
            provider = 'qwen';
            llmConfig = config.qwen;
        } else if (config.gemini && config.gemini.key) {
            provider = 'gemini';
            llmConfig = config.gemini;
        } else {
            throw new Error('No valid LLM configuration found');
        }

        console.log(`✅ Using ${provider} provider`);
        console.log(`   Model: ${llmConfig.model}`);
        console.log(`   URL: ${llmConfig.url}`);

        // 2. Create mock page content
        console.log('\n📄 Step 2: Creating mock Bilibili page content...');
        const pageContent = createBilibiliMockContent();
        console.log('✅ Mock content created');
        console.log(`   Title: ${pageContent.analysis.title}`);
        console.log(`   Advertisements: ${pageContent.analysis.advertisements.length}`);
        console.log(`   Interactive elements: ${pageContent.interactiveElements.length}`);

        // 3. Test LLM processing
        console.log('\n🤖 Step 3: Testing LLM refactor command generation...');
        const userPrompt = "移除所有广告和推广内容，但保留视频播放、点赞、关注等核心功能";
        console.log(`   User prompt: "${userPrompt}"`);

        const llmService = new TestLLMService(provider, llmConfig);
        const commands = await llmService.generateRefactorCommands(pageContent, userPrompt);

        console.log(`✅ LLM processing completed`);
        console.log(`   Generated ${commands.actions.length} commands`);

        // 4. Display generated commands
        console.log('\n📋 Step 4: Generated Commands Analysis');
        console.log('-' .repeat(40));
        commands.actions.forEach((action, index) => {
            console.log(`${index + 1}. ${action.type.toUpperCase()}: ${action.selector}`);
            if (action.reason) console.log(`   Reason: ${action.reason}`);
        });

        // 5. Validate and simulate execution
        console.log('\n⚡ Step 5: Validating and simulating command execution...');
        const validator = new CommandValidator();
        const validation = validator.validateAndSimulate(commands);

        // 6. Generate comprehensive report
        console.log('\n📊 Final Test Results');
        console.log('=' .repeat(50));
        console.log(`✅ Test Status: SUCCESS`);
        console.log(`🤖 LLM Provider: ${provider} (${llmConfig.model})`);
        console.log(`📝 Commands Generated: ${commands.actions.length}`);
        console.log(`✅ Commands Valid: ${validation.successCount}`);
        console.log(`📈 Validation Rate: ${Math.round(validation.successCount / commands.actions.length * 100)}%`);

        console.log('\n📈 Command Type Distribution:');
        Object.entries(validation.stats).forEach(([type, count]) => {
            if (count > 0) {
                console.log(`   ${type}: ${count}`);
            }
        });

        // Check if ads were targeted
        const adCommandCount = commands.actions.filter(action => 
            action.selector.includes('ad') || 
            action.reason?.toLowerCase().includes('advertisement') ||
            action.reason?.toLowerCase().includes('广告')
        ).length;

        console.log(`\n🎯 Ad Removal Analysis:`);
        console.log(`   Detected ads in page: ${pageContent.analysis.advertisements.length}`);
        console.log(`   Commands targeting ads: ${adCommandCount}`);

        // Save detailed results
        const testResult = {
            timestamp: new Date().toISOString(),
            provider: provider,
            model: llmConfig.model,
            userPrompt: userPrompt,
            mockPageContent: pageContent,
            generatedCommands: commands,
            validationResults: validation,
            statistics: {
                commandCount: commands.actions.length,
                validCommandCount: validation.successCount,
                validationRate: Math.round(validation.successCount / commands.actions.length * 100),
                adTargetingRate: Math.round(adCommandCount / pageContent.analysis.advertisements.length * 100),
                commandTypes: validation.stats
            }
        };

        const resultFile = `simple_e2e_test_${Date.now()}.json`;
        fs.writeFileSync(resultFile, JSON.stringify(testResult, null, 2));
        console.log(`\n💾 Detailed results saved to: ${resultFile}`);

        console.log('\n🎉 Simple E2E test completed successfully!');
        console.log('\n💡 Next steps:');
        console.log('   1. Check the generated commands make sense');
        console.log('   2. Test with real webpage using test_real_webpage.js');
        console.log('   3. Update the extension to use the simplified content script');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Run the test
if (require.main === module) {
    runSimpleE2ETest();
}

module.exports = { runSimpleE2ETest, TestLLMService, CommandValidator };