# 🧪 Test Case Generation & Testing System

这个系统可以自动保存真实网页的内容数据，用于离线测试LLM重构功能。

## 🔄 工作流程

### 1. 生成测试用例 (自动)
当你使用扩展进行网页重构时，系统会自动保存测试用例：

```
用户使用扩展 → Content Script 提取页面数据 → 自动保存为测试用例
```

**保存的内容包括：**
- 页面分析数据 (标题、内容结构、广告等)
- 交互元素列表
- 用户的重构需求
- 页面统计信息
- 提取时间戳

### 2. 查看和导出测试用例
使用 `extract_test_cases.html` 页面：

1. 在扩展中打开这个页面
2. 点击 "Load Test Cases" 加载所有保存的测试用例
3. 选择你想要的测试用例
4. 点击 "Export Selected" 导出为JSON格式
5. 点击 "Download as JSON File" 下载文件

### 3. 离线测试LLM功能
使用 `test_llm_offline.js` 脚本：

```bash
# 安装依赖
npm install node-fetch

# 运行测试
node test_llm_offline.js test_case_bilibili.json https://api.openai.com/v1/chat/completions your-api-key gpt-3.5-turbo
```

## 📁 文件说明

### `extract_test_cases.html`
- **功能**: 浏览器内的测试用例管理工具
- **使用**: 在扩展环境中打开，可以查看、选择、导出测试用例
- **特点**: 图形界面，易于使用

### `test_llm_offline.js`
- **功能**: Node.js 离线测试脚本
- **使用**: 命令行运行，测试LLM处理真实页面数据
- **输出**: 生成重构命令，保存结果到文件

### `debug_connection_issue.js`
- **功能**: 浏览器控制台诊断脚本
- **使用**: 在目标网页控制台运行，诊断扩展连接问题

## 💾 测试用例格式

生成的测试用例JSON包含：

```json
{
  "metadata": {
    "url": "https://example.com",
    "title": "页面标题",
    "userPrompt": "移除广告",
    "extractedAt": "2024-01-01 12:00:00"
  },
  "pageContent": {
    "analysis": {
      "title": "页面标题",
      "mainContent": {...},
      "advertisements": [...],
      "navigation": [...],
      "contentStructure": {...}
    },
    "interactiveElements": [...],
    "originalState": {...}
  },
  "statistics": {
    "totalInteractiveElements": 15,
    "advertisements": 3,
    "headings": 5,
    "paragraphs": 20
  }
}
```

## 🧪 测试场景示例

### 1. 测试广告移除
```javascript
// 测试用例: 哔哩哔哩首页
// 用户需求: "移除所有广告"
// 期望结果: 生成remove/hide命令针对广告元素
```

### 2. 测试布局优化
```javascript
// 测试用例: 新闻网站
// 用户需求: "重新整理页面布局，突出主要内容"
// 期望结果: 生成move/style命令重新排版
```

### 3. 测试交互元素保护
```javascript
// 测试用例: 电商网站
// 用户需求: "清理页面但保留购买按钮"
// 期望结果: 保留重要交互元素，移除无关内容
```

## 📊 分析测试结果

测试完成后，系统会生成结果文件包含：

- **生成时间**: LLM处理耗时
- **命令统计**: 各类型命令数量
- **命令详情**: 完整的重构指令
- **质量评估**: 命令是否符合预期

## 🔧 调试技巧

### 1. 连接问题诊断
```javascript
// 在页面控制台运行
// 复制 debug_connection_issue.js 内容
```

### 2. 测试用例质量检查
```javascript
// 检查测试用例是否包含足够信息
const testCase = loadTestCase('test.json');
console.log('页面元素数量:', testCase.statistics);
console.log('广告元素:', testCase.pageContent.analysis.advertisements);
```

### 3. LLM响应分析
```javascript
// 检查LLM是否正确理解页面结构
console.log('系统提示词长度:', systemPrompt.length);
console.log('用户消息长度:', userMessage.length);
console.log('LLM响应格式:', typeof parsedResponse);
```

## 🚀 最佳实践

1. **收集多样化测试用例**: 不同类型网站 (新闻、电商、社交媒体等)
2. **测试不同用户需求**: 广告移除、布局优化、内容整理等
3. **验证命令有效性**: 确保生成的CSS选择器实际存在
4. **性能监控**: 跟踪LLM处理时间和成功率
5. **持续优化**: 根据测试结果改进系统提示词

## 📝 注意事项

- 测试用例包含真实网页数据，注意隐私保护
- API密钥不要提交到代码仓库
- 大型页面的测试用例可能很大，注意存储空间
- 某些网站可能有反爬虫措施，影响数据提取质量

---

这个测试系统帮助我们：
✅ 使用真实数据测试LLM功能  
✅ 离线验证重构逻辑  
✅ 快速诊断连接问题  
✅ 评估和优化系统性能