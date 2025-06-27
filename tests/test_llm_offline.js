// Offline LLM Testing Script
// This script can be used to test LLM processing with saved test cases

const fs = require('fs');
const fetch = require('node-fetch'); // You may need: npm install node-fetch

// Load a test case from JSON file
function loadTestCase(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('❌ Failed to load test case:', error.message);
        return null;
    }
}

// LLM processing class (simplified version of the extension's AIService)
class OfflineLLMTester {
    constructor(apiUrl, apiKey, modelName = 'gpt-3.5-turbo') {
        this.apiUrl = apiUrl;
        this.apiKey = apiKey;
        this.modelName = modelName;
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
- reorderChildren: Reorder child elements

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
- No additional text
- JSON must start and end with {}
- Must contain "actions" array field

Please return JSON in the above format directly, without any other content.`;
    }

    buildUserMessage(pageContent, userPrompt) {
        return `Please refactor the web content based on the following user requirements:

**User Requirements:** ${userPrompt}

**Page Content Analysis:**
${JSON.stringify(pageContent.analysis || {}, null, 2)}

**Page Interactive Elements Information:**
${JSON.stringify(pageContent.interactiveElements || [], null, 2)}

**Important Reminders:**
- You can remove any elements, including interactive elements (such as ads, promotional buttons, etc.)
- If retaining an interactive element, please ensure not to break its DOM structure and attributes
- Prioritize removing obvious ads, promotional content, and irrelevant elements
- Focus on optimizing the display effect of main content

Please generate DOM manipulation commands to implement the user's requirements. Must strictly return in the JSON format specified in the system prompt, without any other content.`;
    }

    async callLLM(messages) {
        const requestBody = {
            model: this.modelName,
            messages: messages,
            max_tokens: 2000,
            temperature: 0.1
        };

        console.log('🔄 Calling LLM API...');
        console.log('📤 Request:', {
            url: this.apiUrl,
            model: this.modelName,
            messageCount: messages.length
        });

        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`API request failed (${response.status}): ${error}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            throw new Error('No content in LLM response');
        }

        console.log('📥 Raw LLM response length:', content.length);
        console.log('📄 First 500 chars:', content.substring(0, 500) + '...');

        return content;
    }

    parseCommands(response) {
        try {
            // Simple JSON extraction - just find the first { and last }
            const startIndex = response.indexOf('{');
            const lastIndex = response.lastIndexOf('}');
            
            if (startIndex === -1 || lastIndex === -1) {
                throw new Error('No JSON found in response');
            }
            
            const jsonText = response.substring(startIndex, lastIndex + 1);
            const commands = JSON.parse(jsonText);
            
            if (!commands.actions || !Array.isArray(commands.actions)) {
                throw new Error('Invalid command format - missing actions array');
            }
            
            console.log('✅ Parsed commands:', commands.actions.length, 'actions');
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

// Test runner function
async function runTest(testCaseFile, apiConfig) {
    console.log('🧪 Starting offline LLM test...');
    console.log('📁 Test case file:', testCaseFile);
    
    // Load test case
    const testCase = loadTestCase(testCaseFile);
    if (!testCase) {
        console.error('❌ Failed to load test case');
        return;
    }
    
    console.log('✅ Test case loaded:', testCase.metadata?.title);
    console.log('🌐 URL:', testCase.metadata?.url);
    console.log('💬 User prompt:', testCase.metadata?.userPrompt);
    console.log('📊 Stats:', testCase.statistics);
    
    // Initialize LLM tester
    const llmTester = new OfflineLLMTester(
        apiConfig.apiUrl,
        apiConfig.apiKey,
        apiConfig.modelName
    );
    
    try {
        // Generate refactor commands
        console.log('\n🔄 Generating refactor commands...');
        const startTime = Date.now();
        
        const commands = await llmTester.generateRefactorCommands(
            testCase.pageContent,
            testCase.metadata.userPrompt
        );
        
        const endTime = Date.now();
        console.log(`✅ Generation completed in ${endTime - startTime}ms`);
        
        // Display results
        console.log('\n📋 Generated Commands:');
        console.log('='.repeat(80));
        console.log(JSON.stringify(commands, null, 2));
        console.log('='.repeat(80));
        
        console.log(`\n📊 Summary: ${commands.actions.length} commands generated`);
        
        // Analyze command types
        const commandTypes = {};
        commands.actions.forEach(action => {
            commandTypes[action.type] = (commandTypes[action.type] || 0) + 1;
        });
        
        console.log('📈 Command breakdown:');
        Object.entries(commandTypes).forEach(([type, count]) => {
            console.log(`  ${type}: ${count}`);
        });
        
        // Save results
        const resultFile = testCaseFile.replace('.json', '_result.json');
        const result = {
            testCase: testCase.metadata,
            generatedCommands: commands,
            stats: {
                generationTime: endTime - startTime,
                commandCount: commands.actions.length,
                commandTypes: commandTypes
            },
            generatedAt: new Date().toISOString()
        };
        
        fs.writeFileSync(resultFile, JSON.stringify(result, null, 2));
        console.log('💾 Results saved to:', resultFile);
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Example usage
if (require.main === module) {
    // Example configuration - replace with your API details
    const apiConfig = {
        apiUrl: 'https://api.openai.com/v1/chat/completions',
        apiKey: 'your-api-key-here',
        modelName: 'gpt-3.5-turbo'
    };
    
    // Example test case file path
    const testCaseFile = './test_case_bilibili_com.json';
    
    console.log('🚀 Offline LLM Tester');
    console.log('Usage: node test_llm_offline.js [test-case-file] [api-url] [api-key] [model]');
    console.log('');
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    if (args.length >= 1) apiConfig.apiUrl = args[1] || apiConfig.apiUrl;
    if (args.length >= 2) apiConfig.apiKey = args[2] || apiConfig.apiKey;
    if (args.length >= 3) apiConfig.modelName = args[3] || apiConfig.modelName;
    
    const testFile = args[0] || testCaseFile;
    
    if (!fs.existsSync(testFile)) {
        console.error('❌ Test case file not found:', testFile);
        console.log('💡 First export a test case using extract_test_cases.html');
        process.exit(1);
    }
    
    if (apiConfig.apiKey === 'your-api-key-here') {
        console.error('❌ Please set your API key');
        console.log('💡 Edit the apiConfig in this file or pass it as argument');
        process.exit(1);
    }
    
    runTest(testFile, apiConfig)
        .then(() => {
            console.log('\n✅ Test completed successfully');
        })
        .catch(error => {
            console.error('\n❌ Test failed:', error);
            process.exit(1);
        });
}

module.exports = { OfflineLLMTester, runTest, loadTestCase };