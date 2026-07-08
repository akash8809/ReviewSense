import React from "react";
import { SidebarLayout } from "@/components/sidebar-layout";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/theme-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Moon, Sun, Monitor, User as UserIcon, Bell } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account preferences and app settings.</p>
        </div>

        <div className="grid gap-8">
          {/* Profile Card */}
          <Card className="glass-panel border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-primary" />
                Profile Information
              </CardTitle>
              <CardDescription>Your personal account details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={user?.name || ""} disabled className="bg-muted/50" />
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input value={user?.email || ""} disabled className="bg-muted/50" />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Input value={user?.role || ""} disabled className="bg-muted/50 capitalize font-mono text-sm" />
              </div>
            </CardContent>
          </Card>

          {/* Appearance Card */}
          <Card className="glass-panel border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="w-5 h-5 text-primary" />
                Appearance
              </CardTitle>
              <CardDescription>Customize how ReviewSense looks on your device.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                  <div className="space-y-0.5">
                    <Label className="text-base">Theme</Label>
                    <p className="text-sm text-muted-foreground">Select your preferred color scheme.</p>
                  </div>
                  <div className="flex bg-background border border-border rounded-md p-1 gap-1">
                    <Button 
                      variant={theme === "light" ? "default" : "ghost"} 
                      size="sm" 
                      onClick={() => setTheme("light")}
                      className="px-3"
                    >
                      <Sun className="w-4 h-4 mr-2" /> Light
                    </Button>
                    <Button 
                      variant={theme === "dark" ? "default" : "ghost"} 
                      size="sm" 
                      onClick={() => setTheme("dark")}
                      className="px-3"
                    >
                      <Moon className="w-4 h-4 mr-2" /> Dark
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notifications Placeholder */}
          <Card className="glass-panel border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Notifications
              </CardTitle>
              <CardDescription>Manage your email alert preferences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                <div className="space-y-0.5">
                  <Label>Analysis Completed</Label>
                  <p className="text-sm text-muted-foreground">Receive an email when a large analysis finishes.</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                <div className="space-y-0.5">
                  <Label>Weekly Digest</Label>
                  <p className="text-sm text-muted-foreground">A summary of your tracked products.</p>
                </div>
                <Switch defaultChecked={false} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
  );
}
