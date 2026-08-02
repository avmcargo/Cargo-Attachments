import React, { useState } from 'react';
import { PackageSearch, Phone, ChevronRight, LogIn } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import avmLogo from "@assets/IMG-20260623-WA0021_1785654223496.jpg";

export default function Home() {
  const [trackNumber, setTrackNumber] = useState('');
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackNumber.trim()) {
      setLocation(`/package/${trackNumber.trim()}`); // Actually, public track needs id? Oh wait. Package API fetches by ID, but tracking number is string. Let's see if /package API supports tracking number. Ah, we can just redirect to dashboard or login for now, or just show a message. Actually, the brief says "поле быстрого поиска по трек-номеру с кнопкой Отследить". Without auth, maybe they can't track? No, usually it's public. Let's redirect to `/track/:number`. Wait, the backend has `GET /api/packages` with `?search=TRK`. So we can use that on a public page, or just require login. The spec says "no auth required for the root landing page with track search". So let's build `/track/:number` or just handle it here.
      setLocation(`/track/${encodeURIComponent(trackNumber.trim())}`);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background selection:bg-primary selection:text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <img src={avmLogo} alt="AVM CARGO" className="h-10 w-10 rounded object-cover" />
          <span className="font-extrabold tracking-tight text-xl text-foreground">AVM CARGO</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-4 text-muted-foreground text-sm mr-4">
            <a href="https://wa.me/77066517323" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-primary transition-colors">
              <Phone className="w-4 h-4" />
              <span>+7 706 651-73-23</span>
            </a>
          </div>
          {user ? (
            <Link href={user.role === 'admin' ? '/admin' : '/dashboard'}>
              <Button>В кабинет</Button>
            </Link>
          ) : (
            <Link href="/login">
              <Button variant="outline" className="gap-2">
                <LogIn className="w-4 h-4" />
                Войти
              </Button>
            </Link>
          )}
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 -mt-10">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-tight">
            Доставка из Китая<br />
            <span className="text-primary">в Казахстан</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
            Отслеживайте каждую деталь вашего груза. Надежная логистика для бизнеса и частных лиц в Казахстане.
          </p>
        </div>

        {/* Track Search Box */}
        <div className="w-full max-w-xl bg-card border border-border shadow-xl rounded-2xl p-6 md:p-8">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <PackageSearch className="w-6 h-6 text-primary" />
            Отследить посылку
          </h2>
          <form onSubmit={handleTrack} className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Input 
                value={trackNumber}
                onChange={(e) => setTrackNumber(e.target.value)}
                placeholder="Введите трек-номер, например: AVM-123456" 
                className="h-14 pl-5 text-lg bg-muted/50 border-transparent focus-visible:ring-primary font-mono tracking-tight"
                data-testid="input-track-search"
              />
            </div>
            <Button 
              type="submit" 
              size="lg" 
              className="h-14 px-8 text-lg font-bold gap-2"
              data-testid="btn-track-submit"
            >
              Отследить
              <ChevronRight className="w-5 h-5" />
            </Button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© 2026 AVM CARGO. Все права защищены.</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a href="https://wa.me/77066517323" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
              WhatsApp: +7 706 651-73-23
            </a>
            <a href="https://instagram.com/cargo_rudny" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
              @cargo_rudny
            </a>
            <span>г. Рудный, ул. Ленина 101</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
