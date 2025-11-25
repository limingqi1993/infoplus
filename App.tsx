import React, { useState, useEffect, useCallback } from 'react';
import { FeedIcon, AddIcon, MineIcon, ClockIcon, TrashIcon, RefreshIcon, LinkIcon, GlobeIcon } from './components/Icons';
import { Topic, FeedItem, ViewState, Language, SourceLink } from './types';
import { fetchTopicUpdate } from './services/geminiService';
import { getStoredTopics, saveTopics, getStoredFeed, saveFeed, getStoredLanguage, saveLanguage } from './utils/storage';

// --- Translations ---
const translations = {
  en: {
    nav: {
      feed: "Feed",
      mine: "Mine"
    },
    feed: {
      title: "Latest Updates",
      emptyTitle: "No topics yet",
      emptyDesc: "Tap the + button to add news, people, or events you want to track.",
      loading: "AI is gathering latest news from the web...",
      noUpdates: "No updates yet. Tap refresh to search.",
      sources: "Sources:"
    },
    add: {
      title: "Track New Topic",
      labelQuery: "What do you want to track?",
      placeholderQuery: "E.g., Latest breakthroughs in SpaceX Starship, or Updates on Jay Chou's concert tour...",
      descQuery: "AI will search Google, Social Media (Weibo, X), and News sites.",
      labelTime: "Daily Digest Time",
      descTime: "We will prioritize fetching fresh updates around this time.",
      btnLoading: "Adding...",
      btnStart: "Start Tracking"
    },
    mine: {
      title: "My Topics",
      empty: "You aren't tracking anything yet.",
      dailyAt: "Daily at",
      settings: "Settings",
      language: "Language",
      notifications: "Notifications",
      dataSources: "Data Sources",
      version: "Version",
      apiKeyStatus: "API Key Status",
      confirmDelete: "Are you sure you want to delete this topic? All related news history will also be removed."
    }
  },
  zh: {
    nav: {
      feed: "动态",
      mine: "我的"
    },
    feed: {
      title: "最新动态",
      emptyTitle: "暂无订阅",
      emptyDesc: "点击 + 按钮添加您想追踪的新闻、人物或事件。",
      loading: "AI正在全网搜集最新消息...",
      noUpdates: "暂无更新，请点击刷新按钮。",
      sources: "消息来源："
    },
    add: {
      title: "添加追踪主题",
      labelQuery: "您想追踪什么？",
      placeholderQuery: "例如：SpaceX 星舰最新进展，或者周杰伦演唱会行程...",
      descQuery: "AI将搜索谷歌、社交媒体（微博、X）和新闻网站。",
      labelTime: "每日推送时间",
      descTime: "我们将在此时间附近为您获取最新更新。",
      btnLoading: "添加中...",
      btnStart: "开始追踪"
    },
    mine: {
      title: "我的订阅",
      empty: "您还没有追踪任何主题。",
      dailyAt: "每日",
      settings: "设置",
      language: "语言 / Language",
      notifications: "通知推送",
      dataSources: "数据来源",
      version: "版本",
      apiKeyStatus: "API Key 状态",
      confirmDelete: "您确定要删除这个主题吗？所有相关的历史消息也将被移除。"
    }
  }
};

// --- Sub-components for Cleaner File ---

// Helper to render text with inline citations [1]
const ContentRenderer = ({ content, sources }: { content: string, sources: SourceLink[] }) => {
  // Split by newlines first to handle paragraphs
  const lines = content.split('\n');

  const renderLineWithCitations = (text: string) => {
    // Regex to find [n]
    const regex = /\[(\d+)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      const num = parseInt(match[1]);
      const sourceIndex = num - 1; // 1-based index from text to 0-based array
      const source = sources[sourceIndex] || sources[0]; // Fallback if index mismatches

      if (source) {
        parts.push(
          <sup key={`cite-${match.index}`} className="mx-0.5 align-super">
            <a 
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center min-w-[14px] h-[14px] text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-full hover:bg-blue-100 no-underline cursor-pointer"
              title={source.title}
            >
              {num}
            </a>
          </sup>
        );
      } else {
        parts.push(match[0]);
      }

      lastIndex = regex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div className="prose prose-sm prose-slate max-w-none text-gray-700 leading-relaxed">
      {lines.map((line, i) => {
        if (line.trim() === '') return <div key={i} className="h-2"></div>;
        return (
          <p key={i} className="mb-2">
            {renderLineWithCitations(line)}
          </p>
        );
      })}
    </div>
  );
};

// 1. Navigation Bar
const BottomNav = ({ currentView, setView, lang }: { currentView: ViewState; setView: (v: ViewState) => void, lang: Language }) => {
  const t = translations[lang].nav;
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe pt-2 px-6 h-[80px] flex justify-between items-start z-50 max-w-md mx-auto shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <button 
        onClick={() => setView('feed')}
        className={`flex flex-col items-center space-y-1 ${currentView === 'feed' ? 'text-blue-600' : 'text-gray-400'}`}
      >
        <FeedIcon className="w-6 h-6" />
        <span className="text-xs font-medium">{t.feed}</span>
      </button>

      <div className="relative -top-6">
        <button 
          onClick={() => setView('add')}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-transform active:scale-95"
        >
          <AddIcon className="w-8 h-8" />
        </button>
      </div>

      <button 
        onClick={() => setView('mine')}
        className={`flex flex-col items-center space-y-1 ${currentView === 'mine' ? 'text-blue-600' : 'text-gray-400'}`}
      >
        <MineIcon className="w-6 h-6" />
        <span className="text-xs font-medium">{t.mine}</span>
      </button>
    </div>
  );
};

// 2. Feed Page
const FeedView = ({ 
  feed, 
  topics, 
  onRefresh, 
  isRefreshing,
  lang
}: { 
  feed: FeedItem[]; 
  topics: Topic[];
  onRefresh: () => void; 
  isRefreshing: boolean;
  lang: Language;
}) => {
  const t = translations[lang].feed;

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (topics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-gray-400 p-8 text-center">
        <GlobeIcon className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg font-medium text-gray-600">{t.emptyTitle}</p>
        <p className="text-sm mt-2">{t.emptyDesc}</p>
      </div>
    );
  }

  return (
    <div className="pb-24 pt-4 px-4 space-y-4">
      <div className="flex justify-between items-center mb-2 px-1">
        <h1 className="text-2xl font-bold text-gray-800">{t.title}</h1>
        <button 
          onClick={onRefresh} 
          disabled={isRefreshing}
          className={`p-2 rounded-full bg-white shadow-sm border border-gray-100 text-gray-600 hover:text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`}
        >
          <RefreshIcon className="w-5 h-5" />
        </button>
      </div>

      {isRefreshing && (
        <div className="bg-blue-50 text-blue-700 px-4 py-3 rounded-xl flex items-center justify-center animate-pulse">
          <span className="text-sm font-medium">{t.loading}</span>
        </div>
      )}

      {feed.length === 0 && !isRefreshing && (
        <div className="text-center py-10 text-gray-500">
          <p>{t.noUpdates}</p>
        </div>
      )}

      {feed.map((item) => (
        <div key={item.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex justify-between items-start mb-3">
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wide">
              {item.topicQuery.length > 15 ? item.topicQuery.substring(0, 15) + '...' : item.topicQuery}
            </span>
            <span className="text-xs text-gray-400 flex items-center">
              <ClockIcon className="w-3 h-3 mr-1" />
              {formatTime(item.timestamp)}
            </span>
          </div>
          
          <ContentRenderer content={item.content} sources={item.sources} />
        </div>
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
    // Simulate a small delay for better UX
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
    <div className="p-6 pb-24 h-full flex flex-col">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t.title}</h1>
      
      <form onSubmit={handleSubmit} className="flex-1 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t.labelQuery}
          </label>
          <textarea 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.placeholderQuery}
            className="w-full p-4 rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none h-32 text-base shadow-sm"
          />
          <p className="text-xs text-gray-500 mt-2">
            {t.descQuery}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t.labelTime}
          </label>
          <div className="relative">
             <input 
              type="time" 
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full p-4 rounded-xl border border-gray-300 bg-white text-lg font-mono shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {t.descTime}
          </p>
        </div>

        <div className="pt-4">
          <button 
            type="submit"
            disabled={!query.trim() || loading}
            className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg transition-all transform active:scale-[0.98] ${!query.trim() ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {loading ? t.btnLoading : t.btnStart}
          </button>
        </div>
      </form>
    </div>
  );
};

// 4. Mine/Manage Page
const MineView = ({ 
  topics, 
  onDelete, 
  lang, 
  setLanguage 
}: { 
  topics: Topic[]; 
  onDelete: (id: string) => void; 
  lang: Language;
  setLanguage: (l: Language) => void;
}) => {
  const t = translations[lang].mine;

  return (
    <div className="p-6 pb-24">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t.title}</h1>

      <div className="space-y-4">
        {topics.length === 0 ? (
          <div className="text-center text-gray-400 py-10">
             <p>{t.empty}</p>
          </div>
        ) : (
          topics.map((topic) => (
            <div key={topic.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
              <div className="flex-1 pr-4">
                <h3 className="font-medium text-gray-800 line-clamp-2">{topic.query}</h3>
                <div className="flex items-center text-xs text-gray-400 mt-1">
                  <ClockIcon className="w-3 h-3 mr-1" />
                  <span>{t.dailyAt} {topic.scheduleTime}</span>
                </div>
              </div>
              <button 
                onClick={() => onDelete(topic.id)}
                className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="mt-8 pt-8 border-t border-gray-200">
        <h2 className="text-lg font-bold text-gray-800 mb-4">{t.settings}</h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
            
            {/* API Key Status Check */}
            <div className="p-4 flex justify-between items-center">
                <span className="text-sm text-gray-600">{t.apiKeyStatus}</span>
                <span className={`text-xs font-bold px-2 py-1 rounded ${process.env.API_KEY ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {process.env.API_KEY ? 'Configured (已配置)' : 'Missing (未配置)'}
                </span>
            </div>

            {/* Language Selector */}
            <div className="p-4 flex justify-between items-center">
                <span className="text-sm text-gray-600">{t.language}</span>
                <div className="flex bg-gray-100 rounded-lg p-1">
                    <button 
                        onClick={() => setLanguage('en')}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${lang === 'en' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                    >
                        English
                    </button>
                    <button 
                        onClick={() => setLanguage('zh')}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${lang === 'zh' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                    >
                        中文
                    </button>
                </div>
            </div>

            <div className="p-4 flex justify-between items-center">
                <span className="text-sm text-gray-600">{t.notifications}</span>
                <div className="w-10 h-6 bg-green-500 rounded-full relative cursor-pointer">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                </div>
            </div>
            <div className="p-4 flex justify-between items-center">
                <span className="text-sm text-gray-600">{t.dataSources}</span>
                <span className="text-xs text-gray-400">Google, X, Weibo...</span>
            </div>
             <div className="p-4 flex justify-between items-center">
                <span className="text-sm text-gray-600">{t.version}</span>
                <span className="text-xs text-gray-400">v1.1.0 (Beta)</span>
            </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  const [view, setView] = useState<ViewState>('feed');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [language, setLanguage] = useState<Language>('zh'); // Default state before load

  // Load Initial Data
  useEffect(() => {
    const loadedTopics = getStoredTopics();
    const loadedFeed = getStoredFeed();
    const loadedLang = getStoredLanguage();
    setTopics(loadedTopics);
    setFeed(loadedFeed);
    setLanguage(loadedLang);
  }, []);

  // Save Data on Change
  useEffect(() => {
    saveTopics(topics);
  }, [topics]);

  useEffect(() => {
    saveFeed(feed);
  }, [feed]);
  
  // Save Language
  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    saveLanguage(lang);
  };

  const handleAddTopic = (topic: Topic) => {
    setTopics(prev => [topic, ...prev]);
    setView('feed');
    // Trigger immediate fetch with current language
    setTimeout(() => refreshFeed([topic]), 500);
  };

  const handleDeleteTopic = (id: string) => {
    const t = translations[language].mine;
    if (window.confirm(t.confirmDelete)) {
      setTopics(prev => prev.filter(t => t.id !== id));
      // Real-time filtering: Remove items related to the deleted topic
      setFeed(prev => prev.filter(f => f.topicId !== id));
    }
  };

  const refreshFeed = useCallback(async (topicsToUpdate: Topic[] = topics) => {
    if (topicsToUpdate.length === 0) return;
    
    setIsRefreshing(true);
    
    // We process topics using Promise.all
    const promises = topicsToUpdate.map(async (topic) => {
        // Pass current language to service
        const result = await fetchTopicUpdate(topic.query, language);
        const newItem: FeedItem = {
            id: crypto.randomUUID(),
            topicId: topic.id,
            topicQuery: topic.query,
            content: result.text,
            sources: result.sources,
            timestamp: Date.now(),
            isRead: false
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
  }, [topics, language]);

  // Main Render Switch
  const renderContent = () => {
    switch (view) {
      case 'add':
        return <AddTopicView onAdd={handleAddTopic} lang={language} />;
      case 'mine':
        return <MineView topics={topics} onDelete={handleDeleteTopic} lang={language} setLanguage={handleSetLanguage} />;
      case 'feed':
      default:
        return <FeedView 
          feed={feed} 
          topics={topics}
          onRefresh={() => refreshFeed(topics)} 
          isRefreshing={isRefreshing} 
          lang={language}
        />;
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen text-slate-900 font-sans max-w-md mx-auto shadow-2xl relative">
      {/* Top Safe Area / Header */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-md z-40 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                 <GlobeIcon className="text-white w-5 h-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-800">InfoPulse AI</span>
        </div>
      </div>

      <main className="min-h-[calc(100vh-140px)]">
        {renderContent()}
      </main>

      <BottomNav currentView={view} setView={setView} lang={language} />
    </div>
  );
}