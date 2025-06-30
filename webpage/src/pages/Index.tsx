import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Github, Chrome, Sparkles, Shield, Zap, Brain, Eye, RefreshCw } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const Index = () => {
  const { t } = useTranslation();

  const features = [
    {
      icon: Brain,
      titleKey: 'features.items.aiPowered.title',
      descriptionKey: 'features.items.aiPowered.description',
      image: "/placeholder.svg"
    },
    {
      icon: Shield,
      titleKey: 'features.items.adRemoval.title',
      descriptionKey: 'features.items.adRemoval.description',
      image: "/placeholder.svg"
    },
    {
      icon: Eye,
      titleKey: 'features.items.focusModes.title',
      descriptionKey: 'features.items.focusModes.description',
      image: "/placeholder.svg"
    },
    {
      icon: RefreshCw,
      titleKey: 'features.items.domainMemory.title',
      descriptionKey: 'features.items.domainMemory.description',
      image: "/placeholder.svg"
    }
  ];

  const useCases = [
    {
      titleKey: 'useCases.items.youtube.title',
      descriptionKey: 'useCases.items.youtube.description',
      tagKey: 'useCases.items.youtube.tag'
    },
    {
      titleKey: 'useCases.items.articles.title',
      descriptionKey: 'useCases.items.articles.description',
      tagKey: 'useCases.items.articles.tag'
    },
    {
      titleKey: 'useCases.items.adFree.title',
      descriptionKey: 'useCases.items.adFree.description',
      tagKey: 'useCases.items.adFree.tag'
    },
    {
      titleKey: 'useCases.items.social.title',
      descriptionKey: 'useCases.items.social.description',
      tagKey: 'useCases.items.social.tag'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <LanguageSwitcher />
      
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Sparkles className="h-8 w-8 text-indigo-600" />
            <Badge variant="secondary" className="text-sm px-4 py-1">
              {t('hero.badge')}
            </Badge>
          </div>
          
          <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
            {t('hero.title')}
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            {t('hero.description')}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3"
              onClick={() => window.open("https://github.com/zxdxjtu/web-refactor", "_blank")}
            >
              <Github className="mr-2 h-5 w-5" />
              {t('hero.githubButton')}
            </Button>
            
            <Button 
              size="lg" 
              variant="outline" 
              className="border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 px-8 py-3"
              disabled
            >
              <Chrome className="mr-2 h-5 w-5" />
              {t('hero.chromeButton')}
            </Button>
          </div>
          
          <p className="text-sm text-gray-500 mt-4">
            {t('hero.features')}
          </p>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('features.title')}</h2>
          <p className="text-lg text-gray-600">{t('features.subtitle')}</p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 mx-auto bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                  <feature.icon className="h-8 w-8 text-indigo-600" />
                </div>
                <CardTitle className="text-lg">{t(feature.titleKey)}</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-gray-600 leading-relaxed">
                  {t(feature.descriptionKey)}
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
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('useCases.title')}</h2>
            <p className="text-lg text-gray-600">{t('useCases.subtitle')}</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {useCases.map((useCase, index) => (
              <Card key={index} className="border border-gray-200 hover:border-indigo-300 transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-xs">
                      {t(useCase.tagKey)}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{t(useCase.titleKey)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600">
                    {t(useCase.descriptionKey)}
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
          <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('howItWorks.title')}</h2>
          <p className="text-lg text-gray-600">{t('howItWorks.subtitle')}</p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-indigo-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">{t('howItWorks.steps.install.title')}</h3>
              <p className="text-gray-600">{t('howItWorks.steps.install.description')}</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-indigo-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">{t('howItWorks.steps.configure.title')}</h3>
              <p className="text-gray-600">{t('howItWorks.steps.configure.description')}</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-indigo-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">{t('howItWorks.steps.refactor.title')}</h3>
              <p className="text-gray-600">{t('howItWorks.steps.refactor.description')}</p>
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
              <div className="text-indigo-200">{t('stats.local')}</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">0</div>
              <div className="text-indigo-200">{t('stats.dataCollection')}</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">95%</div>
              <div className="text-indigo-200">{t('stats.aiDevelopment')}</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">MIT</div>
              <div className="text-indigo-200">{t('stats.license')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('cta.title')}</h2>
        <p className="text-lg text-gray-600 mb-8">
          {t('cta.subtitle')}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            size="lg" 
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3"
            onClick={() => window.open("https://github.com/zxdxjtu/web-refactor", "_blank")}
          >
            <Github className="mr-2 h-5 w-5" />
            {t('cta.githubButton')}
          </Button>
          
          <Button 
            size="lg" 
            variant="outline" 
            className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-3"
            onClick={() => window.open("https://github.com/zxdxjtu/web-refactor/blob/main/README.md", "_blank")}
          >
            <Zap className="mr-2 h-5 w-5" />
            {t('cta.docsButton')}
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-50 py-8 border-t">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-600">
            {t('footer.madeWith')}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {t('footer.tagline')}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;