# 调试指南 - 如何查看详细日志

## 🔍 查看扩展日志的方法

### 1. Background Script (后台服务) 日志
**这是最重要的日志，包含LLM调用和主要错误信息**

1. 打开Chrome浏览器
2. 进入 `chrome://extensions/` 
3. 确保右上角"开发者模式"已开启
4. 找到"智能网页重排器"扩展
5. 点击"service worker"链接（或"查看视图"中的"Service Worker"）
6. 会打开Chrome开发者工具的Console面板
7. 这里显示background.js的所有日志

**重要日志标识：**
- 🔄 开始重排页面
- ✅ / ❌ 各步骤成功/失败状态
- 🤖 LLM处理过程
- 📊 数据统计信息

### 2. Content Script (内容脚本) 日志
**包含页面DOM分析和操作详情**

1. 在要重排的网页上按 `F12` 打开开发者工具
2. 切换到"Console"标签
3. 这里显示content.js在当前页面的日志

**重要日志标识：**
- 📄 页面内容分析
- 🛡️ 交互元素保护
- ⚙️ DOM操作执行

### 3. Popup UI 日志
**包含用户界面操作**

1. 右键点击扩展图标
2. 选择"检查弹出式窗口"
3. 在开发者工具Console中查看popup.js日志

## 🚨 常见错误及解决方法

### 错误: "不支持的页面类型"
```
重排失败: 不支持的页面类型: chrome://extensions/

支持的页面类型:
• http:// 和 https:// 网页
• file:// 本地文件

不支持:
• chrome:// 浏览器内部页面
• chrome-extension:// 扩展页面
• edge:// 或其他浏览器内部页面
```

**解决方法：**
- 切换到普通网页 (如 https://www.baidu.com)
- 不要在浏览器内部页面使用扩展

### 错误: "请先在设置中配置LLM API信息"
**解决方法：**
1. 点击扩展图标
2. 切换到"设置"选项卡
3. 配置API密钥和其他LLM设置
4. 点击"测试连接"验证配置

### 错误: "无法在此页面上运行扩展"
**可能原因：**
- 页面阻止了脚本注入
- 页面正在加载中
- 网络连接问题

**解决方法：**
- 等待页面完全加载后再试
- 刷新页面后重试
- 检查页面是否有内容安全策略限制

## 📋 提交问题时请提供的信息

当遇到问题需要反馈时，请提供：

### 1. 基本信息
```
- Chrome版本：
- 扩展版本：1.0.0
- 问题发生的网页URL：
- 问题描述：
```

### 2. Background Script 日志
```
1. 打开 chrome://extensions/
2. 点击扩展的"service worker"
3. 重现问题
4. 复制Console中的完整日志
```

### 3. Content Script 日志
```
1. 在问题页面按F12
2. 切换到Console
3. 重现问题
4. 复制相关日志
```

### 4. 错误截图
- 扩展弹窗的错误信息截图
- 开发者工具Console的错误截图

## 🛠️ 高级调试技巧

### 1. 启用详细日志
在Console中运行以下命令开启更详细的日志：
```javascript
// 在background script console中
localStorage.debug = 'verbose';
```

### 2. 手动测试LLM连接
在background script console中运行：
```javascript
// 测试LLM配置
chrome.storage.sync.get(['apiKey', 'apiUrl', 'modelName'], (result) => {
    console.log('当前LLM配置:', result);
});
```

### 3. 检查页面兼容性
在content script console中运行：
```javascript
// 检查页面基本信息
console.log('页面URL:', location.href);
console.log('页面标题:', document.title);
console.log('页面协议:', location.protocol);
console.log('DOM就绪状态:', document.readyState);
```

### 4. 清理扩展数据
如果遇到持续问题，可以重置扩展数据：
```javascript
// 在background script console中清除所有存储数据
chrome.storage.sync.clear(() => {
    console.log('扩展数据已清除');
});
```

## 📞 获取帮助

如果按照以上步骤仍无法解决问题：

1. **收集日志**: 按照上述方法收集完整的错误日志
2. **记录复现步骤**: 详细描述如何重现问题
3. **环境信息**: 提供Chrome版本、操作系统等信息
4. **提交Issue**: 在项目仓库创建Issue，包含所有相关信息

## 🎯 日志符号说明

| 符号 | 含义 |
|------|------|
| 🔄 | 正在处理 |
| ✅ | 成功完成 |
| ❌ | 失败/错误 |
| ⚠️ | 警告 |
| ℹ️ | 信息 |
| 🤖 | LLM相关 |
| 📄 | 页面内容 |
| 🛡️ | 安全/保护 |
| ⚙️ | 配置/设置 |
| 📊 | 统计数据 |
| 🚀 | 开始执行 |
| 🔍 | 检查/验证 |

---

记住：详细的日志是解决问题的关键！遇到问题时，首先查看background script的日志。