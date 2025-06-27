
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Github, Chrome, Sparkles, Shield, Zap, Brain, Eye, RefreshCw } from "lucide-react";

const Index = () => {
  const features = [
    {
      icon: Brain,
      title: "AI-Powered Content Modification",
      description: "使用 OpenAI、Anthropic 或自定义 LLM API 智能重组网页布局",
      image: "/placeholder.svg"
    },
    {
      icon: Shield,
      title: "Smart Ad & Clutter Removal",
      description: "自动移除广告和无用内容，同时保持交互元素完整",
      image: "/placeholder.svg"
    },
    {
      icon: Eye,
      title: "Focus Modes",
      description: "内置阅读模式、极简布局和无广告浏览预设",
      image: "/placeholder.svg"
    },
    {
      icon: RefreshCw,
      title: "Domain Memory",
      description: "保存并自动应用特定网站的重构偏好设置",
      image: "/placeholder.svg"
    }
  ];

  const useCases = [
    {
      title: "YouTube 专注模式",
      description: "移除推荐视频、评论和侧边栏，专注观看视频内容",
      tag: "视频"
    },
    {
      title: "文章阅读优化",
      description: "清理新闻网站，提供无干扰的阅读体验",
      tag: "阅读"
    },
    {
      title: "无广告浏览",
      description: "消除广告和推广内容，享受纯净浏览",
      tag: "清洁"
    },
    {
      title: "社交媒体净化",
      description: "隐藏赞助帖子、好友推荐等干扰元素",
      tag: "社交"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Sparkles className="h-8 w-8 text-indigo-600" />
            <Badge variant="secondary" className="text-sm px-4 py-1">
              AI-Powered Web Refactor
            </Badge>
          </div>
          
          <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Smart Web Refactor
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            使用大语言模型智能重构网页内容，保持交互功能的同时<br />
            移除广告、清理杂乱内容，专注于真正重要的信息
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3"
              onClick={() => window.open("https://github.com/zxdxjtu/web-refactor", "_blank")}
            >
              <Github className="mr-2 h-5 w-5" />
              查看开源代码
            </Button>
            
            <Button 
              size="lg" 
              variant="outline" 
              className="border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 px-8 py-3"
              disabled
            >
              <Chrome className="mr-2 h-5 w-5" />
              Chrome 商店 (审核中)
            </Button>
          </div>
          
          <p className="text-sm text-gray-500 mt-4">
            ⭐ 100% 本地运行 • 🔒 保护隐私 • 🚀 开源免费
          </p>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">核心功能</h2>
          <p className="text-lg text-gray-600">强大的 AI 驱动功能，让您的浏览体验更加专注</p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 mx-auto bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                  <feature.icon className="h-8 w-8 text-indigo-600" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-gray-600 leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Use Cases Section */}
      <div className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">使用场景</h2>
            <p className="text-lg text-gray-600">适用于各种网站和浏览需求</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {useCases.map((useCase, index) => (
              <Card key={index} className="border border-gray-200 hover:border-indigo-300 transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-xs">
                      {useCase.tag}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{useCase.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600">
                    {useCase.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">工作原理</h2>
          <p className="text-lg text-gray-600">三步即可开始使用</p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-indigo-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">安装扩展</h3>
              <p className="text-gray-600">从 GitHub 下载或等待 Chrome 商店上架</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-indigo-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">配置 API</h3>
              <p className="text-gray-600">设置您的 LLM API 密钥（OpenAI/Anthropic）</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-indigo-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">开始重构</h3>
              <p className="text-gray-600">输入自然语言指令，AI 自动优化页面</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-indigo-600 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="text-4xl font-bold mb-2">100%</div>
              <div className="text-indigo-200">本地运行</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">0</div>
              <div className="text-indigo-200">数据收集</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">95%</div>
              <div className="text-indigo-200">AI 开发</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">MIT</div>
              <div className="text-indigo-200">开源许可</div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">准备开始了吗？</h2>
        <p className="text-lg text-gray-600 mb-8">
          立即体验 AI 驱动的网页重构，让您的浏览更加专注高效
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            size="lg" 
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3"
            onClick={() => window.open("https://github.com/zxdxjtu/web-refactor", "_blank")}
          >
            <Github className="mr-2 h-5 w-5" />
            访问 GitHub 仓库
          </Button>
          
          <Button 
            size="lg" 
            variant="outline" 
            className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-3"
            onClick={() => window.open("https://github.com/zxdxjtu/web-refactor/blob/main/README.md", "_blank")}
          >
            <Zap className="mr-2 h-5 w-5" />
            查看文档
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-50 py-8 border-t">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-600">
            Made with ❤️ using Claude Code & Anthropic • MIT License
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Smart Web Refactor - 让网页浏览更加专注和高效
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
