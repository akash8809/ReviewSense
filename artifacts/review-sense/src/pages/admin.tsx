import React from "react";
import { SidebarLayout } from "@/components/sidebar-layout";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { 
  useAdminGetStats, 
  getAdminGetStatsQueryKey,
  useAdminListUsers,
  getAdminListUsersQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Activity, FileText, Clock, Server } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminPage() {
  const { user } = useAuth();

  if (user?.role !== "admin") {
    return <Redirect to="/dashboard" />;
  }

  const { data: stats, isLoading: statsLoading } = useAdminGetStats({
    query: { queryKey: getAdminGetStatsQueryKey() }
  });

  const { data: usersData, isLoading: usersLoading } = useAdminListUsers({
    query: { queryKey: getAdminListUsersQueryKey() }
  });

  return (
    <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-destructive">Admin Console</h1>
          <p className="text-muted-foreground mt-1">Platform-wide statistics and user management.</p>
        </div>

        {/* Platform Stats */}
        <h2 className="text-xl font-bold">Platform Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard title="Total Users" value={stats?.totalUsers} icon={Users} loading={statsLoading} />
          <StatCard title="Total Analyses" value={stats?.totalAnalyses} icon={Activity} loading={statsLoading} />
          <StatCard title="Total Reviews" value={stats?.totalReviews} icon={FileText} loading={statsLoading} />
          <StatCard title="Analyses (7d)" value={stats?.analysesThisWeek} icon={Server} loading={statsLoading} />
          <StatCard title="Avg Compute Time" value={stats?.avgAnalysisTime ? `${stats.avgAnalysisTime}s` : null} icon={Clock} loading={statsLoading} />
        </div>

        {/* Users List */}
        <h2 className="text-xl font-bold mt-8">Registered Users</h2>
        <Card className="glass-panel border-border/50">
          <CardContent className="p-0">
            {usersLoading ? (
              <div className="p-6 space-y-4">
                {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : usersData ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
                    <tr>
                      <th className="px-6 py-4 font-medium">ID</th>
                      <th className="px-6 py-4 font-medium">Name</th>
                      <th className="px-6 py-4 font-medium">Email</th>
                      <th className="px-6 py-4 font-medium">Role</th>
                      <th className="px-6 py-4 font-medium">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {usersData.map((u: any) => (
                      <tr key={u.id} className="hover:bg-muted/20">
                        <td className="px-6 py-4 font-mono text-muted-foreground">#{u.id}</td>
                        <td className="px-6 py-4 font-medium text-foreground">{u.name}</td>
                        <td className="px-6 py-4">{u.email}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.role === 'admin' ? 'bg-destructive/20 text-destructive' : 'bg-primary/20 text-primary'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono">{new Date(u.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
  );
}

function StatCard({ title, value, icon: Icon, loading }: any) {
  return (
    <Card className="glass-panel border-border/50 relative overflow-hidden border-t-destructive/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="w-4 h-4 text-destructive opacity-80" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-9 w-20" />
        ) : (
          <div className="text-2xl font-bold font-mono text-foreground">
            {value}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
