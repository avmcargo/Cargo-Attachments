import React, { useState } from 'react';
import { useListPackages, getListPackagesQueryKey } from '@workspace/api-client-react';
import { useParams, Link } from 'wouter';
import { PackageSearch, ArrowLeft } from 'lucide-react';
import { PackageCard } from '@/components/package-card';
import { Button } from '@/components/ui/button';
import avmLogo from "@assets/IMG-20260623-WA0021_1785654223496.jpg";

export default function TrackPage() {
  const { number } = useParams<{ number: string }>();
  
  const { data: packages, isLoading } = useListPackages(
    { search: number },
    { query: { enabled: !!number, queryKey: getListPackagesQueryKey({ search: number }) } }
  );

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="flex items-center justify-between px-6 py-6 max-w-7xl mx-auto w-full">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <img src={avmLogo} alt="AVM CARGO" className="w-8 h-8 rounded object-cover" />
            <span className="font-extrabold tracking-tight text-xl">AVM CARGO</span>
          </div>
        </Link>
        <Link href="/">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            На главную
          </Button>
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight mb-2">
            Результаты поиска
          </h1>
          <p className="text-muted-foreground text-lg">
            Трек-номер: <span className="font-mono font-bold text-foreground bg-muted px-2 py-1 rounded">{number}</span>
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="h-40 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : packages && packages.length > 0 ? (
          <div className="space-y-4">
            {packages.map(pkg => (
              <PackageCard key={pkg.id} pkg={pkg} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-card border border-border rounded-xl shadow-sm">
            <PackageSearch className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Посылка не найдена</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Проверьте правильность введенного трек-номера или обратитесь в поддержку, если вы уверены, что номер верный.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
