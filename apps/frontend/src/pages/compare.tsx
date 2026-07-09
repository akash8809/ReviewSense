import React, { useState } from "react";
import { SidebarLayout } from "@/layouts/sidebar-layout";
import { useListAnalyses, useGetAnalysis, getGetAnalysisQueryKey } from "@workspace/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GitCompareArrows, TrendingUp, TrendingDown, Star, Brain, Target } from "lucide-react";
import { motion } from "framer-motion";

function AnalysisSelector({
  label, value, onChange, excludeId,
}: { label: string; value: number | null; onChange: (id: number) => void; excludeId: number | null }) {
  const { data, isLoading } = useListAnalyses({ limit: 100 });
  const completed = data?.items.filter((a) => a.status === "completed" && a.id !== excludeId) ?? [];

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">{label}</label>
      <select
        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        value={value ?? ""}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        <option value="">— Pick a product —</option>
        {isLoading && <option disabled>Loading…</option>}
        {completed.map((a) => (
          <option key={a.id} value={a.id}>
            {a.productName}{a.productBrand ? ` · ${a.productBrand}` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

function AnalysisColumn({ id }: { id: number }) {
  const { data, isLoading } = useGetAnalysis(id, {
    query: { queryKey: getGetAnalysisQueryKey(id) },
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 260, damping: 22 } }
  };

  if (isLoading) return (
    <div className="space-y-4 p-4">
      {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
    </div>
  );
  if (!data) return <div className="p-8 text-center text-muted-foreground">Failed to load.</div>;

  const sentimentColor = data.positivePct > 60 ? "text-green-500" : data.positivePct > 40 ? "text-yellow-500" : "text-destructive";

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      {/* Product header */}
      <motion.div variants={itemVariants}>
        <Card className="glass-panel border-primary/20 shadow-md">
          <CardContent className="pt-4">
            {data.productImageUrl && (
              <img src={data.productImageUrl} alt={data.productName} className="w-16 h-16 object-contain rounded-lg mb-3 bg-white p-1" />
            )}
            {data.productBrand && <p className="text-xs font-bold text-primary uppercase tracking-wider">{data.productBrand}</p>}
            <h3 className="font-bold text-lg leading-tight text-foreground">{data.productName}</h3>
            {data.productCategory && <p className="text-xs text-muted-foreground mt-1">{data.productCategory}</p>}
            {data.productPrice && <p className="text-sm font-medium mt-1">{data.productPrice}</p>}
          </CardContent>
        </Card>
      </motion.div>

      {/* Scores */}
      <motion.div variants={itemVariants}>
        <Card className="glass-panel shadow-md">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 font-semibold"><Brain className="w-4 h-4 text-primary" /> Sentiment Scores</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-green-500 font-medium">Positive</span>
                <span className="font-mono font-bold">{data.positivePct.toFixed(1)}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${data.positivePct}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground font-medium">Neutral</span>
                <span className="font-mono font-bold">{data.neutralPct.toFixed(1)}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-muted-foreground/50 transition-all" style={{ width: `${data.neutralPct}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-destructive font-medium">Negative</span>
                <span className="font-mono font-bold">{data.negativePct.toFixed(1)}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-destructive transition-all" style={{ width: `${data.negativePct}%` }} />
              </div>
            </div>
            <div className="pt-2 flex justify-between border-t border-border/50">
              <span className="text-sm text-muted-foreground">AI Score</span>
              <span className={`font-mono font-bold text-lg ${sentimentColor}`}>{data.sentimentScore?.toFixed(1) ?? "—"}</span>
            </div>
            {data.avgRating != null && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1"><Star className="w-3 h-3 text-yellow-500 fill-current" /> Avg Rating</span>
                <span className="font-mono font-bold">{data.avgRating.toFixed(1)} / 5.0</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Reviews</span>
              <span className="font-mono font-bold">{data.reviewCount.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Strengths */}
      <motion.div variants={itemVariants}>
        <Card className="glass-panel border-green-500/20 bg-green-500/5 shadow-md">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-green-500"><TrendingUp className="w-4 h-4" /> Strengths</CardTitle></CardHeader>
          <CardContent><p className="text-sm leading-relaxed">{data.strengths ?? "—"}</p></CardContent>
        </Card>
      </motion.div>

      {/* Weaknesses */}
      <motion.div variants={itemVariants}>
        <Card className="glass-panel border-destructive/20 bg-destructive/5 shadow-md">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-destructive"><TrendingDown className="w-4 h-4" /> Weaknesses</CardTitle></CardHeader>
          <CardContent><p className="text-sm leading-relaxed">{data.weaknesses ?? "—"}</p></CardContent>
        </Card>
      </motion.div>

      {/* Recommendation */}
      <motion.div variants={itemVariants}>
        <Card className="glass-panel border-secondary/30 bg-secondary/5 shadow-md">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Target className="w-4 h-4 text-secondary" /> AI Verdict</CardTitle></CardHeader>
          <CardContent><p className="text-sm font-medium">{data.predBuyRecommendation ?? "—"}</p></CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

export default function ComparePage() {
  const [idA, setIdA] = useState<number | null>(null);
  const [idB, setIdB] = useState<number | null>(null);
  const ready = idA !== null && idB !== null;

  return (
    <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compare Products</h1>
          <p className="text-muted-foreground mt-1">Pick two completed analyses to see them side by side.</p>
        </div>

        {/* Selectors */}
        <Card className="glass-panel border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AnalysisSelector label="Product A" value={idA} onChange={setIdA} excludeId={idB} />
              <AnalysisSelector label="Product B" value={idB} onChange={setIdB} excludeId={idA} />
            </div>
          </CardContent>
        </Card>

        {/* Comparison */}
        {ready ? (
          <div className="grid grid-cols-2 gap-6">
            <AnalysisColumn id={idA!} />
            <AnalysisColumn id={idB!} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-center border border-dashed border-border/40 rounded-2xl bg-muted/10 p-8">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 text-primary shadow-[0_0_20px_-5px_rgba(147,51,234,0.3)] animate-pulse">
              <GitCompareArrows className="w-8 h-8" />
            </div>
            <p className="text-lg font-semibold text-foreground mb-1">Select two analyses to compare</p>
            <p className="text-xs text-muted-foreground max-w-sm">Choose completed analyses from the dropdowns above to contrast metrics and verdicts side by side.</p>
          </div>
        )}
      </div>
  );
}
