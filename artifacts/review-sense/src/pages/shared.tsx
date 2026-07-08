import React, { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, TrendingUp, TrendingDown, Star, Brain, Briefcase, Target } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";

// Count-up helper component
function CountUp({ value, duration = 1.0 }: { value: number | string; duration?: number }) {
  const numericValue = typeof value === "number" ? value : parseFloat(String(value).replace(/[^0-9.]/g, ""));
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (isNaN(numericValue)) return;
    let start = 0;
    const end = numericValue;
    if (start === end) {
      setCount(end);
      return;
    }

    const totalMiliseconds = duration * 1000;
    const startTime = Date.now();
    
    const timer = setInterval(() => {
      const timePassed = Date.now() - startTime;
      const progress = Math.min(timePassed / totalMiliseconds, 1);
      const easeProgress = progress * (2 - progress); // Ease out quad
      const current = start + easeProgress * (end - start);
      
      setCount(current);

      if (progress === 1) {
        clearInterval(timer);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [numericValue, duration]);

  if (isNaN(numericValue)) return <>{value}</>;
  return <>{numericValue % 1 === 0 ? Math.round(count).toLocaleString() : count.toFixed(1)}</>;
}

export default function SharedPage() {
  const { token } = useParams<{ token: string }>();
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const backendUrl = "https://reviewsense-api-pu7k.onrender.com";
    const url = `${backendUrl}/api/shared/${token}`;
    console.log("Share URL:", url);

    fetch(url)
      .then(async (response) => {
        if (!response.ok) {
          const errText = await response.text();
          console.log("Error response text:", errText);
          throw new Error("This link is invalid or has been removed.");
        }
        return response.json();
      })
      .then(setAnalysis)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div className="w-full max-w-2xl mx-auto p-8 space-y-4 animate-pulse">
      <Skeleton className="h-10 w-48 rounded bg-muted/40" />
      <Skeleton className="h-64 w-full rounded-2xl bg-muted/40" />
      <Skeleton className="h-40 w-full rounded-2xl bg-muted/40" />
    </div>
  );

  if (error || !analysis) return (
    <div className="flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto space-y-4">
      <Activity className="w-12 h-12 text-primary animate-bounce" />
      <h2 className="text-xl font-bold">Link not found</h2>
      <p className="text-sm text-muted-foreground">{error ?? "This shared analysis doesn't exist."}</p>
      <Link href="/" className="text-primary underline text-sm">Go to ReviewSense</Link>
    </div>
  );

  let posKeywords: string[] = [];
  let negKeywords: string[] = [];
  try {
    if (analysis.positiveKeywords) posKeywords = JSON.parse(analysis.positiveKeywords);
    if (analysis.negativeKeywords) negKeywords = JSON.parse(analysis.negativeKeywords);
  } catch {}

  const pieData = [
    { name: "Positive", value: analysis.positivePct, color: "hsl(var(--chart-3))" },
    { name: "Neutral",  value: analysis.neutralPct,  color: "hsl(var(--chart-4))" },
    { name: "Negative", value: analysis.negativePct, color: "hsl(var(--destructive))" },
  ];

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
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 22 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-4xl mx-auto space-y-8"
    >
        {/* Hero */}
        <motion.div variants={itemVariants} className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background p-8 shadow-lg">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {analysis.productImageUrl ? (
              <motion.div 
                animate={{ y: [0, -5, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="w-32 h-32 rounded-xl bg-white border p-2 shrink-0 flex items-center justify-center shadow"
              >
                <img src={analysis.productImageUrl} alt={analysis.productName} className="max-w-full max-h-full object-contain mix-blend-multiply" />
              </motion.div>
            ) : (
              <motion.div 
                animate={{ y: [0, -5, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="w-32 h-32 rounded-xl bg-muted border flex items-center justify-center shrink-0"
              >
                <Target className="w-10 h-10 text-muted-foreground/30" />
              </motion.div>
            )}
            <div className="flex-1">
              {analysis.productBrand && <p className="text-xs font-bold text-primary uppercase tracking-wider">{analysis.productBrand}</p>}
              <h1 className="text-3xl font-bold mt-1 text-foreground leading-tight">{analysis.productName}</h1>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                {analysis.productCategory && <span>{analysis.productCategory}</span>}
                {analysis.productPrice && <span>• {analysis.productPrice}</span>}
                <span>• {analysis.reviewCount} reviews</span>
              </div>
              <div className="flex flex-wrap gap-3 mt-4">
                {analysis.avgRating != null && (
                  <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border bg-background/50 text-sm font-mono font-bold">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" /> <CountUp value={analysis.avgRating} /> / 5.0
                  </span>
                )}
                {analysis.sentimentScore != null && (
                  <span className="px-3 py-1.5 rounded-xl border border-primary/30 bg-primary/10 text-primary text-sm font-mono font-bold shadow-sm shadow-primary/5">
                    AI Score <CountUp value={analysis.sentimentScore} />
                  </span>
                )}
              </div>
            </div>
            <div className="w-40 h-40 shrink-0 relative flex items-center justify-center rounded-full border border-border/50 bg-background/50 shadow">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={68} paddingAngle={4} dataKey="value" stroke="none" isAnimationActive animationDuration={1200}>
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-primary"><CountUp value={analysis.positivePct} />%</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Positive</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Summary */}
        {analysis.overallSummary && (
          <motion.div variants={itemVariants}>
            <Card className="glass-panel border-primary/20 shadow-md">
              <CardHeader><CardTitle className="flex items-center gap-2"><Brain className="w-5 h-5 text-primary" /> The Bottom Line</CardTitle></CardHeader>
              <CardContent><p className="text-lg leading-relaxed text-foreground/90">{analysis.overallSummary}</p></CardContent>
            </Card>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {analysis.strengths && (
            <motion.div variants={itemVariants}>
              <Card className="glass-panel border-green-500/20 bg-green-500/5 shadow-md">
                <CardHeader><CardTitle className="flex items-center gap-2 text-green-500"><TrendingUp className="w-5 h-5" /> Strengths</CardTitle></CardHeader>
                <CardContent>
                  <p className="leading-relaxed">{analysis.strengths}</p>
                  {posKeywords.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {posKeywords.map((k: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-green-500/20 text-green-500 text-xs font-mono">{k}</span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
          {analysis.weaknesses && (
            <motion.div variants={itemVariants}>
              <Card className="glass-panel border-destructive/20 bg-destructive/5 shadow-md">
                <CardHeader><CardTitle className="flex items-center gap-2 text-destructive"><TrendingDown className="w-5 h-5" /> Weaknesses</CardTitle></CardHeader>
                <CardContent>
                  <p className="leading-relaxed">{analysis.weaknesses}</p>
                  {negKeywords.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {negKeywords.map((k: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-destructive/20 text-destructive text-xs font-mono">{k}</span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {analysis.businessInsights && (
          <motion.div variants={itemVariants}>
            <Card className="glass-panel shadow-md">
              <CardHeader><CardTitle className="flex items-center gap-2"><Briefcase className="w-5 h-5 text-secondary" /> Business Insights</CardTitle></CardHeader>
              <CardContent><p className="leading-relaxed text-foreground/90">{analysis.businessInsights}</p></CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div variants={itemVariants} className="text-center pt-4 border-t border-border/50">
          <p className="text-sm text-muted-foreground mb-3">Want to analyze your own products?</p>
          <Link href="/signup" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors shadow-lg hover:shadow-primary/20">
            Try ReviewSense for free
          </Link>
        </motion.div>
      </motion.div>
  );
}
