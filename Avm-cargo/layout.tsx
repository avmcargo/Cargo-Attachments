import { ReactNode, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { LayoutDashboard, LogOut, Bell, Settings } from "lucide-react";
import avmLogo from "@assets/IMG-20260623-WA0021_1785654223496.jpg";
import { Button } from "./ui/button";
import { getListNotificationsQueryKey, useLogout, useListNotifications, useMarkNotificationRead } from "@workspace/api-client-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Check } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const logoutMutation = useLogout();
  const markRead = useMarkNotificationRead();
  const queryClient = useQueryClient();
  
  const { data: notifications } = useListNotifications({
    query: {
      enabled: !!user,
      queryKey: getListNotificationsQueryKey(),
    }
  });

  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        logout();
        setLocation("/login");
      }
    });
  };

  const handleMarkRead = (id: number, packageId: number | null | undefined) => {
    markRead.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
        if (packageId) {
          setLocation(`/package/${packageId}`);
        }
      }
    });
  };

  const NotificationsDropdown = () => (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full hover:bg-muted" data-testid="btn-notifications">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full ring-2 ring-card" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-bold">Уведомления</h3>
          {unreadCount > 0 && (
            <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
              {unreadCount} новых
            </span>
          )}
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {!notifications || notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Нет уведомлений
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map(n => (
                <div 
                  key={n.id} 
                  className={`p-4 cursor-pointer transition-colors hover:bg-muted/50 ${!n.read ? 'bg-primary/5' : ''}`}
                  onClick={() => handleMarkRead(n.id, n.packageId)}
                >
                  <p className={`text-sm ${!n.read ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                    {n.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(n.createdAt), 'd MMM HH:mm', { locale: ru })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [isLoading, user, setLocation]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Загрузка...</div>;
  }

  if (!user) {
    return null;
  }

  const isAdmin = user.role === 'admin';
  const dashboardLink = isAdmin ? "/admin" : "/dashboard";

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex w-64 bg-sidebar text-sidebar-foreground flex-col border-r border-sidebar-border">
        <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
          <Link href="/" className="flex items-center gap-2 cursor-pointer">
            <img src={avmLogo} alt="AVM CARGO" className="h-10 w-10 rounded object-cover" />
            <span className="text-sidebar-foreground font-extrabold tracking-tight text-lg leading-none">AVM<br/><span className="text-[10px] font-semibold tracking-widest opacity-70">CARGO</span></span>
          </Link>
        </div>
        
        <nav className="flex-1 py-6 px-4 flex flex-col gap-2">
          <Link href={dashboardLink}>
            <div className={`flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-colors ${location === dashboardLink ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}>
              <LayoutDashboard className="w-5 h-5" />
              <span className="font-medium">Главная</span>
            </div>
          </Link>

          {isAdmin && (
            <Link href="/admin/settings">
              <div className={`flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-colors ${location === '/admin/settings' ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}>
                <Settings className="w-5 h-5" />
                <span className="font-medium">Настройки</span>
              </div>
            </Link>
          )}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col">
              <span className="text-sm font-semibold truncate max-w-[150px]">{user.name}</span>
              <span className="text-xs text-sidebar-foreground/60">{user.phone}</span>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={handleLogout}
            data-testid="btn-logout"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Выйти
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between h-14 bg-sidebar text-sidebar-foreground px-4 border-b border-sidebar-border sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2 cursor-pointer">
          <img src={avmLogo} alt="AVM CARGO" className="h-8 w-8 rounded object-cover" />
          <span className="text-sidebar-foreground font-extrabold tracking-tight text-base">AVM CARGO</span>
        </Link>
        <div className="flex items-center gap-4">
          <NotificationsDropdown />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col w-full min-h-0">
        {/* Desktop Header */}
        <header className="hidden md:flex h-16 items-center justify-end px-8 border-b border-border bg-card">
          <NotificationsDropdown />
        </header>
        
        <div className="flex-1 p-4 md:p-8 bg-background">
          {children}
        </div>
        
        {/* Mobile Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around px-2 z-50">
          <Link href={dashboardLink}>
            <div className={`flex flex-col items-center justify-center w-full h-full gap-1 ${location === dashboardLink ? 'text-primary' : 'text-muted-foreground'}`}>
              <LayoutDashboard className="w-5 h-5" />
              <span className="text-[10px] font-medium">Главная</span>
            </div>
          </Link>
          <div 
            onClick={handleLogout}
            className="flex flex-col items-center justify-center w-full h-full gap-1 text-muted-foreground"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-[10px] font-medium">Выйти</span>
          </div>
        </nav>
      </main>
    </div>
  );
}
