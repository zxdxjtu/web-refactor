# LLM-based Web Refactor | 智能网页重构

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-brightgreen.svg)](https://chrome.google.com/webstore)

[English](#english) | [中文](#中文)

---

## English

**Intelligently refactor web page content using Large Language Models while preserving interactive functionality.**

Smart Web Refactor is a Chrome extension that leverages the power of Large Language Models (LLMs) to customize web page layouts according to your preferences. Remove ads, clean up clutter, focus on content that matters - all with simple natural language commands.

### 🚀 Key Features

- **AI-Powered Content Modification**: Use OpenAI, Anthropic, or custom LLM APIs to intelligently reorganize web page layouts
- **Smart Ad & Clutter Removal**: Automatically removes advertisements and unwanted content while preserving interactive elements
- **Domain Memory**: Save and auto-apply your refactoring preferences for specific websites
- **Focus Modes**: Built-in presets for reading mode, minimal layout, and ad-free browsing
- **History & Templates**: Access your previous prompts and use common templates
- **Multi-Language Support**: Available in English and Chinese
- **Non-Destructive**: All changes are reversible with one-click restoration

### 📱 Use Cases

- **YouTube Focus**: Remove recommended videos, comments, and sidebar - just watch the video
- **Article Reading**: Clean up news websites for distraction-free reading
- **Ad-Free Browsing**: Eliminate advertisements and promotional content
- **Social Media Cleanup**: Hide sponsored posts, suggested friends, and distracting elements
- **E-commerce Simplification**: Focus on product details without promotional clutter

### 🛠 Installation

#### Method 1: Chrome Web Store (Coming Soon)
*The extension will be available on the Chrome Web Store soon.*

#### Method 2: Developer Mode Installation

1. **Download the Extension**
   ```bash
   git clone https://github.com/zxdxjtu/web-refactor.git
   cd web-refactor
   ```

2. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right corner)
   - Click "Load unpacked"
   - Select the `web-refactor` folder

3. **Configure API Settings**
   - Click the extension icon in your toolbar
   - Go to "Settings" tab
   - Configure your LLM provider (OpenAI, Anthropic, or Custom)
   - Enter your API key
   - Save settings

### 🎯 Quick Start

1. **Navigate to any webpage** (e.g., YouTube, news site)
2. **Click the extension icon**
3. **Choose a preset** or **enter your custom request**:
   - "Remove all ads and promotional content"
   - "Hide everything except the main video"
   - "Clean up this page for reading"
4. **Click "Start Refactor"**
5. **Save the configuration** for future visits to this domain

### ⚙️ Configuration

#### Supported LLM Providers
- **OpenAI**: GPT-3.5, GPT-4, GPT-4o
- **Anthropic**: Claude 3 Haiku, Sonnet, Opus
- **Custom**: Any OpenAI-compatible API endpoint
- **Proxy Support**: Configure proxy for restricted networks

#### Built-in Templates
- **Reader Mode**: Clean layout for article reading
- **Minimal Mode**: Essential content only
- **Article Focus**: Optimize for text content
- **Clean Ads**: Remove advertisements and promotions

### 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

#### Development Setup
```bash
# Clone the repository
git clone https://github.com/zxdxjtu/web-refactor.git
cd web-refactor

# Load the extension in Chrome developer mode
# Make your changes and test locally
```

### 🗺️ Roadmap

- [ ] **Visual Understanding**: Add image analysis capabilities for precise element targeting
- [ ] **Local Element Selection**: Click-to-modify interface for specific page elements
- [ ] **Universal Memory**: Cross-domain pattern recognition and application
- [ ] **Advanced Templates**: More sophisticated pre-built refactoring patterns
- [ ] **Performance Optimization**: Faster processing and better resource management
- [ ] **Collaboration Features**: Share configurations with the community

### 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### 🙏 Acknowledgments

- **Claude Code & Anthropic**: This project was 95% developed using Claude Code, Anthropic's AI-powered development environment
- **Open Source Community**: Thanks to all contributors and users who help improve this project
- **LLM Providers**: OpenAI and Anthropic for their powerful language models

### 📞 Support

- **Issues**: [GitHub Issues](https://github.com/zxdxjtu/web-refactor/issues)
- **Discussions**: [GitHub Discussions](https://github.com/zxdxjtu/web-refactor/discussions)

---

## 中文

**使用大语言模型智能重构网页内容，同时保留交互功能。**

Smart Web Refactor 是一个 Chrome 扩展，利用大语言模型（LLM）的强大能力，根据你的喜好定制网页布局。移除广告、清理杂乱内容、专注于重要内容 - 只需简单的自然语言命令。

### 🚀 主要特性

- **AI 驱动的内容修改**: 使用 OpenAI、Anthropic 或自定义 LLM API 智能重组网页布局
- **智能广告和杂乱内容移除**: 自动移除广告和不需要的内容，同时保留交互元素
- **域名记忆**: 为特定网站保存并自动应用你的重构偏好
- **专注模式**: 内置阅读模式、最小化布局和无广告浏览预设
- **历史记录和模板**: 访问你之前的提示词并使用常用模板
- **多语言支持**: 支持中文和英文
- **非破坏性**: 所有更改都可以一键撤销

### 📱 使用场景

- **YouTube 专注模式**: 移除推荐视频、评论和侧边栏 - 专心观看视频
- **文章阅读**: 清理新闻网站，实现无干扰阅读
- **无广告浏览**: 消除广告和推广内容
- **社交媒体清理**: 隐藏赞助帖子、推荐好友和干扰元素
- **电商简化**: 专注于产品详情，不受推广内容干扰

### 🛠 安装方法

#### 方式一：Chrome 网上应用店（即将推出）
*扩展程序即将在 Chrome 网上应用店上线。*

#### 方式二：开发者模式安装

1. **下载扩展程序**
   ```bash
   git clone https://github.com/zxdxjtu/web-refactor.git
   cd web-refactor
   ```

2. **在 Chrome 中加载**
   - 打开 Chrome 并导航到 `chrome://extensions/`
   - 启用"开发者模式"（右上角开关）
   - 点击"加载已解压的扩展程序"
   - 选择 `web-refactor` 文件夹

3. **配置 API 设置**
   - 点击工具栏中的扩展程序图标
   - 转到"设置"选项卡
   - 配置你的 LLM 提供商（OpenAI、Anthropic 或自定义）
   - 输入你的 API 密钥
   - 保存设置

### 🎯 快速开始

1. **访问任何网页**（如 YouTube、新闻网站）
2. **点击扩展程序图标**
3. **选择预设**或**输入自定义请求**：
   - "移除所有广告和推广内容"
   - "隐藏除主视频外的所有内容"
   - "清理这个页面以便阅读"
4. **点击"开始重构"**
5. **保存配置**以供将来访问此域名时使用

### ⚙️ 配置

#### 支持的 LLM 提供商
- **OpenAI**: GPT-3.5、GPT-4、GPT-4o
- **Anthropic**: Claude 3 Haiku、Sonnet、Opus
- **自定义**: 任何兼容 OpenAI 的 API 端点
- **代理支持**: 为受限网络配置代理

#### 内置模板
- **阅读模式**: 适用于文章阅读的清洁布局
- **最小化模式**: 仅显示基本内容
- **文章专注**: 优化文本内容显示
- **清除广告**: 移除广告和推广内容

### 🤝 贡献

我们欢迎贡献！以下是你可以帮助的方式：

1. **Fork 代码库**
2. **创建功能分支**: `git checkout -b feature/amazing-feature`
3. **提交更改**: `git commit -m 'Add amazing feature'`
4. **推送到分支**: `git push origin feature/amazing-feature`
5. **创建 Pull Request**

#### 开发环境设置
```bash
# 克隆代码库
git clone https://github.com/zxdxjtu/web-refactor.git
cd web-refactor

# 在 Chrome 开发者模式下加载扩展程序
# 进行更改并本地测试
```

### 🗺️ 发展路线图

- [ ] **图像理解**: 添加图像分析功能，实现精确元素定位
- [ ] **局部元素选择**: 点击修改特定页面元素的界面
- [ ] **通用记忆**: 跨域名模式识别和应用
- [ ] **高级模板**: 更复杂的预构建重构模式
- [ ] **性能优化**: 更快的处理速度和更好的资源管理
- [ ] **协作功能**: 与社区分享配置

### 📜 许可证

本项目基于 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。

### 🙏 致谢

- **Claude Code 和 Anthropic**: 本项目 95% 使用 Claude Code（Anthropic 的 AI 驱动开发环境）开发
- **开源社区**: 感谢所有帮助改进这个项目的贡献者和用户
- **LLM 提供商**: 感谢 OpenAI 和 Anthropic 提供强大的语言模型

### 📞 支持

- **问题反馈**: [GitHub Issues](https://github.com/zxdxjtu/web-refactor/issues)
- **讨论**: [GitHub Discussions](https://github.com/zxdxjtu/web-refactor/discussions)
