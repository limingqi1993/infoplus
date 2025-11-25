import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FeedIcon, AddIcon, MineIcon, ClockIcon, TrashIcon, RefreshIcon, LinkIcon, GlobeIcon, HeartIcon, SettingsIcon } from './components/Icons';
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
      title: "New Topic",
      labelQuery: "Topic of Interest",
      placeholderQuery: "e.g., SpaceX, Generative AI...",
      descQuery: "We'll curate sources from Global News & Social Media.",
      labelTime: "Daily Summary",
      descTime: "Delivery time for your digest.",
      btnLoading: "Creating...",
      btnStart: "Track Topic"
    },
    mine: {
      title: "Library",
      subscriptions: "Subscriptions",
      collections: "Collections",
      empty: "No subscriptions yet.",
      emptyCollections: "Saved articles will appear here.",
      dailyAt: "Daily at",
      settings: "Preferences",
      language: "Language",
      notifications: "Notifications",
      dataSources: "Sources",
      version: "Version",
      apiKeyStatus: "API Key",
      confirmDelete: "Delete this topic?",
      deleteHint: "Swipe left to delete"
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
      favorites: "收藏夹"
    },
    add: {
      title: "新建追踪",
      labelQuery: "感兴趣的主题",
      placeholderQuery: "例如：SpaceX 星舰，人工智能趋势...",
      descQuery: "AI 将整合全球新闻媒体与社交网络的信息。",
      labelTime: "推送时间",
      descTime: "我们将在该时段为您生成日报。",
      btnLoading: "创建中...",
      btnStart: "开始追踪"
    },
    mine: {
      title: "媒体库",
      subscriptions: "订阅管理",
      collections: "我的收藏",
      empty: "尚未订阅任何主题。",
      emptyCollections: "您收藏的文章将显示在这里。",
      dailyAt: "每日",
      settings: "偏好设置",
      language: "语言",
      notifications: "通知",
      dataSources: "信息来源",
      version: "版本",
      apiKeyStatus: "API 状态",
      confirmDelete: "确定删除此主题吗？",
      deleteHint: "向左滑动可删除"
    },
    settings: {
      sourcesTitle: "来源管理",
      sourcesDesc: "定制您的信息获取渠道。",
    }
  }
};

const ALL_SOURCES = [
  { id: 'twitter', label: 'X (Twitter)' },
  { id: 'weibo', label: 'Weibo (微博)' },
  { id: 'reddit', label: 'Reddit' },
  { id: 'weixin', label: 'WeChat (公众号)' }
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

// 1. Navigation Bar (Refined for Apple/Google Style)
const BottomNav = ({ currentView, setView, lang }: { currentView: ViewState; setView: (v: ViewState) => void, lang: Language }) => {
  const t = translations[lang].nav;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
        {/* Blur container */}
        <div className="absolute inset-0 bg-white/80 backdrop-blur-xl border-t border-gray-200/50" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}></div>
        
        <div className="relative flex justify-around items-center px-6 h-[60px] pb-[env(safe-area-inset-bottom)] box-content">
            <button 
                onClick={() => setView('feed')}
                className={`flex flex-col items-center justify-center space-y-1 w-20 transition-all duration-300 ${currentView === 'feed' ? 'text-black' : 'text-gray-400 hover:text-gray-500'}`}
            >
                <FeedIcon className={`w-6 h-6 transition-transform duration-300 ${currentView === 'feed' ? 'scale-110' : ''}`} />
                <span className="text-[10px] font-medium tracking-wide">{t.feed}</span>
            </button>

            {/* Center Primary Action - Sleek & Integrated */}
            <button 
                onClick={() => setView('add')}
                className="group relative -top-4"
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

// Feed Card Component (Softer shadows, larger radius)
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
    const formatTime = (ts: number) => {
        const date = new Date(ts);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        
        // Simple relative time for recent items
        if (diff < 24 * 60 * 60 * 1000) {
            return date.toLocaleTimeString(lang === 'zh' ? 'zh-CN' : 'en-US', { hour: '2-digit', minute: '2-digit' });
        }
        return date.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' });
    };

    // Long press logic
    const [pressTimer, setPressTimer] = useState<number | any>(null);
    const [isPressed, setIsPressed] = useState(false);

    const handleTouchStart = () => {
        setIsPressed(true);
        const timer = setTimeout(() => {
            onToggleFavorite();
            if (navigator.vibrate) navigator.vibrate(50);
        }, 800);
        setPressTimer(timer);
    };

    const handleTouchEnd = () => {
        setIsPressed(false);
        if (pressTimer) clearTimeout(pressTimer);
    };

    return (
        <article 
            className={`bg-white rounded-[2rem] shadow-soft mb-6 overflow-hidden transition-all duration-300 transform backface-hidden ${isPressed ? 'scale-[0.98]' : 'hover:shadow-float'}`}
            onClick={onClick}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleTouchStart}
            onMouseUp={handleTouchEnd}
            onMouseLeave={handleTouchEnd}
        >
            {/* Cover Image */}
            <div className="h-52 w-full bg-gray-100 relative overflow-hidden">
                <img 
                    src={item.imageUrl || `https://image.pollinations.ai/prompt/${encodeURIComponent(item.topicQuery)}?width=800&height=400&nologo=true`} 
                    alt={item.topicQuery}
                    className={`w-full h-full object-cover transition-all duration-700 ${item.isRead ? 'opacity-90 grayscale-[20%]' : 'hover:scale-105'}`}
                    loading="lazy"
                />
                {/* Refined Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6">
                    <div className="flex justify-between items-end w-full">
                         <h3 className="text-white font-bold text-xl leading-tight tracking-tight drop-shadow-sm pr-4">
                            {item.topicQuery}
                        </h3>
                         {isFavorite && (
                            <div className="bg-white/20 backdrop-blur-md p-2 rounded-full">
                                <HeartIcon className="text-white w-4 h-4 fill-current" fill />
                            </div>
                         )}
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
        <div className="mb-6 bg-white/50 backdrop-blur-sm border border-blue-100/50 text-blue-700 px-4 py-3 rounded-2xl flex items-center justify-center animate-pulse shadow-sm">
          <span className="text-sm font-medium tracking-wide">{t.loading}</span>
        </div>
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
  const [time, setTime] = useState('07:00');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setTimeout(() => {
      const newTopic: Topic = {
        id: crypto.randomUUID(),
        query: query.trim(),
        scheduleTime: time,
        createdAt: Date.now()
      };
      onAdd(newTopic);
      setLoading(false);
    }, 600);
  };

  return (
    <div className="p-6 pb-28 h-full flex flex-col pt-8 max-w-lg mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8 tracking-tight">{t.title}</h1>
      
      <form onSubmit={handleSubmit} className="flex-1 space-y-8">
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-gray-900 ml-1">{t.labelQuery}</label>
          <div className="relative group">
            <textarea 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.placeholderQuery}
                className="w-full p-5 rounded-3xl border-0 bg-white shadow-soft text-lg text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none h-40 transition-shadow"
            />
          </div>
          <p className="text-xs text-gray-500 ml-2 font-medium">{t.descQuery}</p>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-semibold text-gray-900 ml-1">{t.labelTime}</label>
          <div className="relative">
             <input 
              type="time" 
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full p-5 rounded-3xl border-0 bg-white shadow-soft text-xl text-gray-800 font-medium tracking-wide focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
          <p className="text-xs text-gray-500 ml-2 font-medium">{t.descTime}</p>
        </div>

        <div className="pt-8">
          <button 
            type="submit"
            disabled={!query.trim() || loading}
            className={`w-full py-5 rounded-full text-white font-semibold text-lg shadow-lg shadow-blue-500/30 transition-all transform active:scale-[0.98] ${!query.trim() ? 'bg-gray-300 shadow-none cursor-not-allowed text-gray-500' : 'bg-black hover:bg-gray-900'}`}
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
             {/* Background Delete Button */}
            <div className="absolute inset-y-0 right-0 w-24 bg-red-500 flex items-center justify-center text-white font-medium z-0">
                <TrashIcon className="w-5 h-5" />
            </div>

            {/* Foreground Content */}
            <div 
                className="bg-white p-5 relative z-10 border-b border-gray-100/80 flex justify-between items-center transition-transform duration-300 ease-out active:bg-gray-50"
                style={{ transform: `translateX(${offsetX}px)` }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <div className="flex-1 pr-4">
                    <h3 className="font-semibold text-gray-900 text-[15px]">{topic.query}</h3>
                    <div className="flex items-center text-xs text-gray-400 mt-1 font-medium">
                        <ClockIcon className="w-3 h-3 mr-1" />
                        <span>{translations[lang].mine.dailyAt} {topic.scheduleTime}</span>
                    </div>
                </div>
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

  return (
    <div className="p-6 pb-28 pt-8 max-w-lg mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8 tracking-tight">{t.title}</h1>

      {/* 1. Favorites Section */}
      <section className="mb-10">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 ml-2">
            {t.collections}
        </h2>
        {favorites.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-dashed border-gray-200">
                <p className="text-sm text-gray-400">{t.emptyCollections}</p>
            </div>
        ) : (
            <div className="space-y-4">
                {favorites.map(item => (
                    <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex gap-4 items-start">
                         <img 
                            src={item.imageUrl} 
                            className="w-16 h-16 rounded-xl object-cover flex-shrink-0 bg-gray-100 shadow-inner" 
                            alt=""
                        />
                        <div className="flex-1 min-w-0 py-0.5">
                             <h4 className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug">{item.topicQuery}</h4>
                             <p className="text-xs text-gray-400 mt-1.5 opacity-80 line-clamp-1">{new Date(item.timestamp).toLocaleDateString()}</p>
                        </div>
                        <button onClick={() => onToggleFavorite(item)} className="p-1 text-red-500 hover:bg-red-50 rounded-full transition-colors">
                            <HeartIcon className="w-5 h-5" fill />
                        </button>
                    </div>
                ))}
            </div>
        )}
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
                <span className="text-xs text-gray-400 font-mono">v1.2.0</span>
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
                 itemToSave.imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(item.topicQuery)}?width=800&height=400&nologo=true`;
            }
            return [itemToSave, ...prev];
        }
    });
    if (navigator.vibrate) navigator.vibrate(50);
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
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(topic.query)}?width=800&height=400&nologo=true&seed=${Date.now()}`;

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
    <div className="bg-[#F2F2F7] min-h-screen text-slate-900 font-sans mx-auto relative overflow-hidden selection:bg-blue-100">
      {/* Header - Transparent Blur Style */}
      <div className="sticky top-0 z-40 px-6 py-3 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 transition-all">
        <div className="flex items-center justify-between max-w-lg mx-auto">
            <div className="flex items-center space-x-3">
                 {/* Replaced Box Logo with Clean Typography/Icon combination */}
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