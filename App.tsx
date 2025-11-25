import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FeedIcon, AddIcon, MineIcon, ClockIcon, TrashIcon, RefreshIcon, LinkIcon, GlobeIcon, HeartIcon, SettingsIcon, ChevronRightIcon, ArrowLeftIcon, ChevronDownIcon } from './components/Icons';
import { Topic, FeedItem, ViewState, Language, SourceLink, AppSettings } from './types';
import { fetchTopicUpdate } from './services/geminiService';
import { 
  getStoredTopics, saveTopics, 
  getStoredFeed, saveFeed, 
  getStoredLanguage, saveLanguage,
  getStoredFavorites, saveFavorites,
  getStoredSettings, saveSettings
} from './utils/storage';

// --- Translations ---
const translations = {
  en: {
    nav: {
      feed: "For You",
      mine: "Profile"
    },
    feed: {
      title: "Discover",
      emptyTitle: "Your Feed is Empty",
      emptyDesc: "Start tracking topics to see AI-curated updates here.",
      loading: "Gathering insights...",
      noUpdates: "You're all caught up.",
      newBadge: "New",
      favorites: "Favorites"
    },
    add: {
      title: "New Tracker",
      labelQuery: "Topic to Track",
      placeholderQuery: "What do you want to know?",
      descQuery: "AI will curate the latest updates for you.",
      inspirationTitle: "Inspiration",
      btnLoading: "Creating...",
      btnStart: "Start Tracking"
    },
    mine: {
      title: "Library",
      subscriptions: "Subscriptions",
      collections: "My Favorites",
      empty: "No subscriptions yet.",
      emptyCollections: "No favorites yet.",
      dailyAt: "Daily at",
      settings: "Preferences",
      language: "Language",
      notifications: "Notifications",
      dataSources: "Sources",
      version: "Version",
      apiKeyStatus: "API Key",
      confirmDelete: "Delete this topic?",
      deleteHint: "Swipe left to delete",
      back: "Back"
    },
    settings: {
      sourcesTitle: "Sources",
      sourcesDesc: "Customize your information diet.",
    }
  },
  zh: {
    nav: {
      feed: "探索",
      mine: "我的"
    },
    feed: {
      title: "今日动态",
      emptyTitle: "暂无订阅",
      emptyDesc: "添加您感兴趣的主题，AI 将为您自动聚合。",
      loading: "AI 正在聚合全网资讯...",
      noUpdates: "暂无更多更新",
      newBadge: "刚刚",
      favorites: "我的收藏"
    },
    add: {
      title: "新建追踪",
      labelQuery: "追踪主题",
      placeholderQuery: "你想了解什么？",
      descQuery: "AI 将整合全球最新动态。",
      inspirationTitle: "灵感推荐",
      btnLoading: "创建中...",
      btnStart: "开始追踪"
    },
    mine: {
      title: "媒体库",
      subscriptions: "订阅管理",
      collections: "我的收藏",
      empty: "尚未订阅任何主题。",
      emptyCollections: "暂无收藏内容",
      dailyAt: "每日",
      settings: "偏好设置",
      language: "语言",
      notifications: "通知",
      dataSources: "信息来源",
      version: "版本",
      apiKeyStatus: "API 状态",
      confirmDelete: "确定删除此主题吗？",
      deleteHint: "向左滑动可删除",
      back: "返回"
    },
    settings: {
      sourcesTitle: "来源管理",
      sourcesDesc: "定制您的信息获取渠道。",
    }
  }
};

const ALL_SOURCES = [
  // Social Media
  { id: 'twitter', label: 'X (Twitter)' },
  { id: 'weibo', label: 'Weibo (微博)' },
  { id: 'reddit', label: 'Reddit' },
  { id: 'weixin', label: 'WeChat (公众号)' },
  // International News
  { id: 'nyt', label: 'New York Times' },
  { id: 'bbc', label: 'BBC News' },
  { id: 'cnn', label: 'CNN' },
  { id: 'bloomberg', label: 'Bloomberg' },
  { id: 'reuters', label: 'Reuters' },
  { id: 'wsj', label: 'Wall Street Journal' },
  { id: 'techcrunch', label: 'TechCrunch' },
  // Domestic/Specialized
  { id: 'zhihu', label: 'Zhihu (知乎)' },
  { id: 'bilibili', label: 'Bilibili (哔哩哔哩)' },
  { id: '36kr', label: '36Kr' },
  { id: 'toutiao', label: 'Toutiao (今日头条)' }
];

// --- Sub-components ---

// Helper to render text with inline citations [1] and Markdown links [Text](url)
const ContentRenderer = ({ content, sources }: { content: string, sources: SourceLink[] }) => {
  const lines = content.split('\n');
  const citationRegex = /\[(\d+)\]/g;
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;

  const renderLine = (text: string) => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    linkRegex.lastIndex = 0;

    while ((match = linkRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(...renderCitations(text.substring(lastIndex, match.index)));
        }
        parts.push(
            <a key={`link-${match.index}`} href={match[2]} target="_blank" rel="noopener noreferrer" className="text-ios-blue font-medium hover:underline break-all">
                {match[1]}
            </a>
        );
        lastIndex = linkRegex.lastIndex;
    }
    if (lastIndex < text.length) {
        parts.push(...renderCitations(text.substring(lastIndex)));
    }
    return parts.length > 0 ? parts : renderCitations(text);
  };

  const renderCitations = (subText: string) => {
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;
      let match;
      citationRegex.lastIndex = 0;

      while ((match = citationRegex.exec(subText)) !== null) {
          if (match.index > lastIndex) {
              parts.push(subText.substring(lastIndex, match.index));
          }
          const num = parseInt(match[1]);
          const sourceIndex = num - 1; 
          const source = sources[sourceIndex] || sources[0]; 

          if (source) {
            parts.push(
                <sup key={`cite-${match.index}`} className="mx-0.5 align-super">
                <a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-4 h-4 text-[9px] font-bold text-ios-blue bg-blue-50/80 rounded-full hover:bg-blue-100 no-underline cursor-pointer transition-colors" title={source.title}>
                    {num}
                </a>
                </sup>
            );
          } else {
              parts.push(match[0]);
          }
          lastIndex = citationRegex.lastIndex;
      }
      if (lastIndex < subText.length) {
          parts.push(subText.substring(lastIndex));
      }
      return parts;
  };

  return (
    <div className="text-[15px] leading-7 text-gray-800 tracking-normal font-normal">
      {lines.map((line, i) => {
        if (line.trim() === '') return <div key={i} className="h-3"></div>;
        return <p key={i} className="mb-0">{renderLine(line)}</p>;
      })}
    </div>
  );
};

// 1. Navigation Bar
const BottomNav = ({ currentView, setView, lang }: { currentView: ViewState; setView: (v: ViewState) => void, lang: Language }) => {
  const t = translations[lang].nav;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-gray-200/50 pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around items-center px-6 h-[60px]">
            <button 
                onClick={() => setView('feed')}
                className={`flex flex-col items-center justify-center space-y-1 w-20 transition-all duration-300 ${currentView === 'feed' ? 'text-black' : 'text-gray-400 hover:text-gray-500'}`}
            >
                <FeedIcon className={`w-6 h-6 transition-transform duration-300 ${currentView === 'feed' ? 'scale-110' : ''}`} />
                <span className="text-[10px] font-medium tracking-wide">{t.feed}</span>
            </button>

            <button 
                onClick={() => setView('add')}
                className="group relative -top-5"
            >
                <div className="absolute inset-0 bg-black rounded-full shadow-lg opacity-90 blur-sm group-active:scale-95 transition-transform duration-200"></div>
                <div className="relative bg-black text-white w-14 h-14 rounded-full flex items-center justify-center shadow-2xl group-active:scale-95 transition-transform duration-200">
                     <AddIcon className="w-7 h-7" />
                </div>
            </button>

            <button 
                onClick={() => setView('mine')}
                className={`flex flex-col items-center justify-center space-y-1 w-20 transition-all duration-300 ${currentView === 'mine' ? 'text-black' : 'text-gray-400 hover:text-gray-500'}`}
            >
                <MineIcon className={`w-6 h-6 transition-transform duration-300 ${currentView === 'mine' ? 'scale-110' : ''}`} />
                <span className="text-[10px] font-medium tracking-wide">{t.mine}</span>
            </button>
        </div>
    </div>
  );
};

// Feed Card Component
const FeedCard: React.FC<{ 
    item: FeedItem; 
    lang: Language; 
    onClick: () => void;
    onToggleFavorite: () => void;
    isFavorite: boolean;
}> = ({ 
    item, 
    lang, 
    onClick, 
    onToggleFavorite,
    isFavorite
}) => {
    const t = translations[lang].feed;
    const [imgError, setImgError] = useState(false);

    const formatTime = (ts: number) => {
        const date = new Date(ts);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        if (diff < 24 * 60 * 60 * 1000) {
            return date.toLocaleTimeString(lang === 'zh' ? 'zh-CN' : 'en-US', { hour: '2-digit', minute: '2-digit' });
        }
        return date.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' });
    };

    // Improved Image URL: Editorial style + fallback
    const displayImage = imgError 
        ? null 
        : (item.imageUrl || `https://image.pollinations.ai/prompt/editorial%20photo%20journalism%20${encodeURIComponent(item.topicQuery)}?width=800&height=400&nologo=true`);

    // Deterministic gradient based on ID
    const getGradientClass = (id: string) => {
        const gradients = [
            "bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500",
            "bg-gradient-to-br from-blue-600 via-indigo-500 to-violet-500",
            "bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500",
            "bg-gradient-to-br from-orange-500 via-red-500 to-pink-600",
            "bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900"
        ];
        let hash = 0;
        for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
        return gradients[Math.abs(hash) % gradients.length];
    };

    return (
        <article 
            className="bg-white rounded-[2rem] shadow-soft mb-6 overflow-hidden transition-all duration-300 transform backface-hidden select-none hover:shadow-float"
            onClick={onClick}
        >
            {/* Cover Image */}
            <div className="h-52 w-full bg-gray-100 relative overflow-hidden">
                {displayImage ? (
                    <img 
                        src={displayImage} 
                        alt={item.topicQuery}
                        className={`w-full h-full object-cover transition-all duration-700 ${item.isRead ? 'opacity-90 grayscale-[20%]' : 'hover:scale-105'}`}
                        loading="lazy"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <div className={`w-full h-full ${getGradientClass(item.id)} flex flex-col items-center justify-center p-6 text-center`}>
                        <GlobeIcon className="w-12 h-12 text-white/90 mb-2 drop-shadow-md" />
                        <span className="text-white/80 font-bold tracking-widest text-[10px] uppercase border border-white/30 px-2 py-1 rounded-md backdrop-blur-sm">
                            InfoPulse AI
                        </span>
                    </div>
                )}
                
                {/* Refined Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6 pointer-events-none">
                    <div className="flex justify-between items-end w-full">
                         <h3 className="text-white font-bold text-xl leading-tight tracking-tight drop-shadow-sm pr-4 line-clamp-2">
                            {item.topicQuery}
                        </h3>
                    </div>
                </div>
                 
                {/* Favorite Button (Visible interaction point) */}
                <div className="absolute top-4 right-4 z-20 pointer-events-auto" onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}>
                    <div className={`p-2.5 rounded-full backdrop-blur-md transition-all duration-300 ${isFavorite ? 'bg-white shadow-lg scale-110' : 'bg-black/20 hover:bg-black/30'}`}>
                        <HeartIcon 
                            className={`w-5 h-5 transition-colors duration-300 ${isFavorite ? 'text-red-500' : 'text-white'}`} 
                            fill={isFavorite} 
                        />
                    </div>
                </div>
            </div>

            <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center space-x-2">
                        <span className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase flex items-center bg-gray-50 px-2 py-1 rounded-md">
                            <ClockIcon className="w-3 h-3 mr-1.5" />
                            {formatTime(item.timestamp)}
                        </span>
                    </div>
                    {!item.isRead && (
                         <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md shadow-blue-200">
                            {t.newBadge}
                        </span>
                    )}
                </div>
                
                <div className={`transition-opacity duration-300 ${item.isRead ? 'opacity-80' : 'opacity-100'}`}>
                    <ContentRenderer content={item.content} sources={item.sources} />
                </div>
            </div>
        </article>
    );
};

const ThinkingProcess = ({ lang }: { lang: Language }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const steps = lang === 'zh' ? [
    "正在初始化智能代理...",
    "正在连接全球资讯网络...",
    "正在深度检索相关动态...",
    "正在阅读并分析多源信息...",
    "正在进行交叉验证...",
    "正在生成智能摘要报告..."
  ] : [
    "Initializing AI agent...",
    "Connecting to global news network...",
    "Deep searching for updates...",
    "Reading and analyzing sources...",
    "Cross-referencing facts...",
    "Generating intelligence summary..."
  ];

  useEffect(() => {
    setCurrentStep(0);
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev < steps.length - 1) return prev + 1;
        return prev;
      });
    }, 1200);
    return () => clearInterval(interval);
  }, [lang]);

  // Auto-scroll to the bottom of the log
  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentStep]);

  return (
    <div className="mb-6 mx-1 bg-white rounded-2xl shadow-soft border border-blue-50 overflow-hidden animate-fade-in">
        <div className="bg-blue-50/50 px-4 py-3 flex items-center justify-between border-b border-blue-100/30">
             <div className="flex items-center space-x-2">
                 <div className="relative flex h-3 w-3">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                   <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                 </div>
                 <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                    {lang === 'zh' ? 'AI 思考中' : 'AI Processing'}
                 </span>
             </div>
             <div className="text-[10px] font-mono text-blue-400">
                {Math.min((currentStep + 1) / steps.length * 100, 99).toFixed(0)}%
             </div>
        </div>
        
        {/* Constrained height to approx 3 lines (around 80-90px) with auto-scroll */}
        <div 
            ref={scrollRef}
            className="p-4 bg-white h-[90px] overflow-y-auto scroll-smooth flex flex-col"
        >
            <div className="space-y-2">
                {steps.map((step, index) => {
                    if (index > currentStep) return null;
                    const isCurrent = index === currentStep;
                    return (
                        <div key={index} className={`flex items-start space-x-3 text-sm transition-all duration-500 ${isCurrent ? 'opacity-100 translate-x-0' : 'opacity-50'}`}>
                            <div className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${isCurrent ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'}`} />
                            <span className={`${isCurrent ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
                                {step}
                            </span>
                        </div>
                    )
                })}
            </div>
        </div>
    </div>
  );
};

// 2. Feed Page
const FeedView = ({ 
  feed, 
  topics, 
  onRefresh, 
  isRefreshing,
  lang,
  onItemClick,
  toggleFavorite,
  favorites
}: { 
  feed: FeedItem[]; 
  topics: Topic[];
  onRefresh: () => void; 
  isRefreshing: boolean;
  lang: Language;
  onItemClick: (id: string) => void;
  toggleFavorite: (item: FeedItem) => void;
  favorites: FeedItem[];
}) => {
  const t = translations[lang].feed;

  if (topics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[75vh] text-center px-8 animate-fade-in">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <GlobeIcon className="w-8 h-8 text-gray-400 opacity-80" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">{t.emptyTitle}</h2>
        <p className="text-gray-500 leading-relaxed max-w-xs mx-auto">{t.emptyDesc}</p>
      </div>
    );
  }

  return (
    <div className="pb-28 pt-6 px-5 max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-6 px-1">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{t.title}</h1>
        <button 
          onClick={onRefresh} 
          disabled={isRefreshing}
          className={`p-2.5 rounded-full bg-white shadow-sm border border-gray-100 text-gray-500 hover:text-black hover:shadow-md transition-all active:scale-95 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`}
        >
          <RefreshIcon className="w-5 h-5" />
        </button>
      </div>

      {isRefreshing && (
        <ThinkingProcess lang={lang} />
      )}

      {feed.length === 0 && !isRefreshing && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-sm font-medium">{t.noUpdates}</p>
        </div>
      )}

      {feed.map((item) => (
        <FeedCard 
            key={item.id} 
            item={item} 
            lang={lang} 
            onClick={() => onItemClick(item.id)}
            onToggleFavorite={() => toggleFavorite(item)}
            isFavorite={favorites.some(f => f.id === item.id)}
        />
      ))}
    </div>
  );
};

// 3. Add Page
const AddTopicView = ({ onAdd, lang }: { onAdd: (topic: Topic) => void, lang: Language }) => {
  const t = translations[lang].add;
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('');

  // Inspiration Data
  const RECOMMENDATIONS = {
      en: {
        "Tech": ["Generative AI Trends", "SpaceX Starship Updates", "Apple Product Rumors", "Cybersecurity Threats", "Quantum Computing"],
        "Finance": ["Global Stock Markets", "Cryptocurrency Regulation", "Fed Interest Rates", "Emerging Markets", "Real Estate Trends"],
        "Science": ["Climate Change Research", "Space Exploration", "Medical Breakthroughs", "Neuroscience", "Renewable Energy"],
        "Lifestyle": ["Minimalist Living", "Digital Nomad Tips", "Healthy Recipes", "Meditation Practices", "Travel Deals"]
      },
      zh: {
        "科技": ["生成式 AI 趋势", "SpaceX 星舰进展", "苹果新品爆料", "网络安全动态", "量子计算进展"],
        "金融": ["全球股市行情", "加密货币监管", "美联储加息政策", "新兴市场投资", "房地产市场分析"],
        "科学": ["气候变化研究", "太空探索最新消息", "医学重大突破", "脑科学新发现", "可再生能源"],
        "生活": ["极简主义生活", "数字游民指南", "健康食谱推荐", "冥想与正念", "特价旅行"]
      }
  };

  const categories = Object.keys(RECOMMENDATIONS[lang]);
  
  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
        setActiveCategory(categories[0]);
    }
  }, [lang, categories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setTimeout(() => {
      const newTopic: Topic = {
        id: crypto.randomUUID(),
        query: query.trim(),
        scheduleTime: "08:00", // Default value since we removed user input
        createdAt: Date.now()
      };
      onAdd(newTopic);
      setLoading(false);
    }, 600);
  };

  return (
    // Fixed height container to manage internal scrolling.
    // h-[calc(100vh-140px)] accounts for Header (approx 60px) and BottomNav (approx 80px)
    <div className="flex flex-col h-[calc(100vh-140px)] px-6 pt-6 max-w-lg mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6 shrink-0 tracking-tight">{t.title}</h1>
      
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
        <div className="space-y-3 mb-6 shrink-0">
          <label className="block text-sm font-semibold text-gray-900 ml-1">{t.labelQuery}</label>
          <div className="relative group">
            <textarea 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.placeholderQuery}
                className="w-full p-5 rounded-3xl border-0 bg-white shadow-soft text-lg text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none h-32 transition-shadow"
            />
          </div>
          <p className="text-xs text-gray-500 ml-2 font-medium">{t.descQuery}</p>
        </div>

        {/* Inspiration Section: Flex-1 to fill space, overflow-y-auto to scroll internally */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
             <h3 className="text-sm font-semibold text-gray-900 ml-1 mb-4 flex items-center shrink-0">
                <span className="bg-yellow-100 text-yellow-700 p-1 rounded-md mr-2">
                    <GlobeIcon className="w-3 h-3" />
                </span>
                {t.inspirationTitle}
             </h3>
             
             {/* Categories Tabs */}
             <div className="flex space-x-2 overflow-x-auto pb-4 scrollbar-hide px-1 shrink-0">
                 {categories.map(cat => (
                     <button
                        key={cat}
                        type="button"
                        onClick={() => setActiveCategory(cat)}
                        className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-300 ${activeCategory === cat ? 'bg-black text-white shadow-md transform scale-105' : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'}`}
                     >
                         {cat}
                     </button>
                 ))}
             </div>

             {/* Topic Chips List: Scrollable Area */}
             <div className="flex-1 overflow-y-auto px-1 pb-2 scrollbar-hide">
                <div className="grid grid-cols-1 gap-3">
                    {activeCategory && (RECOMMENDATIONS[lang] as any)[activeCategory]?.map((topic: string) => (
                        <button
                            key={topic}
                            type="button"
                            onClick={() => setQuery(topic)}
                            className="text-left px-5 py-3 bg-white rounded-xl border border-gray-50 shadow-sm hover:shadow-md transition-all active:scale-[0.98] group flex justify-between items-center"
                        >
                            <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">{topic}</span>
                            <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <AddIcon className="w-3 h-3 text-blue-500" />
                            </div>
                        </button>
                    ))}
                </div>
             </div>
        </div>

        {/* Button: Fixed at bottom of this container, not sticky over content */}
        <div className="pt-4 pb-2 shrink-0 bg-transparent">
          <button 
            type="submit"
            disabled={!query.trim() || loading}
            className={`w-full py-4 rounded-full text-white font-semibold text-lg shadow-xl shadow-blue-500/20 transition-all transform active:scale-[0.98] ${!query.trim() ? 'bg-gray-300 shadow-none cursor-not-allowed text-gray-500' : 'bg-black hover:bg-gray-900'}`}
          >
            {loading ? t.btnLoading : t.btnStart}
          </button>
        </div>
      </form>
    </div>
  );
};

// 4. Mine View
const SwipeableTopicItem: React.FC<{ topic: Topic, onDelete: (id: string) => void, lang: Language }> = ({ topic, onDelete, lang }) => {
    const [offsetX, setOffsetX] = useState(0);
    const startX = useRef(0);
    const isDragging = useRef(false);

    const handleTouchStart = (e: React.TouchEvent) => {
        startX.current = e.touches[0].clientX;
        isDragging.current = true;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging.current) return;
        const currentX = e.touches[0].clientX;
        const diff = currentX - startX.current;
        if (diff < 0) {
            setOffsetX(Math.max(diff, -100));
        }
    };

    const handleTouchEnd = () => {
        isDragging.current = false;
        if (offsetX < -60) {
            if (window.confirm(translations[lang].mine.confirmDelete)) {
                onDelete(topic.id);
            }
            setOffsetX(0);
        } else {
            setOffsetX(0);
        }
    };

    return (
        <div className="relative overflow-hidden mb-0 first:rounded-t-2xl last:rounded-b-2xl">
            <div className="absolute inset-y-0 right-0 w-24 bg-red-500 flex items-center justify-center text-white font-medium z-0">
                <TrashIcon className="w-5 h-5" />
            </div>
            <div 
                className="bg-white p-5 relative z-10 border-b border-gray-100/80 flex justify-between items-center transition-transform duration-300 ease-out active:bg-gray-50"
                style={{ transform: `translateX(${offsetX}px)` }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <div className="flex-1 pr-4">
                    <h3 className="font-semibold text-gray-900 text-[15px]">{topic.query}</h3>
                    {/* Removed time display here as well since we removed input */}
                    <div className="flex items-center text-xs text-gray-400 mt-1 font-medium">
                        <span className="bg-gray-100 px-2 py-0.5 rounded text-[10px]">Auto-Update</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Favorites List Sub-Page
const FavoritesListView = ({ 
    favorites, 
    onBack, 
    lang, 
    onToggleFavorite 
}: { 
    favorites: FeedItem[], 
    onBack: () => void, 
    lang: Language, 
    onToggleFavorite: (item: FeedItem) => void 
}) => {
    const t = translations[lang].mine;
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const toggleExpand = (id: string) => {
        setExpandedId(prev => prev === id ? null : id);
    };

    return (
        <div className="p-0 max-w-lg mx-auto min-h-screen bg-white">
            <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-gray-200 px-4 h-14 flex items-center">
                <button onClick={onBack} className="flex items-center text-blue-600 font-medium -ml-2 p-2 active:opacity-60">
                    <ArrowLeftIcon className="w-5 h-5 mr-1" />
                    {t.back}
                </button>
                <h1 className="absolute left-1/2 transform -translate-x-1/2 font-bold text-gray-900 text-lg">
                    {t.collections}
                </h1>
            </div>
            
            <div className="p-4 pb-28 space-y-4 bg-[#F2F2F7] min-h-screen pt-6">
                {favorites.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">
                        <HeartIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>{t.emptyCollections}</p>
                    </div>
                ) : (
                    favorites.map(item => (
                        <div key={item.id} className="bg-white rounded-2xl shadow-sm overflow-hidden transition-all duration-300">
                            {/* Header / Summary Row */}
                            <div 
                                onClick={() => toggleExpand(item.id)}
                                className="p-4 flex gap-4 items-center active:bg-gray-50 cursor-pointer"
                            >
                                <img 
                                    src={item.imageUrl} 
                                    className="w-16 h-16 rounded-xl object-cover bg-gray-100 flex-shrink-0" 
                                    alt="" 
                                    onError={(e) => (e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxIDEiPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNlNTViNzYiLz48L3N2Zz4=')}
                                />
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-gray-900 text-[15px] leading-snug line-clamp-2">{item.topicQuery}</h4>
                                    <div className="flex items-center mt-1.5 space-x-2">
                                        <span className="text-xs text-gray-400">{new Date(item.timestamp).toLocaleDateString()}</span>
                                        {expandedId === item.id && <span className="text-xs text-blue-500 font-medium">Reading</span>}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end space-y-2">
                                     <button 
                                        onClick={(e) => { e.stopPropagation(); onToggleFavorite(item); }}
                                        className="p-1.5 rounded-full bg-red-50 text-red-500"
                                     >
                                         <HeartIcon className="w-4 h-4" fill />
                                     </button>
                                     <ChevronDownIcon className={`w-4 h-4 text-gray-300 transition-transform duration-300 ${expandedId === item.id ? 'rotate-180' : ''}`} />
                                </div>
                            </div>

                            {/* Expanded Content */}
                            {expandedId === item.id && (
                                <div className="px-5 pb-6 pt-2 border-t border-gray-100 bg-gray-50/30 animate-fade-in">
                                    <ContentRenderer content={item.content} sources={item.sources} />
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

const MineView = ({ 
  topics, 
  onDelete, 
  lang, 
  setLanguage,
  favorites,
  onToggleFavorite,
  settings,
  onSaveSettings
}: { 
  topics: Topic[]; 
  onDelete: (id: string) => void; 
  lang: Language;
  setLanguage: (l: Language) => void;
  favorites: FeedItem[];
  onToggleFavorite: (item: FeedItem) => void;
  settings: AppSettings;
  onSaveSettings: (s: AppSettings) => void;
}) => {
  const t = translations[lang].mine;
  const [showSources, setShowSources] = useState(false);
  const [subView, setSubView] = useState<'main' | 'favorites'>('main');

  const toggleSource = (sourceId: string) => {
    const currentExcluded = settings.excludedSources;
    let newExcluded;
    if (currentExcluded.includes(sourceId)) {
        newExcluded = currentExcluded.filter(id => id !== sourceId);
    } else {
        newExcluded = [...currentExcluded, sourceId];
    }
    onSaveSettings({ ...settings, excludedSources: newExcluded });
  };

  if (subView === 'favorites') {
      return <FavoritesListView favorites={favorites} onBack={() => setSubView('main')} lang={lang} onToggleFavorite={onToggleFavorite} />;
  }

  return (
    <div className="p-6 pb-28 pt-8 max-w-lg mx-auto animate-fade-in">
      <h1 className="text-3xl font-bold text-gray-900 mb-8 tracking-tight">{t.title}</h1>

      {/* 1. Favorites Entry Point */}
      <section className="mb-10">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 ml-2">
            {t.collections}
        </h2>
        <div 
            onClick={() => setSubView('favorites')}
            className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all hover:shadow-md"
        >
            <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                    <HeartIcon className="w-5 h-5" fill />
                </div>
                <span className="font-semibold text-gray-900">{t.collections}</span>
            </div>
            <div className="flex items-center space-x-2">
                <span className="text-gray-400 text-sm font-medium">{favorites.length}</span>
                <ChevronRightIcon className="w-5 h-5 text-gray-300" />
            </div>
        </div>
      </section>

      {/* 2. Subscriptions Section (iOS List Style) */}
      <section className="mb-10">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 ml-2">
            {t.subscriptions}
        </h2>
        
        <div className="shadow-sm rounded-2xl overflow-hidden bg-white">
            {topics.length === 0 ? (
                <div className="text-center text-gray-400 py-6">
                    <p className="text-sm">{t.empty}</p>
                </div>
            ) : (
                topics.map((topic) => (
                    <SwipeableTopicItem key={topic.id} topic={topic} onDelete={onDelete} lang={lang} />
                ))
            )}
        </div>
        {topics.length > 0 && <p className="text-[10px] text-gray-400 mt-2 text-right mr-2">{t.deleteHint}</p>}
      </section>

      {/* 3. Settings Section */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 ml-2">{t.settings}</h2>
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
            
            {/* Language */}
            <div className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                <span className="text-[15px] text-gray-900 font-medium">{t.language}</span>
                <div className="flex bg-gray-100/80 rounded-lg p-1">
                    <button onClick={() => setLanguage('en')} className={`px-3 py-1 rounded-[6px] text-xs font-semibold transition-all ${lang === 'en' ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}>EN</button>
                    <button onClick={() => setLanguage('zh')} className={`px-3 py-1 rounded-[6px] text-xs font-semibold transition-all ${lang === 'zh' ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}>中文</button>
                </div>
            </div>

            {/* Source Management */}
            <div className="p-0">
                <button 
                    onClick={() => setShowSources(!showSources)}
                    className="w-full p-4 flex justify-between items-center text-left hover:bg-gray-50 transition-colors"
                >
                    <span className="text-[15px] text-gray-900 font-medium">{t.dataSources}</span>
                    <span className="text-xs text-ios-blue font-medium">{showSources ? 'Done' : 'Edit'}</span>
                </button>
                
                {showSources && (
                    <div className="bg-gray-50/50 p-4 space-y-3 border-t border-gray-100/50 animate-fade-in">
                        <p className="text-xs text-gray-500 mb-3 ml-1">{translations[lang].settings.sourcesDesc}</p>
                        {ALL_SOURCES.map(source => (
                            <label key={source.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 cursor-pointer active:scale-[0.99] transition-transform">
                                <span className="text-sm font-medium text-gray-800">{source.label}</span>
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${!settings.excludedSources.includes(source.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-300 bg-white'}`}>
                                    {!settings.excludedSources.includes(source.id) && <span className="text-white text-xs">✓</span>}
                                </div>
                                <input 
                                    type="checkbox" 
                                    className="hidden"
                                    checked={!settings.excludedSources.includes(source.id)}
                                    onChange={() => toggleSource(source.id)}
                                />
                            </label>
                        ))}
                    </div>
                )}
            </div>

            <div className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                <span className="text-[15px] text-gray-900 font-medium">{t.apiKeyStatus}</span>
                <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${process.env.API_KEY ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-xs text-gray-400">{process.env.API_KEY ? 'Active' : 'Missing'}</span>
                </div>
            </div>
             <div className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                <span className="text-[15px] text-gray-900 font-medium">{t.version}</span>
                <span className="text-xs text-gray-400 font-mono">v1.3.1</span>
            </div>
        </div>
      </section>
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  const [view, setView] = useState<ViewState>('feed');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [favorites, setFavorites] = useState<FeedItem[]>([]);
  const [settings, setAppStateSettings] = useState<AppSettings>({ excludedSources: [] });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [language, setLanguage] = useState<Language>('zh'); 

  // Load Initial Data
  useEffect(() => {
    setTopics(getStoredTopics());
    setFeed(getStoredFeed());
    setFavorites(getStoredFavorites());
    setAppStateSettings(getStoredSettings());
    setLanguage(getStoredLanguage());
  }, []);

  // Save Data on Change
  useEffect(() => { saveTopics(topics); }, [topics]);
  useEffect(() => { saveFeed(feed); }, [feed]);
  useEffect(() => { saveFavorites(favorites); }, [favorites]);
  useEffect(() => { saveSettings(settings); }, [settings]);
  
  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    saveLanguage(lang);
  };

  const handleAddTopic = (topic: Topic) => {
    setTopics(prev => [topic, ...prev]);
    setView('feed');
    setTimeout(() => refreshFeed([topic]), 500);
  };

  const handleDeleteTopic = (id: string) => {
      setTopics(prev => prev.filter(t => t.id !== id));
      setFeed(prev => prev.filter(f => f.topicId !== id));
  };

  const handleToggleFavorite = (item: FeedItem) => {
    setFavorites(prev => {
        const exists = prev.find(f => f.id === item.id);
        if (exists) {
            return prev.filter(f => f.id !== item.id);
        } else {
            const itemToSave = { ...item, isFavorite: true };
            if (!itemToSave.imageUrl) {
                 itemToSave.imageUrl = `https://image.pollinations.ai/prompt/editorial%20photo%20journalism%20${encodeURIComponent(item.topicQuery)}?width=800&height=400&nologo=true`;
            }
            return [itemToSave, ...prev];
        }
    });
  };

  const handleItemClick = (id: string) => {
      setFeed(prev => prev.map(item => 
          item.id === id ? { ...item, isRead: true } : item
      ));
  };

  const refreshFeed = useCallback(async (topicsToUpdate: Topic[] = topics) => {
    if (topicsToUpdate.length === 0) return;
    setIsRefreshing(true);
    
    const promises = topicsToUpdate.map(async (topic) => {
        const result = await fetchTopicUpdate(topic.query, language, settings.excludedSources);
        // Use a more descriptive prompt for Pollinations AI to get better news-like images
        const imageUrl = `https://image.pollinations.ai/prompt/editorial%20photo%20journalism%20${encodeURIComponent(topic.query)}?width=800&height=400&nologo=true&seed=${Date.now()}`;

        const newItem: FeedItem = {
            id: crypto.randomUUID(),
            topicId: topic.id,
            topicQuery: topic.query,
            content: result.text,
            sources: result.sources,
            timestamp: Date.now(),
            isRead: false,
            imageUrl: imageUrl
        };
        return newItem;
    });

    try {
        const newItems = await Promise.all(promises);
        setFeed(prev => {
            const updated = [...newItems, ...prev];
            return updated.sort((a, b) => b.timestamp - a.timestamp);
        });
    } catch (e) {
        console.error("Failed to refresh feed", e);
    } finally {
        setIsRefreshing(false);
    }
  }, [topics, language, settings]);

  // Main Render Switch
  const renderContent = () => {
    switch (view) {
      case 'add':
        return <AddTopicView onAdd={handleAddTopic} lang={language} />;
      case 'mine':
        return <MineView 
            topics={topics} 
            onDelete={handleDeleteTopic} 
            lang={language} 
            setLanguage={handleSetLanguage}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            settings={settings}
            onSaveSettings={setAppStateSettings}
        />;
      case 'feed':
      default:
        return <FeedView 
          feed={feed} 
          topics={topics}
          onRefresh={() => refreshFeed(topics)} 
          isRefreshing={isRefreshing} 
          lang={language}
          onItemClick={handleItemClick}
          toggleFavorite={handleToggleFavorite}
          favorites={favorites}
        />;
    }
  };

  return (
    <div className="bg-[#F2F2F7] min-h-[100dvh] text-slate-900 font-sans mx-auto relative overflow-hidden selection:bg-blue-100">
      {/* Header - Transparent Blur Style */}
      <div className="sticky top-0 z-40 px-6 py-3 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 transition-all">
        <div className="flex items-center justify-between max-w-lg mx-auto">
            <div className="flex items-center space-x-3">
                 <div className="text-blue-600">
                    <GlobeIcon className="w-6 h-6" />
                 </div>
                <span className="text-lg font-bold tracking-tight text-gray-900">
                    InfoPulse <span className="font-normal text-gray-400">AI</span>
                </span>
            </div>
        </div>
      </div>

      <main className="min-h-screen">
        {renderContent()}
      </main>

      <BottomNav currentView={view} setView={setView} lang={language} />
    </div>
  );
}