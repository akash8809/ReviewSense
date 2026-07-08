import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { ThemeProvider } from '@/components/theme-provider';
import { motion, AnimatePresence } from 'framer-motion';

// Pages
import LandingPage from './pages/landing';
import LoginPage from './pages/login';
import SignupPage from './pages/signup';
import DashboardPage from './pages/dashboard';
import AnalyzePage from './pages/analyze';
import ResultPage from './pages/result';
import HistoryPage from './pages/history';
import SettingsPage from './pages/settings';
import AdminPage from './pages/admin';
import ComparePage from './pages/compare';
import SharedPage from './pages/shared';

const queryClient = new QueryClient();

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      duration: 0.35, 
      ease: [0.16, 1, 0.3, 1], // easeOutExpo
    } 
  },
  exit: { 
    opacity: 0, 
    y: -12, 
    transition: { 
      duration: 0.25, 
      ease: [0.7, 0, 0.84, 0], // easeInExpo
    } 
  }
};

function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex-1 flex flex-col w-full"
    >
      {children}
    </motion.div>
  );
}

function Router() {
  const [location] = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Switch location={location} key={location}>
        <Route path="/">
          <PageTransition><LandingPage /></PageTransition>
        </Route>
        <Route path="/login">
          <PageTransition><LoginPage /></PageTransition>
        </Route>
        <Route path="/signup">
          <PageTransition><SignupPage /></PageTransition>
        </Route>
        <Route path="/dashboard">
          <PageTransition><DashboardPage /></PageTransition>
        </Route>
        <Route path="/analyze">
          <PageTransition><AnalyzePage /></PageTransition>
        </Route>
        <Route path="/result/:id">
          <PageTransition><ResultPage /></PageTransition>
        </Route>
        <Route path="/history">
          <PageTransition><HistoryPage /></PageTransition>
        </Route>
        <Route path="/settings">
          <PageTransition><SettingsPage /></PageTransition>
        </Route>
        <Route path="/admin">
          <PageTransition><AdminPage /></PageTransition>
        </Route>
        <Route path="/compare">
          <PageTransition><ComparePage /></PageTransition>
        </Route>
        <Route path="/shared/:token">
          <PageTransition><SharedPage /></PageTransition>
        </Route>
        <Route>
          <PageTransition><NotFound /></PageTransition>
        </Route>
      </Switch>
    </AnimatePresence>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="rs_theme">
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
