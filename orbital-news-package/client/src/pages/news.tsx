import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Newspaper, 
  RefreshCw, 
  ExternalLink, 
  Sparkles,
  BookOpen,
  Shield,
  Briefcase,
  Heart,
  Globe,
  Palette,
  Clock,
  Bookmark,
  BookmarkCheck,
  Settings2,
  Plus,
  X,
  Check,
  TrendingUp,
  Zap,
  Brain,
  Lightbulb,
  DollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Layout } from "@/components/layout";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface NewsArticle {
  title: string;
  link: string;
  description: string;
  category: string;
  source: string;
  pubDate?: string;
  readingTime?: number;
  imageUrl?: string;
  isSaved?: boolean;
}

interface NewsResponse {
  topics: string[];
  topicNames: string[];
  articles: NewsArticle[];
  aiSummary: string | null;
  hasUserTopics: boolean;
  lastUpdated: string;
}

interface UserTopic {
  id: string;
  topic: string;
  isCustom: number;
  isActive: number;
}

interface SuggestedTopic {
  topic: string;
  name: string;
  reason: string;
}

interface SavedArticle {
  id: string;
  title: string;
  link: string;
  description?: string;
  category: string;
  source?: string;
  createdAt: string;
}

const categoryIcons: Record<string, any> = {
  teaching: BookOpen,
  cybersecurity: Shield,
  technology: Globe,
  career: Briefcase,
  wellness: Heart,
  skincare: Palette,
  french: Globe,
  finance: DollarSign,
  productivity: Zap,
  ai: Brain
};

const categoryColors: Record<string, string> = {
  teaching: "bg-primary/10 text-primary border-primary/20",
  cybersecurity: "bg-accent/80 text-accent-foreground border-accent",
  technology: "bg-primary/15 text-primary border-primary/25",
  career: "bg-secondary/50 text-secondary-foreground border-secondary/30",
  wellness: "bg-primary/10 text-primary border-primary/20",
  skincare: "bg-accent/60 text-accent-foreground border-accent/80",
  french: "bg-muted text-muted-foreground border-border",
  finance: "bg-primary/12 text-primary border-primary/22",
  productivity: "bg-secondary/40 text-secondary-foreground border-secondary/25",
  ai: "bg-primary/18 text-primary border-primary/28"
};

function formatTimeAgo(dateString?: string): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
  } catch {
    return "";
  }
}

function decodeHtmlEntities(text: string): string {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = text;
  return textarea.value;
}

function renderMarkdownBold(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>');
}

const categoryLabels: Record<string, string> = {
  teaching: "Teaching",
  cybersecurity: "Security",
  technology: "Tech",
  career: "Career",
  wellness: "Wellness",
  skincare: "Skincare",
  french: "French",
  finance: "Finance",
  productivity: "Productivity",
  ai: "AI"
};

function TopicManager({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  
  const { data: userTopics } = useQuery<UserTopic[]>({
    queryKey: ["newsTopics"],
    queryFn: async () => {
      const res = await fetch("/api/news/topics");
      return res.json();
    }
  });

  const { data: suggestions } = useQuery<{ suggestions: SuggestedTopic[]; allTopics: { topic: string; name: string }[] }>({
    queryKey: ["newsSuggestions"],
    queryFn: async () => {
      const res = await fetch("/api/news/suggested-topics");
      return res.json();
    }
  });

  const addTopic = useMutation({
    mutationFn: async (data: { topic: string; isCustom?: boolean }) => {
      const res = await fetch("/api/news/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: data.topic, isCustom: data.isCustom ?? false })
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["newsTopics"] });
      queryClient.invalidateQueries({ queryKey: ["news"] });
      toast.success("Topic added!");
    }
  });

  const removeTopic = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/news/topics/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["newsTopics"] });
      queryClient.invalidateQueries({ queryKey: ["news"] });
      toast.success("Topic removed");
    }
  });

  const activeTopicIds = new Set(userTopics?.map(t => t.topic) || []);

  return (
    <div className="space-y-6">
      {userTopics && userTopics.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-3 text-foreground">Your Topics</h4>
          <div className="flex flex-wrap gap-2">
            {userTopics.map(topic => {
              const Icon = categoryIcons[topic.topic] || Globe;
              const colorClass = categoryColors[topic.topic] || "bg-muted text-muted-foreground";
              return (
                <motion.button
                  key={topic.id}
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium border",
                    colorClass
                  )}
                  onClick={() => removeTopic.mutate(topic.id)}
                  data-testid={`topic-remove-${topic.topic}`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="capitalize">{topic.topic}</span>
                  <X className="w-3 h-3 opacity-60" />
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {suggestions?.suggestions && suggestions.suggestions.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-3 text-foreground flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            Suggested for You
          </h4>
          <div className="space-y-2">
            {suggestions.suggestions.filter(s => !activeTopicIds.has(s.topic)).slice(0, 5).map(suggestion => {
              const Icon = categoryIcons[suggestion.topic] || Globe;
              return (
                <motion.button
                  key={suggestion.topic}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-left"
                  onClick={() => addTopic.mutate({ topic: suggestion.topic })}
                  data-testid={`topic-add-${suggestion.topic}`}
                >
                  <div className={cn("p-2 rounded-lg", categoryColors[suggestion.topic] || "bg-muted")}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{suggestion.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{suggestion.reason}</p>
                  </div>
                  <Plus className="w-5 h-5 text-primary" />
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <h4 className="text-sm font-semibold mb-3 text-foreground">All Topics</h4>
        <div className="flex flex-wrap gap-2">
          {suggestions?.allTopics?.filter(t => !activeTopicIds.has(t.topic)).map(topic => {
            const Icon = categoryIcons[topic.topic] || Globe;
            return (
              <button
                key={topic.topic}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-transparent hover:border-border"
                onClick={() => addTopic.mutate({ topic: topic.topic })}
                data-testid={`topic-browse-${topic.topic}`}
              >
                <Icon className="w-3 h-3" />
                {topic.name}
              </button>
            );
          })}
        </div>
      </div>

      <CustomTopicInput onAdd={(topic) => addTopic.mutate({ topic, isCustom: true })} />
    </div>
  );
}

function CustomTopicInput({ onAdd }: { onAdd: (topic: string) => void }) {
  const [customTopic, setCustomTopic] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customTopic.trim().toLowerCase().replace(/\s+/g, "-");
    if (trimmed.length >= 2) {
      onAdd(trimmed);
      setCustomTopic("");
    } else {
      toast.error("Topic must be at least 2 characters");
    }
  };

  return (
    <div className="border-t pt-4">
      <h4 className="text-sm font-semibold mb-3 text-foreground flex items-center gap-2">
        <Plus className="w-4 h-4 text-primary" />
        Add Custom Topic
      </h4>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={customTopic}
          onChange={(e) => setCustomTopic(e.target.value)}
          placeholder="Enter any topic..."
          className="flex-1"
          data-testid="input-custom-topic"
        />
        <Button 
          type="submit" 
          size="sm" 
          disabled={customTopic.trim().length < 2}
          data-testid="button-add-custom-topic"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </form>
      <p className="text-xs text-muted-foreground mt-2">
        Add topics like "python", "cooking", "photography", etc.
      </p>
    </div>
  );
}

function ArticleCard({ article, index }: { article: NewsArticle; index: number }) {
  const queryClient = useQueryClient();
  const Icon = categoryIcons[article.category] || Globe;
  const colorClass = categoryColors[article.category] || "bg-muted text-muted-foreground border-muted";

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (article.isSaved) {
        const saved = queryClient.getQueryData<SavedArticle[]>(["savedArticles"]);
        const toDelete = saved?.find(a => a.link === article.link);
        if (toDelete) {
          await fetch(`/api/news/saved/${toDelete.id}`, { method: "DELETE" });
        }
      } else {
        await fetch("/api/news/saved", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: article.title,
            link: article.link,
            description: article.description,
            category: article.category,
            source: article.source,
            pubDate: article.pubDate
          })
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news"] });
      queryClient.invalidateQueries({ queryKey: ["savedArticles"] });
      toast.success(article.isSaved ? "Removed from saved" : "Saved for later");
    }
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
      className="group relative bg-card rounded-2xl border border-border overflow-hidden hover:border-primary/30 hover:shadow-lg transition-all duration-300"
      data-testid={`article-${index}`}
    >
      <a
        href={article.link}
        target="_blank"
        rel="noopener noreferrer"
        className="block p-4"
      >
        <div className="flex items-start gap-3">
          <div className={cn("p-2.5 rounded-xl border shrink-0", colorClass)}>
            <Icon className="w-5 h-5" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide", colorClass)} data-testid={`article-category-${index}`}>
                {categoryLabels[article.category] || article.category}
              </span>
            </div>
            
            <h3 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug" data-testid={`article-title-${index}`}>
              {decodeHtmlEntities(article.title)}
            </h3>
            
            {article.description && (
              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed" data-testid={`article-description-${index}`}>
                {decodeHtmlEntities(article.description)}
              </p>
            )}
            
            <div className="flex items-center gap-3 mt-2.5 text-[10px] text-muted-foreground">
              {article.pubDate && (
                <span className="flex items-center gap-1" data-testid={`article-time-${index}`}>
                  <Clock className="w-3 h-3" />
                  {formatTimeAgo(article.pubDate)}
                </span>
              )}
              {article.readingTime && (
                <span className="flex items-center gap-1" data-testid={`article-reading-${index}`}>
                  <BookOpen className="w-3 h-3" />
                  {article.readingTime} min read
                </span>
              )}
            </div>
          </div>
          
          <ExternalLink className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0 mt-1" />
        </div>
      </a>
      
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          saveMutation.mutate();
        }}
        className={cn(
          "absolute top-3 right-3 p-2 rounded-full transition-all",
          article.isSaved 
            ? "bg-primary/10 text-primary" 
            : "bg-background/80 text-muted-foreground hover:text-primary hover:bg-primary/10"
        )}
        data-testid={`article-save-${index}`}
      >
        {article.isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
      </button>
    </motion.div>
  );
}

export default function NewsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("feed");
  const [topicSheetOpen, setTopicSheetOpen] = useState(false);
  const queryClient = useQueryClient();
  
  const { data, isLoading, refetch, isFetching } = useQuery<NewsResponse>({
    queryKey: ["news"],
    queryFn: async () => {
      const res = await fetch("/api/news");
      if (!res.ok) throw new Error("Failed to fetch news");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: savedArticles } = useQuery<SavedArticle[]>({
    queryKey: ["savedArticles"],
    queryFn: async () => {
      const res = await fetch("/api/news/saved");
      return res.json();
    }
  });

  const filteredArticles = selectedCategory 
    ? data?.articles.filter(a => a.category === selectedCategory)
    : data?.articles;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <motion.div 
              className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 text-primary"
              whileHover={{ scale: 1.05 }}
              data-testid="icon-news"
            >
              <Newspaper className="w-6 h-6" />
            </motion.div>
            <div>
              <h1 className="text-xl font-bold text-foreground" data-testid="text-page-title">Orbital News</h1>
              <p className="text-xs text-muted-foreground" data-testid="text-page-subtitle">
                {data?.hasUserTopics ? `Following ${data.topics.length} topics` : "Curated for your goals"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Sheet open={topicSheetOpen} onOpenChange={setTopicSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5" data-testid="button-manage-topics">
                  <Settings2 className="w-4 h-4" />
                  Topics
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
                <SheetHeader className="mb-4">
                  <SheetTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Manage Your Topics
                  </SheetTitle>
                </SheetHeader>
                <TopicManager onClose={() => setTopicSheetOpen(false)} />
              </SheetContent>
            </Sheet>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              disabled={isFetching}
              data-testid="button-refresh-news"
            >
              <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
          <TabsList className="grid w-full grid-cols-2 h-10">
            <TabsTrigger value="feed" className="gap-2" data-testid="tab-feed">
              <Newspaper className="w-4 h-4" />
              Feed
            </TabsTrigger>
            <TabsTrigger value="saved" className="gap-2" data-testid="tab-saved">
              <Bookmark className="w-4 h-4" />
              Saved {savedArticles?.length ? `(${savedArticles.length})` : ""}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="mt-4">
            {isLoading ? (
              <div className="space-y-4" data-testid="loading-state">
                <div className="h-28 bg-gradient-to-r from-primary/5 to-accent/5 rounded-2xl animate-pulse" />
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-9 w-24 bg-muted rounded-full animate-pulse shrink-0" />
                  ))}
                </div>
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-32 bg-card rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : (
              <>
                {data?.aiSummary && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-5 p-4 bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5 rounded-2xl border border-primary/20 relative overflow-hidden"
                    data-testid="card-ai-summary"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-primary/20">
                          <Sparkles className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-sm font-semibold text-primary" data-testid="text-ai-summary-label">Today's Briefing</span>
                      </div>
                      <p 
                        className="text-sm text-foreground/90 leading-relaxed" 
                        data-testid="text-ai-summary-content"
                        dangerouslySetInnerHTML={{ __html: renderMarkdownBold(data.aiSummary) }}
                      />
                    </div>
                  </motion.div>
                )}

                {data?.topics && data.topics.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none -mx-1 px-1">
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className={cn(
                        "px-4 py-2 rounded-full text-sm font-medium transition-all border whitespace-nowrap shrink-0",
                        !selectedCategory
                          ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                          : "bg-card text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
                      )}
                      data-testid="filter-all"
                    >
                      All ({data.articles?.length || 0})
                    </button>
                    {data.topics.map((topic, idx) => {
                      const Icon = categoryIcons[topic] || Globe;
                      const topicName = data.topicNames?.[idx] || topic;
                      const count = data.articles?.filter(a => a.category === topic).length || 0;
                      return (
                        <button
                          key={topic}
                          onClick={() => setSelectedCategory(topic)}
                          className={cn(
                            "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all border whitespace-nowrap shrink-0",
                            selectedCategory === topic
                              ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                              : count === 0
                                ? "bg-card/50 text-muted-foreground/50 border-border/50"
                                : "bg-card text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
                          )}
                          data-testid={`filter-${topic}`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {topicName} ({count})
                        </button>
                      );
                    })}
                  </div>
                )}

                <AnimatePresence mode="popLayout">
                  <div className="space-y-3">
                    {filteredArticles?.length === 0 ? (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-16"
                        data-testid="empty-state-news"
                      >
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
                          <Newspaper className="w-8 h-8 text-muted-foreground/50" />
                        </div>
                        <p className="text-muted-foreground font-medium" data-testid="text-empty-message">No articles found</p>
                        <p className="text-sm text-muted-foreground/70 mt-1">Try adding more topics to your feed</p>
                      </motion.div>
                    ) : (
                      filteredArticles?.map((article, idx) => (
                        <ArticleCard key={`${article.link}-${idx}`} article={article} index={idx} />
                      ))
                    )}
                  </div>
                </AnimatePresence>

                {data?.lastUpdated && (
                  <p className="text-center text-xs text-muted-foreground mt-8" data-testid="text-last-updated">
                    Last updated {formatTimeAgo(data.lastUpdated)}
                  </p>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="saved" className="mt-4">
            {savedArticles?.length === 0 ? (
              <div className="text-center py-16" data-testid="empty-saved">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
                  <Bookmark className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground font-medium">No saved articles yet</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Tap the bookmark icon to save articles for later</p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedArticles?.map((article, idx) => {
                  const Icon = categoryIcons[article.category] || Globe;
                  const colorClass = categoryColors[article.category] || "bg-muted text-muted-foreground";
                  
                  return (
                    <motion.a
                      key={article.id}
                      href={article.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="block p-4 bg-card rounded-2xl border border-border hover:border-primary/30 hover:shadow-md transition-all group"
                      data-testid={`saved-article-${idx}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn("p-2 rounded-xl border shrink-0", colorClass)}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase", colorClass)} data-testid={`saved-category-${idx}`}>
                              {article.category}
                            </span>
                            <span className="text-[10px] text-muted-foreground" data-testid={`saved-time-${idx}`}>
                              Saved {formatTimeAgo(article.createdAt)}
                            </span>
                          </div>
                          <h3 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors" data-testid={`saved-title-${idx}`}>
                            {article.title}
                          </h3>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0" />
                      </div>
                    </motion.a>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
