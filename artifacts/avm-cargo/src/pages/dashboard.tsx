import React, { useState } from 'react';
import { useListPackages, useCreatePackage, useDeletePackage } from '@workspace/api-client-react';
import { PackageCard } from '@/components/package-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, QrCode, Search, PackageOpen, LayoutList, Archive } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { QRCodeSVG } from 'qrcode.react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from '@/hooks/use-auth';
import { useQueryClient } from '@tanstack/react-query';
import { getListPackagesQueryKey } from '@workspace/api-client-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [newTrack, setNewTrack] = useState('');
  const [search, setSearch] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const createPackage = useCreatePackage();
  const deletePackage = useDeletePackage();

  // Fetch active packages
  const { data: activePackages = [], isLoading: loadingActive } = useListPackages(
    { archived: false },
    { query: { queryKey: getListPackagesQueryKey({ archived: false }) } }
  );

  // Fetch archived packages
  const { data: archivedPackages = [], isLoading: loadingArchived } = useListPackages(
    { archived: true },
    { query: { queryKey: getListPackagesQueryKey({ archived: true }) } }
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrack.trim()) return;
    
    createPackage.mutate(
      { data: { trackingNumber: newTrack.trim() } },
      {
        onSuccess: () => {
          setNewTrack('');
          toast({ title: "Трек добавлен", description: "Посылка успешно добавлена в список." });
          queryClient.invalidateQueries({ queryKey: getListPackagesQueryKey({ archived: false }) });
        },
        onError: (err: any) => {
          toast({ variant: "destructive", title: "Ошибка", description: err?.error || err?.message || "Не удалось добавить трек" });
        }
      }
    );
  };

  const handleDelete = (id: number) => {
    if (!confirm("Вы уверены, что хотите удалить этот трек?")) return;
    
    deletePackage.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Удалено", description: "Трек успешно удален." });
          queryClient.invalidateQueries({ queryKey: getListPackagesQueryKey({ archived: false }) });
        }
      }
    );
  };

  const filterPackages = (packages: any[]) => {
    if (!search) return packages;
    const lowerSearch = search.toLowerCase();
    return packages.filter(p => 
      p.trackingNumber.toLowerCase().includes(lowerSearch) || 
      (p.description && p.description.toLowerCase().includes(lowerSearch))
    );
  };

  const filteredActive = filterPackages(activePackages);
  const filteredArchived = filterPackages(archivedPackages);

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Мои посылки</h1>
          <p className="text-muted-foreground mt-1 font-medium">Отслеживайте свои грузы из Китая</p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2 font-bold" data-testid="btn-my-qr">
              <QrCode className="w-4 h-4" />
              Мой QR код
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md text-center flex flex-col items-center justify-center p-10">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black mb-4">Код клиента</DialogTitle>
            </DialogHeader>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-border inline-block">
              <QRCodeSVG 
                value={user?.phone || ""} 
                size={200}
                bgColor={"#ffffff"}
                fgColor={"#000000"}
                level={"H"}
              />
            </div>
            <p className="text-muted-foreground mt-6 text-sm max-w-[250px]">
              Покажите этот код на складе для быстрой идентификации
            </p>
            <div className="mt-4 font-mono text-xl font-bold bg-muted px-4 py-2 rounded-lg tracking-wider">
              {user?.phone}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Add new track bar */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm mb-8">
        <form onSubmit={handleCreate} className="flex gap-3">
          <Input 
            placeholder="Введите трек-номер для добавления..." 
            value={newTrack}
            onChange={e => setNewTrack(e.target.value)}
            className="h-12 text-base bg-muted/50 font-mono"
            data-testid="input-new-track"
          />
          <Button 
            type="submit" 
            className="h-12 px-6" 
            disabled={!newTrack.trim() || createPackage.isPending}
            data-testid="btn-add-track"
          >
            <Plus className="w-5 h-5 mr-1" />
            Добавить
          </Button>
        </form>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <TabsList className="h-12 bg-muted p-1">
            <TabsTrigger value="active" className="h-10 px-6 font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <LayoutList className="w-4 h-4 mr-2" />
              Активные
              <span className="ml-2 bg-muted-foreground/10 text-foreground px-2 py-0.5 rounded-full text-xs">{activePackages.length}</span>
            </TabsTrigger>
            <TabsTrigger value="archive" className="h-10 px-6 font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Archive className="w-4 h-4 mr-2" />
              Архив
              <span className="ml-2 bg-muted-foreground/10 text-foreground px-2 py-0.5 rounded-full text-xs">{archivedPackages.length}</span>
            </TabsTrigger>
          </TabsList>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Поиск по номеру..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-card"
              data-testid="input-search-tracks"
            />
          </div>
        </div>

        <TabsContent value="active" className="mt-0 outline-none">
          {loadingActive ? (
            <div className="space-y-4">
              {[1,2,3].map(i => <div key={i} className="h-32 bg-muted/50 rounded-xl animate-pulse" />)}
            </div>
          ) : filteredActive.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredActive.map(pkg => (
                <PackageCard key={pkg.id} pkg={pkg} onDelete={handleDelete} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-card border border-border border-dashed rounded-xl">
              <PackageOpen className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="text-lg font-semibold">Нет активных посылок</h3>
              <p className="text-muted-foreground text-sm mt-1">Добавьте трек-номер выше, чтобы начать отслеживание.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="archive" className="mt-0 outline-none">
          {loadingArchived ? (
            <div className="space-y-4">
              {[1,2].map(i => <div key={i} className="h-32 bg-muted/50 rounded-xl animate-pulse" />)}
            </div>
          ) : filteredArchived.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredArchived.map(pkg => (
                <PackageCard key={pkg.id} pkg={pkg} onDelete={handleDelete} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-card border border-border border-dashed rounded-xl">
              <Archive className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="text-lg font-semibold">Архив пуст</h3>
              <p className="text-muted-foreground text-sm mt-1">Выданные посылки будут отображаться здесь.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
