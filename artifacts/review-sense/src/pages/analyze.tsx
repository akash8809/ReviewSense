import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { SidebarLayout } from "@/components/sidebar-layout";
import { 
  useCreateAnalysis, 
  useUploadCsvAnalysis,
  useGetAnalysis,
  getGetAnalysisQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Link as LinkIcon, FileSpreadsheet, CheckCircle2, AlertCircle, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AnalyzePage() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialUrl = searchParams.get("url") || "";
  
  const { toast } = useToast();
  const [url, setUrl] = useState(initialUrl);
  const [csvText, setCsvText] = useState("");
  const [productName, setProductName] = useState("");
  const [activeTab, setActiveTab] = useState<string>("url");
  
  const createMutation = useCreateAnalysis();
  const uploadMutation = useUploadCsvAnalysis();
  
  const [pollingId, setPollingId] = useState<number | null>(null);

  // Progressive Stepper steps
  const STEPS = [
    "Connecting to URL...",
    "Scraping Reviews & Metadata...",
    "Running ML Sentiment Model...",
    "Generating AI Recommendations & Insights...",
    "Saving Analysis to History...",
    "Complete"
  ];
  const [activeStep, setActiveStep] = useState(0);
  const [progressPct, setProgressPct] = useState(10);
  
  // Custom polling hook usage
  const { data: analysis, error } = useGetAnalysis(pollingId as number, {
    query: {
      enabled: !!pollingId,
      refetchInterval: (query) => {
        const data = query.state.data;
        if (data && (data.status === 'completed' || data.status === 'failed')) {
          return false;
        }
        return 2000; // poll every 2 seconds
      },
      queryKey: getGetAnalysisQueryKey(pollingId as number)
    }
  });

  const isPolling = !!pollingId;

  // Stepper simulation loop
  useEffect(() => {
    if (!isPolling) {
      setActiveStep(0);
      setProgressPct(10);
      return;
    }

    if (analysis?.status === 'completed') {
      setActiveStep(5);
      setProgressPct(100);
      return;
    }
    if (analysis?.status === 'failed') {
      return;
    }

    const intervals = [1200, 2000, 1800, 1800, 3000];
    const progressMilestones = [22, 45, 68, 85, 95];

    let currentStep = activeStep;
    const runStepper = () => {
      if (currentStep >= 4 || !isPolling) return;
      const timeout = setTimeout(() => {
        currentStep += 1;
        setActiveStep(currentStep);
        setProgressPct(progressMilestones[currentStep]);
        runStepper();
      }, intervals[currentStep]);
      return timeout;
    };

    const timer = runStepper();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isPolling, analysis?.status, activeStep]);

  // Watch polling state changes
  useEffect(() => {
    if (analysis) {
      if (analysis.status === 'completed') {
        toast({ title: "Analysis Complete", description: "Insights generated successfully!" });
        const redirectTimer = setTimeout(() => setLocation(`/result/${analysis.id}`), 1200);
        return () => clearTimeout(redirectTimer);
      } else if (analysis.status === 'failed') {
        toast({ variant: "destructive", title: "Analysis Failed", description: analysis.errorMessage || "Something went wrong during processing." });
        setPollingId(null);
      }
    }
  }, [analysis, setLocation, toast]);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    
    createMutation.mutate({ data: { productUrl: url } }, {
      onSuccess: (res) => {
        setPollingId(res.id);
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Error", description: err.message || "Failed to start analysis." });
      }
    });
  };

  const handleCsvSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText.trim() || !productName.trim()) {
      toast({ variant: "destructive", title: "Missing fields", description: "Please provide product name and CSV data." });
      return;
    }
    
    try {
      const lines = csvText.split('\n').filter(l => l.trim().length > 0);
      if (lines.length < 2) throw new Error("Please include headers and at least one row of data.");
      
      const reviews = lines.slice(1).map(line => {
        const parts = line.split(',');
        return {
          review: parts[0] || "",
          rating: parts[1] ? parseFloat(parts[1]) : null,
          date: parts[2] || null
        };
      });

      uploadMutation.mutate({ data: { productName, reviews } }, {
        onSuccess: (res) => {
          setPollingId(res.id);
        },
        onError: (err: any) => {
          toast({ variant: "destructive", title: "Error", description: err.message || "Failed to upload CSV." });
        }
      });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Parse Error", description: err.message || "Invalid CSV format." });
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 mt-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-2">New Analysis</h1>
          <p className="text-muted-foreground">Select a data source to begin extracting insights.</p>
        </div>

        {isPolling ? (
          <Card className="glass-panel-glow border-primary/30 p-12 text-center shadow-xl">
            <AnimatePresence mode="wait">
              {analysis?.status === 'completed' ? (
                <motion.div key="success" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center py-6">
                  <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6 text-green-500 shadow-lg shadow-green-500/10">
                    <CheckCircle2 className="w-10 h-10 animate-bounce" />
                  </div>
                  <h2 className="text-2xl font-bold text-green-500 mb-2">Analysis Complete!</h2>
                  <p className="text-muted-foreground">Preparing your interactive insights board...</p>
                </motion.div>
              ) : analysis?.status === 'failed' ? (
                <motion.div key="failed" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center py-6">
                  <div className="w-20 h-20 bg-destructive/20 rounded-full flex items-center justify-center mb-6 text-destructive shadow-lg shadow-destructive/10">
                    <AlertCircle className="w-10 h-10 animate-pulse" />
                  </div>
                  <h2 className="text-2xl font-bold text-destructive mb-2">Analysis Failed</h2>
                  <p className="text-muted-foreground mb-6">We encountered an error processing this request.</p>
                  <Button variant="outline" onClick={() => setPollingId(null)}>Try Again</Button>
                </motion.div>
              ) : (
                <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
                  <div className="relative mb-8">
                    <div className="w-24 h-24 rounded-full border-4 border-muted flex items-center justify-center">
                      <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    </div>
                    <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-[spin_1.5s_linear_infinite] opacity-70" />
                  </div>
                  
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    {STEPS[Math.min(activeStep, 5)]}
                  </h2>
                  <div className="w-full max-w-md bg-muted rounded-full h-2.5 mb-8 overflow-hidden shadow-inner">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-primary to-secondary"
                      initial={{ width: "10%" }}
                      animate={{ width: `${progressPct}%` }}
                      transition={{ type: "spring", stiffness: 80, damping: 15 }}
                    />
                  </div>

                  {/* Progressive step-by-step checker */}
                  <div className="w-full max-w-md mx-auto space-y-4 text-left border border-border/50 bg-background/30 p-6 rounded-xl backdrop-blur-sm">
                    {STEPS.map((step, idx) => {
                      const isCompleted = idx < activeStep;
                      const isActive = idx === activeStep;
                      const isPending = idx > activeStep;
                      return (
                        <motion.div 
                          key={step} 
                          className="flex items-center gap-3 transition-opacity duration-300"
                          initial={{ opacity: 0.3 }}
                          animate={{ opacity: isCompleted || isActive ? 1 : 0.3 }}
                        >
                          <div className="relative flex items-center justify-center shrink-0">
                            {isCompleted ? (
                              <motion.div 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-5 h-5 bg-green-500/20 rounded-full flex items-center justify-center text-green-500"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </motion.div>
                            ) : isActive ? (
                              <div className="w-5 h-5 rounded-full border border-primary flex items-center justify-center">
                                <span className="w-2.5 h-2.5 bg-primary rounded-full animate-ping" />
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-full border border-muted/70 flex items-center justify-center text-muted-foreground/60 text-[10px] font-mono">
                                {idx + 1}
                              </div>
                            )}
                          </div>
                          <span className={`text-sm ${
                            isCompleted ? "text-muted-foreground line-through decoration-muted-foreground/30" : 
                            isActive ? "text-foreground font-semibold" : "text-muted-foreground/50"
                          }`}>
                            {step}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 glass-panel p-1 rounded-xl shadow-inner">
              <TabsTrigger value="url" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-3 cursor-pointer">
                <LinkIcon className="w-4 h-4 mr-2" />
                Product URL
              </TabsTrigger>
              <TabsTrigger value="csv" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-3 cursor-pointer">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Raw CSV Upload
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="url" className="mt-0">
              <Card className="glass-panel border-border/50 shadow-md">
                <CardContent className="p-8">
                  <form onSubmit={handleUrlSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="url">Product URL</Label>
                      <div className="input-focus-glow rounded-md">
                        <Input 
                          id="url"
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          placeholder="https://example.com/product/123"
                          className="font-mono bg-muted/50 h-12"
                          data-testid="input-analyze-url"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Supported: Amazon, Shopify, or generic e-commerce product pages.</p>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full h-12 text-lg data-glow" 
                      disabled={!url.trim() || createMutation.isPending}
                      data-testid="button-submit-url"
                    >
                      {createMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Activity className="w-5 h-5 mr-2" />}
                      Start Analysis
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="csv" className="mt-0">
              <Card className="glass-panel border-border/50 shadow-md">
                <CardContent className="p-8">
                  <form onSubmit={handleCsvSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="productName">Product Name</Label>
                      <div className="input-focus-glow rounded-md">
                        <Input 
                          id="productName"
                          value={productName}
                          onChange={(e) => setProductName(e.target.value)}
                          placeholder="e.g. Wireless Noise-Cancelling Headphones"
                          className="bg-muted/50 h-11"
                          data-testid="input-product-name"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="csvText">CSV Data</Label>
                      <div className="text-xs font-mono bg-muted p-3 rounded text-muted-foreground mb-2">
                        Expected format:<br/>
                        review,rating,date<br/>
                        "Great product",5,2023-10-01<br/>
                        "Terrible battery",1,2023-10-05
                      </div>
                      <div className="input-focus-glow rounded-md">
                        <Textarea 
                          id="csvText"
                          value={csvText}
                          onChange={(e) => setCsvText(e.target.value)}
                          placeholder="Paste your CSV content here..."
                          className="font-mono bg-muted/50 min-h-[200px]"
                          data-testid="input-csv-text"
                        />
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full h-12 text-lg data-glow" 
                      disabled={!csvText.trim() || !productName.trim() || uploadMutation.isPending}
                      data-testid="button-submit-csv"
                    >
                      {uploadMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Activity className="w-5 h-5 mr-2" />}
                      Process CSV Data
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
  );
}
