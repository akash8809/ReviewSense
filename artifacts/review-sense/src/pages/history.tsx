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
import { Search, Trash2, ExternalLink, Filter, ChevronRight, Activity } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function HistoryPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  
  // Use debounce for search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useListAnalyses(
    { search: debouncedSearch || undefined, limit: 50 },
    { query: { queryKey: getListAnalysesQueryKey({ search: debouncedSearch || undefined, limit: 50 }) } }
  );

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

        <Card className="glass-panel border-border/50">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : data && data.items.length > 0 ? (
              <div className="divide-y divide-border/50">
                {data.items.map((item) => (
                  <div 
                    key={item.id}
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
                ))}
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
      </div>
    </SidebarLayout>
  );
}
