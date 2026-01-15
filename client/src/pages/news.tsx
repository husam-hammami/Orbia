import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  ChevronRight,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Layout } from "@/components/layout";

interface NewsArticle {
  title: string;
  link: string;
  description: string;
  category: string;
  pubDate?: string;
}

interface NewsResponse {
  interests: string[];
  articles: NewsArticle[];
  aiSummary: string | null;
  lastUpdated: string;
}

const categoryIcons: Record<string, any> = {
  teaching: BookOpen,
  cybersecurity: Shield,
  technology: Globe,
  career: Briefcase,
  wellness: Heart,
  skincare: Palette,
  french: Globe
};

const categoryColors: Record<string, string> = {
  teaching: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  cybersecurity: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  technology: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  career: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  wellness: "bg-pink-500/10 text-pink-600 border-pink-500/20",
  skincare: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  french: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20"
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
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  } catch {
    return "";
  }
}

export default function NewsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
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

  const filteredArticles = selectedCategory 
    ? data?.articles.filter(a => a.category === selectedCategory)
    : data?.articles;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/15 text-primary" data-testid="icon-news">
              <Newspaper className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground" data-testid="text-page-title">Daily Updates</h1>
              <p className="text-xs text-muted-foreground" data-testid="text-page-subtitle">Personalized for your goals</p>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2"
            data-testid="button-refresh-news"
          >
            <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="h-32 bg-card rounded-xl animate-pulse" />
            <div className="flex gap-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-8 w-20 bg-muted rounded-full animate-pulse" />
              ))}
            </div>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-card rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {data?.aiSummary && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl border border-primary/20"
                data-testid="card-ai-summary"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-primary" data-testid="text-ai-summary-label">AI Summary</span>
                </div>
                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line" data-testid="text-ai-summary-content">
                  {data.aiSummary}
                </p>
              </motion.div>
            )}

            {data?.interests && data.interests.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all border whitespace-nowrap",
                    !selectedCategory
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                  )}
                  data-testid="filter-all"
                >
                  All
                </button>
                {data.interests.map(interest => {
                  const Icon = categoryIcons[interest] || Globe;
                  return (
                    <button
                      key={interest}
                      onClick={() => setSelectedCategory(interest)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border whitespace-nowrap capitalize",
                        selectedCategory === interest
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                      )}
                      data-testid={`filter-${interest}`}
                    >
                      <Icon className="w-3 h-3" />
                      {interest}
                    </button>
                  );
                })}
              </div>
            )}

            <AnimatePresence mode="popLayout">
              <div className="space-y-3">
                {filteredArticles?.length === 0 ? (
                  <div className="text-center py-12" data-testid="empty-state-news">
                    <Newspaper className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-muted-foreground" data-testid="text-empty-message">No articles found</p>
                  </div>
                ) : (
                  filteredArticles?.map((article, idx) => {
                    const Icon = categoryIcons[article.category] || Globe;
                    const colorClass = categoryColors[article.category] || "bg-muted text-muted-foreground";
                    
                    return (
                      <motion.a
                        key={`${article.link}-${idx}`}
                        href={article.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: idx * 0.03 }}
                        className="block p-4 bg-card rounded-xl border border-border hover:border-primary/30 hover:shadow-md transition-all group"
                        data-testid={`article-${idx}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn("p-2 rounded-lg border", colorClass)}>
                            <Icon className="w-4 h-4" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full capitalize", colorClass)} data-testid={`article-category-${idx}`}>
                                {article.category}
                              </span>
                              {article.pubDate && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1" data-testid={`article-time-${idx}`}>
                                  <Clock className="w-2.5 h-2.5" />
                                  {formatTimeAgo(article.pubDate)}
                                </span>
                              )}
                            </div>
                            
                            <h3 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors" data-testid={`article-title-${idx}`}>
                              {article.title}
                            </h3>
                            
                            {article.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2" data-testid={`article-description-${idx}`}>
                                {article.description}
                              </p>
                            )}
                          </div>
                          
                          <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                        </div>
                      </motion.a>
                    );
                  })
                )}
              </div>
            </AnimatePresence>

            {data?.lastUpdated && (
              <p className="text-center text-xs text-muted-foreground mt-6" data-testid="text-last-updated">
                Last updated: {new Date(data.lastUpdated).toLocaleTimeString()}
              </p>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
