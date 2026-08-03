import React, { useCallback, useEffect, useRef, useState } from 'react';
import { 
  useGetStats, 
  useListPackages, 
  useUpdatePackage, 
  useExportPackages,
  useAddPackageStatus,
  useDeletePackage,
  useCreatePackage,
} from '@workspace/api-client-react';
import { getGetStatsQueryKey, getListPackagesQueryKey, getExportPackagesQueryKey } from '@workspace/api-client-react';
import { PackageCard } from '@/components/package-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Download, 
  Upload, 
  ScanLine, 
  Search, 
  Package, 
  Truck, 
  CheckCircle2, 
  Archive,
  MoreVertical,
  Edit,
  Trash
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { STATUS_LABELS, STATUS_ORDER } from '@/lib/status';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function AdminDashboard() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingPackage, setEditingPackage] = useState<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importStatus, setImportStatus] = useState('preparation');
  const [importing, setImporting] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [manualTracking, setManualTracking] = useState('');
  const [manualStatus, setManualStatus] = useState('preparation');
  const [manualUpdating, setManualUpdating] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: stats } = useGetStats({
    query: { queryKey: getGetStatsQueryKey() }
  });

  const { data: packages = [], isLoading } = useListPackages(
    { 
      search: search || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined
    },
    { query: { queryKey: getListPackagesQueryKey({ search, status: statusFilter }) } }
  );

  const exportPackages = useExportPackages({
    query: { enabled: false, queryKey: getExportPackagesQueryKey() }
  });
  
  const updatePackage = useUpdatePackage();
  const addStatus = useAddPackageStatus();
  const deletePackage = useDeletePackage();
  const createPackage = useCreatePackage();

  const updateByTrackingNumber = useCallback(async (trackingNumber: string, status: string) => {
    const normalizedTracking = trackingNumber.trim();
    if (!normalizedTracking) return;

    const response = await fetch(
      `${import.meta.env.BASE_URL}api/packages?search=${encodeURIComponent(normalizedTracking)}`.replace('//', '/'),
      { credentials: 'include' },
    );
    if (!response.ok) {
      throw new Error('Не удалось выполнить поиск посылки');
    }

    const foundPackages = await response.json();
    const pkg = foundPackages.find(
      (item: any) => item.trackingNumber.toLowerCase() === normalizedTracking.toLowerCase(),
    );
    if (!pkg) {
      const createdPackage = await createPackage.mutateAsync({
        data: {
          trackingNumber: normalizedTracking,
          status: status as any,
        },
      });
      setSearch(normalizedTracking);
      setStatusFilter('all');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListPackagesQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() }),
      ]);
      return createdPackage;
    }

    await addStatus.mutateAsync({ id: pkg.id, data: { status: status as any } });
    setSearch(normalizedTracking);
    setStatusFilter('all');
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getListPackagesQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() }),
    ]);
    return pkg;
  }, [addStatus, createPackage, queryClient]);

  const handleScannedNumber = useCallback(async (trackingNumber: string) => {
    try {
      await updateByTrackingNumber(trackingNumber, 'delivered');
      setScannerOpen(false);
      toast({
        title: "Посылка доставлена",
        description: `Трек-номер ${trackingNumber} переведён в статус «Доставлен».`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка сканирования",
        description: error.message || "Не удалось сохранить статус.",
      });
    }
  }, [toast, updateByTrackingNumber]);

  const handleManualStatusUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    const trackingNumber = manualTracking.trim();
    if (!trackingNumber) return;

    setManualUpdating(true);
    try {
      await updateByTrackingNumber(trackingNumber, manualStatus);
      toast({
        title: "Посылка сохранена",
        description: `${trackingNumber}: ${STATUS_LABELS[manualStatus as keyof typeof STATUS_LABELS]}`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось обновить статус.",
      });
    } finally {
      setManualUpdating(false);
    }
  };

  const handleExport = async () => {
    try {
      const { data } = await exportPackages.refetch();
      if (!data) return;
      
      // Realistically we'd use xlsx library here, but we'll create a simple JSON download
      // or CSV string for the sake of frontend implementation.
      const blob = new Blob([JSON.stringify(data.packages, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `avm_cargo_export_${format(new Date(), 'yyyy-MM-dd')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({ title: "Экспорт завершен", description: "Файл начал скачиваться." });
    } catch (e) {
      toast({ variant: "destructive", title: "Ошибка", description: "Не удалось экспортировать данные." });
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('status', importStatus);

    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/packages/import`.replace('//', '/'), {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Import failed");
      }
      
      const result = await res.json();
      toast({ 
        title: "Импорт завершён", 
        description: `Обновлено: ${result.updated}. Создано: ${result.created}. Ошибок: ${result.errors?.length || 0}`
      });
      
      setImportDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListPackagesQueryKey() });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Ошибка импорта", description: error.message || "Не удалось импортировать файл." });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleStatusChange = (id: number, newStatus: any) => {
    addStatus.mutate(
      { id, data: { status: newStatus } },
      {
        onSuccess: () => {
          toast({ title: "Статус обновлен" });
          queryClient.invalidateQueries({ queryKey: getListPackagesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
        }
      }
    );
  };

  const handleDelete = (id: number) => {
    if (!confirm("Удалить посылку безвозвратно?")) return;
    deletePackage.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Удалено" });
        queryClient.invalidateQueries({ queryKey: getListPackagesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
      }
    });
  };

  return (
    <div className="max-w-7xl mx-auto pb-20">
      <ImportDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        importStatus={importStatus}
        setImportStatus={setImportStatus}
        fileInputRef={fileInputRef}
        importing={importing}
      />
      <ScannerDialog
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScannedNumber}
      />
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Панель управления</h1>
          <p className="text-muted-foreground mt-1 font-medium">Обзор всей логистики</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleExport} data-testid="btn-export">
            <Download className="w-4 h-4" />
            Экспорт
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setImportDialogOpen(true)} data-testid="btn-import">
            <Upload className="w-4 h-4" />
            Импорт
          </Button>
          <input 
            type="file" 
            className="hidden" 
            ref={fileInputRef} 
            accept=".xlsx,.xls,.csv" 
            onChange={handleImportFile}
          />
          <Button
            className="gap-2 font-bold"
            onClick={() => setScannerOpen(true)}
            data-testid="btn-scan"
          >
            <ScanLine className="w-4 h-4" />
            Сканировать
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Всего посылок</h3>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black">{stats?.total || 0}</p>
        </div>
        
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-sm font-semibold text-muted-foreground">В пути</h3>
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black">{stats?.active || 0}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Переданы курьеру</h3>
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-600 dark:text-emerald-500">{stats?.readyPickup || 0}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-sm font-semibold text-muted-foreground">В архиве</h3>
            <div className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg">
              <Archive className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black">{stats?.archived || 0}</p>
        </div>
      </div>

      {/* Filters and List */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <form
          onSubmit={handleManualStatusUpdate}
          className="p-4 border-b border-border bg-muted/20"
        >
          <div className="mb-3">
            <h2 className="font-bold">Ручной поиск и смена статуса</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Введите трек-номер, выберите статус и нажмите «Применить».
            </p>
          </div>
          <div className="flex flex-col lg:flex-row gap-3">
            <Input
              value={manualTracking}
              onChange={(event) => setManualTracking(event.target.value)}
              placeholder="Введите трек-номер"
              className="flex-1 bg-background font-mono"
              data-testid="input-manual-tracking"
            />
            <Select value={manualStatus} onValueChange={setManualStatus}>
              <SelectTrigger className="w-full lg:w-72 bg-background">
                <SelectValue placeholder="Выберите статус" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_ORDER.map(status => (
                  <SelectItem key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="submit"
              disabled={!manualTracking.trim() || manualUpdating}
              className="lg:min-w-44"
              data-testid="btn-manual-status"
            >
              {manualUpdating ? "Обновление…" : "Применить статус"}
            </Button>
          </div>
        </form>
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Поиск по трек-номеру, имени клиента, телефону..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-10 bg-muted/50"
              data-testid="input-admin-search"
            />
          </div>
          <div className="w-full sm:w-64">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 bg-muted/50">
                <SelectValue placeholder="Все статусы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                {STATUS_ORDER.map(s => (
                  <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted text-muted-foreground text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-4 rounded-tl-xl">Трек-номер</th>
                <th className="px-6 py-4">Клиент</th>
                <th className="px-6 py-4">Статус</th>
                <th className="px-6 py-4">Вес/Стоимость</th>
                <th className="px-6 py-4">Дата</th>
                <th className="px-6 py-4 text-right rounded-tr-xl">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">Загрузка...</td>
                </tr>
              ) : packages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">Посылки не найдены</td>
                </tr>
              ) : (
                packages.map(pkg => (
                  <tr key={pkg.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-mono font-bold">{pkg.trackingNumber}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1 max-w-[200px] mt-0.5">
                        {pkg.description || "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold">{pkg.user?.name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{pkg.user?.phone || "—"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <Select 
                        value={pkg.status} 
                        onValueChange={(val) => handleStatusChange(pkg.id, val)}
                      >
                        <SelectTrigger className="h-8 text-xs font-semibold max-w-[200px] bg-background border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_ORDER.map(s => (
                            <SelectItem key={s} value={s} className="text-xs">
                              {STATUS_LABELS[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-6 py-4">
                      <div>{pkg.weight ? `${pkg.weight} кг` : "—"}</div>
                      <div className="font-semibold">{pkg.deliveryCost ? `${pkg.deliveryCost} ₸` : "—"}</div>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(pkg.createdAt), 'dd.MM.yyyy')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => window.open(`/package/${pkg.id}`, '_blank')}>
                            Открыть карточку
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditingPackage(pkg)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Редактировать
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:bg-destructive/10" onClick={() => handleDelete(pkg.id)}>
                            <Trash className="h-4 w-4 mr-2" />
                            Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Edit Dialog */}
      {editingPackage && (
        <EditPackageDialog 
          pkg={editingPackage} 
          onClose={() => setEditingPackage(null)} 
          onSave={(data: any) => {
            updatePackage.mutate(
              { id: editingPackage.id, data },
              {
                onSuccess: () => {
                  toast({ title: "Сохранено", description: "Данные посылки обновлены." });
                  queryClient.invalidateQueries({ queryKey: getListPackagesQueryKey() });
                  setEditingPackage(null);
                }
              }
            );
          }} 
          isPending={updatePackage.isPending}
        />
      )}
    </div>
  );
}

function ScannerDialog({ open, onClose, onScan }: {
  open: boolean;
  onClose: () => void;
  onScan: (trackingNumber: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const [manualNumber, setManualNumber] = useState('');
  const [cameraMessage, setCameraMessage] = useState('Запрашиваем доступ к камере…');

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const stopCamera = () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };

    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraMessage('Камера недоступна в этом браузере. Используйте ручной ввод.');
        return;
      }

      try {
        const BarcodeDetectorConstructor = (
          window as Window & {
            BarcodeDetector?: new (options?: { formats?: string[] }) => {
              detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
            };
          }
        ).BarcodeDetector;

        if (!BarcodeDetectorConstructor) {
          setCameraMessage('Автоматическое распознавание не поддерживается. Введите номер вручную.');
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraMessage('Наведите камеру на QR-код или штрихкод');

        const detector = new BarcodeDetectorConstructor({
          formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'data_matrix', 'pdf417', 'aztec'],
        });

        const detectFrame = async () => {
          if (cancelled || !videoRef.current || videoRef.current.readyState < 2) {
            if (!cancelled) frameRef.current = requestAnimationFrame(() => void detectFrame());
            return;
          }

          try {
            const results = await detector.detect(videoRef.current);
            const value = results.find(result => result.rawValue?.trim())?.rawValue?.trim();
            if (value) {
              onScan(value);
              return;
            }
          } catch {
            // Keep scanning; a partially visible code can fail detection for a frame.
          }

          if (!cancelled) frameRef.current = requestAnimationFrame(() => void detectFrame());
        };

        frameRef.current = requestAnimationFrame(() => void detectFrame());
      } catch (error) {
        if (!cancelled) {
          setCameraMessage(
            error instanceof DOMException && error.name === 'NotAllowedError'
              ? 'Доступ к камере запрещён. Разрешите камеру или введите номер вручную.'
              : 'Не удалось открыть камеру. Введите номер вручную.',
          );
        }
      }
    };

    void startCamera();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open, onScan]);

  const handleManualSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = manualNumber.trim();
    if (value) onScan(value);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Сканировать трек-номер</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-xl bg-slate-950 aspect-video">
            <video
              ref={videoRef}
              muted
              playsInline
              className="h-full w-full object-cover"
              aria-label="Изображение с камеры"
            />
            <div className="pointer-events-none absolute inset-8 rounded-lg border-2 border-white/70" />
            <div className="absolute inset-x-3 bottom-3 rounded-md bg-black/60 px-3 py-2 text-center text-xs text-white">
              {cameraMessage}
            </div>
          </div>
          <div className="text-center text-sm text-muted-foreground">или введите номер вручную</div>
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <Input
              value={manualNumber}
              onChange={(event) => setManualNumber(event.target.value)}
              placeholder="Трек-номер"
              autoFocus
              className="font-mono"
            />
            <Button type="submit" disabled={!manualNumber.trim()}>
              Найти
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ImportDialog({ open, onClose, importStatus, setImportStatus, fileInputRef, importing }: any) {
  const statuses = [
    { value: 'preparation', label: 'Подготовка к отправке' },
    { value: 'sent_china', label: 'Отправлен с Китайского склада' },
    { value: 'customs', label: 'Проходит таможенное оформление' },
    { value: 'arrived_almaty', label: 'Прибыл в Алматы' },
    { value: 'courier', label: 'Передан курьеру' },
    { value: 'delivered', label: 'Доставлен' },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Импорт трек-номеров из Excel</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <p className="text-sm text-muted-foreground">
            Загрузите файл .xlsx с одной колонкой «Трек Номера». Все посылки получат выбранный статус.
            Если посылка уже есть в базе — статус обновится. Если нет — будет создана.
          </p>
          <div className="space-y-2">
            <label className="text-sm font-semibold">Статус для применения</label>
            <Select value={importStatus} onValueChange={setImportStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statuses.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            className="w-full gap-2"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            <Upload className="w-4 h-4" />
            {importing ? 'Импортируется...' : 'Выбрать файл и импортировать'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditPackageDialog({ pkg, onClose, onSave, isPending }: any) {
  const [weight, setWeight] = useState(pkg.weight?.toString() || '');
  const [cost, setCost] = useState(pkg.deliveryCost?.toString() || '');
  const [comment, setComment] = useState(pkg.adminComment || '');

  return (
    <Dialog open={!!pkg} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Редактирование {pkg.trackingNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Вес (кг)</label>
            <Input type="number" step="0.01" value={weight} onChange={e => setWeight(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Стоимость (₸)</label>
            <Input type="number" value={cost} onChange={e => setCost(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Комментарий администратора</label>
            <Input value={comment} onChange={e => setComment(e.target.value)} placeholder="Виден клиенту" />
          </div>
          <Button 
            className="w-full mt-4" 
            onClick={() => onSave({ 
              weight: weight ? parseFloat(weight) : null,
              deliveryCost: cost ? parseFloat(cost) : null,
              adminComment: comment || null
            })}
            disabled={isPending}
          >
            Сохранить изменения
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
