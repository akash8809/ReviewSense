import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { Activity, ArrowRight, Zap, Target, BarChart3, Database } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-[100dvh] bg-background text-foreground selection:bg-primary/30">
      <div className="noise-overlay" />
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 glass-panel border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-bold text-xl">
            <Activity className="w-6 h-6" />
            ReviewSense
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Link href="/dashboard" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Log in
                </Link>
                <Link href="/signup" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-40 pb-20 px-6 relative overflow-hidden">
        {/* Glow effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[120px] opacity-50 pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] bg-secondary/20 rounded-full blur-[100px] opacity-30 pointer-events-none" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-xs font-medium text-muted-foreground mb-8 border border-border">
              <span className="flex w-2 h-2 rounded-full bg-primary animate-pulse" />
              v2.0 Analysis Engine Live
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-tight">
              Decode the noise.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                Discover the signal.
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Upload hundreds of customer reviews or a product URL. Our AI engine extracts sentiment, identifies hidden trends, and predicts future product performance in seconds.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link href={isAuthenticated ? "/dashboard" : "/signup"} className="inline-flex items-center justify-center rounded-md text-base font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8 py-3 data-glow shadow-lg shadow-primary/25">
                Start Analyzing
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Abstract Data Visual */}
        <div className="max-w-6xl mx-auto mt-20 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" />
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="w-full h-[400px] border border-border/50 rounded-xl glass-panel relative overflow-hidden flex"
          >
            {/* Mock Dashboard UI */}
            <div className="w-1/3 border-r border-border/50 p-6 flex flex-col gap-4 opacity-70">
              <div className="h-4 w-24 bg-primary/20 rounded animate-pulse" />
              <div className="h-2 w-full bg-muted rounded" />
              <div className="h-2 w-4/5 bg-muted rounded" />
              <div className="mt-8 flex gap-4">
                <div className="w-16 h-16 rounded-full border-4 border-primary/40 border-t-primary animate-spin" style={{ animationDuration: '3s' }} />
                <div className="flex flex-col justify-center gap-2">
                  <div className="h-3 w-16 bg-primary/40 rounded" />
                  <div className="h-4 w-24 bg-muted rounded" />
                </div>
              </div>
            </div>
            <div className="flex-1 p-6 flex items-end gap-2 opacity-70">
              {[40, 70, 45, 90, 65, 85, 100, 75, 50, 80].map((h, i) => (
                <motion.div 
                  key={i} 
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ duration: 1, delay: 0.5 + (i * 0.1) }}
                  className="flex-1 bg-gradient-to-t from-secondary/20 to-secondary/80 rounded-t-sm"
                />
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 border-t border-border/50 relative">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={Target} 
              title="Precision Extraction" 
              desc="Our NLP models slice through sarcasm and slang to determine exactly what customers hate and love." 
            />
            <FeatureCard 
              icon={BarChart3} 
              title="Predictive Forecasting" 
              desc="Don't just look at the past. Get AI-driven projections on next month's rating and satisfaction trajectory." 
            />
            <FeatureCard 
              icon={Database} 
              title="Instant Reporting" 
              desc="Generate beautiful, boardroom-ready PDF and CSV reports with one click. Never copy-paste again." 
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border text-center text-muted-foreground text-sm">
        <p>© {new Date().getFullYear()} ReviewSense AI. A portfolio project.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="p-8 rounded-xl border border-border/50 glass-panel hover:border-primary/50 transition-colors group">
      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors text-primary">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">
        {desc}
      </p>
    </div>
  );
}
