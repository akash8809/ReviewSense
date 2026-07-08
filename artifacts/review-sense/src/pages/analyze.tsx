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
  
  // Custom polling hook usage
  const { data: analysis, error } = useGetAnalysis(pollingId as number, {
    query: {
      enabled: !!pollingId,
      refetchInterval: (query) => {
        const data = query.state.data;
        if (data && (data.status === 'completed' || data.status === 'failed')) {
          return false;
        }
        return 3000; // poll every 3 seconds
      },
      queryKey: getGetAnalysisQueryKey(pollingId as number)
    }
  });

  // Watch polling state changes
  useEffect(() => {
    if (analysis) {
      if (analysis.status === 'completed') {
        toast({ title: "Analysis Complete", description: "Navigating to results..." });
        setTimeout(() => setLocation(`/result/${analysis.id}`), 1000);
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
      // Very basic CSV parse for the assignment format: review,rating,date
      const lines = csvText.split('\n').filter(l => l.trim().length > 0);
      if (lines.length < 2) throw new Error("Please include headers and at least one row of data.");
      
      const reviews = lines.slice(1).map(line => {
        // Handle basic commas outside quotes (simplistic)
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

  const isPolling = !!pollingId;

  return (
    <SidebarLayout>
      <div className="max-w-3xl mx-auto space-y-8 mt-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-2">New Analysis</h1>
          <p className="text-muted-foreground">Select a data source to begin extracting insights.</p>
        </div>

        {isPolling ? (
          <Card className="glass-panel border-primary/30 p-12 text-center shadow-xl shadow-primary/5">
            <AnimatePresence mode="wait">
              {analysis?.status === 'completed' ? (
                <motion.div key="success" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
                  <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6 text-green-500">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h2 className="text-2xl font-bold text-green-500 mb-2">Analysis Complete!</h2>
                  <p className="text-muted-foreground">Redirecting to your dashboard...</p>
                </motion.div>
              ) : analysis?.status === 'failed' ? (
                <motion.div key="failed" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
                  <div className="w-20 h-20 bg-destructive/20 rounded-full flex items-center justify-center mb-6 text-destructive">
                    <AlertCircle className="w-10 h-10" />
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
                    <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-[spin_2s_linear_infinite] opacity-50" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-4">
                    {analysis?.status === 'pending' ? 'Initializing Engine...' : 'Extracting Insights...'}
                  </h2>
                  <div className="w-full max-w-sm bg-muted rounded-full h-2 mb-2 overflow-hidden">
                    <motion.div 
                      className="h-full bg-primary"
                      initial={{ width: "10%" }}
                      animate={{ width: analysis?.status === 'processing' ? "75%" : "30%" }}
                      transition={{ duration: 2 }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground font-mono">
                    Reading sentences • Detecting sentiment • Building models
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 glass-panel p-1 rounded-xl">
              <TabsTrigger value="url" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-3">
                <LinkIcon className="w-4 h-4 mr-2" />
                Product URL
              </TabsTrigger>
              <TabsTrigger value="csv" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-3">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Raw CSV Upload
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="url" className="mt-0">
              <Card className="glass-panel border-border/50">
                <CardContent className="p-8">
                  <form onSubmit={handleUrlSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="url">Product URL</Label>
                      <Input 
                        id="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://example.com/product/123"
                        className="font-mono bg-muted/50 h-12"
                        data-testid="input-analyze-url"
                      />
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
              <Card className="glass-panel border-border/50">
                <CardContent className="p-8">
                  <form onSubmit={handleCsvSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="productName">Product Name</Label>
                      <Input 
                        id="productName"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        placeholder="e.g. Wireless Noise-Cancelling Headphones"
                        className="bg-muted/50"
                        data-testid="input-product-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="csvText">CSV Data</Label>
                      <div className="text-xs font-mono bg-muted p-2 rounded text-muted-foreground mb-2">
                        Expected format:<br/>
                        review,rating,date<br/>
                        "Great product",5,2023-10-01<br/>
                        "Terrible battery",1,2023-10-05
                      </div>
                      <Textarea 
                        id="csvText"
                        value={csvText}
                        onChange={(e) => setCsvText(e.target.value)}
                        placeholder="Paste your CSV content here..."
                        className="font-mono bg-muted/50 min-h-[200px]"
                        data-testid="input-csv-text"
                      />
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
    </SidebarLayout>
  );
}
