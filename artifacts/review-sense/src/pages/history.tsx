import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { SidebarLayout } from "@/components/sidebar-layout";
import { 
  useListAnalyses, 
  getListAnalysesQueryKey,
  useDeleteAnalysis,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Search, Trash2, ChevronRight, Activity, ChevronLeft } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

const PAGE_LIMIT = 20;

export default function HistoryPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Use debounce for search — reset to page 1 on new search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  React.useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useListAnalyses(
    { search: debouncedSearch || undefined, limit: PAGE_LIMIT, page },
    { query: { queryKey: getListAnalysesQueryKey({ search: debouncedSearch || undefined, limit: PAGE_LIMIT, page }) } }
  );

  const totalPages = data ? Math.ceil(data.total / PAGE_LIMIT) : 1;

  const deleteMutation = useDeleteAnalysis();

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this analysis?")) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Deleted", description: "Analysis removed successfully." });
          queryClient.invalidateQueries({ queryKey: getListAnalysesQueryKey() });
        },
        onError: (err: any) => {
          toast({ variant: "destructive", title: "Error", description: err.message || "Failed to delete." });
        }
      });
    }
  };

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analysis History</h1>
            <p className="text-muted-foreground mt-1">Review and manage your past extractions.</p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search products..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 glass-panel"
            />
          </div>
        </div>

        <Card className="glass-panel border-border/50 shadow-md">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : data && data.items.length > 0 ? (
              <div className="divide-y divide-border/50">
                <AnimatePresence initial={false}>
                  {data.items.map((item) => (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      className="overflow-hidden"
                    >
                      <div 
                        className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors cursor-pointer group"
                        onClick={() => setLocation(`/result/${item.id}`)}
                        data-testid={`history-item-${item.id}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                            item.status === 'completed' ? 'bg-primary/10 text-primary' : 
                            item.status === 'failed' ? 'bg-destructive/10 text-destructive' : 'bg-yellow-500/10 text-yellow-500 animate-pulse'
                          }`}>
                            <Activity className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground text-lg group-hover:text-primary transition-colors">
                              {item.productName || "Unknown Product"}
                            </h3>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                              <span className="font-mono">{new Date(item.createdAt).toLocaleDateString()}</span>
                              <span>•</span>
                              <span className="capitalize">{item.status}</span>
                              {item.status === 'completed' && (
                                <>
                                  <span>•</span>
                                  <span>{item.reviewCount} reviews</span>
                                  <span>•</span>
                                  <span className="text-primary font-medium">{item.positivePct}% Pos</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => handleDelete(e, item.id)}
                            disabled={deleteMutation.isPending}
                            title="Delete Analysis"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <ChevronRight className="w-5 h-5 text-muted-foreground opacity-50 group-hover:opacity-100 group-hover:text-primary transition-all group-hover:translate-x-1" />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="p-16 text-center text-muted-foreground flex flex-col items-center">
                <Search className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-lg font-medium text-foreground mb-1">No results found</p>
                <p>Try adjusting your search or start a new analysis.</p>
                {search && (
                  <Button variant="link" className="mt-2 text-primary" onClick={() => setSearch("")}>
                    Clear search
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination controls */}
        {data && data.total > PAGE_LIMIT && (
          <div className="flex items-center justify-between px-1">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * PAGE_LIMIT + 1}–{Math.min(page * PAGE_LIMIT, data.total)} of {data.total} analyses
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading}
                className="gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </Button>
              <span className="text-sm font-medium px-2">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isLoading}
                className="gap-1"
              >
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
