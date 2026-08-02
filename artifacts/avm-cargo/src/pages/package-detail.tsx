import React, { useState } from 'react';
import { useParams, Link } from 'wouter';
import { useGetPackage, useUpdatePackage } from '@workspace/api-client-react';
import { getGetPackageQueryKey } from '@workspace/api-client-react';
import { PackageTimeline } from '@/components/package-timeline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Box, Weight, DollarSign, PenSquare, Save, X, Info } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { CATEGORY_COLORS, getStatusCategory, CATEGORY_LABELS } from '@/lib/status';

export default function PackageDetail() {
  const { id } = useParams<{ id: string }>();
  const packageId = parseInt(id, 10);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState('');

  const { data: pkg, isLoading } = useGetPackage(packageId, {
    query: {
      enabled: !isNaN(packageId),
      queryKey: getGetPackageQueryKey(packageId),
    }
  });

  const updatePackage = useUpdatePackage();

  const handleSaveDesc = () => {
    if (!pkg) return;
    updatePackage.mutate(
      { id: pkg.id, data: { description: descValue } },
      {
        onSuccess: (updated) => {
          setIsEditingDesc(false);
          queryClient.setQueryData(getGetPackageQueryKey(pkg.id), (old: any) => 
            old ? { ...old, description: updated.description } : old
          );
          toast({ title: "Сохранено", description: "Описание посылки обновлено." });
        }
      }
    );
  };

  const startEditing = () => {
    if (pkg) {
      setDescValue(pkg.description || '');
      setIsEditingDesc(true);
    }
  };

  if (isLoading) {
    return <div className="p-8 max-w-4xl mx-auto space-y-6 animate-pulse">
      <div className="h-10 bg-muted/50 rounded w-1/4"></div>
      <div className="h-64 bg-muted/50 rounded-xl"></div>
    </div>;
  }

  if (!pkg) {
    return <div className="p-8 text-center">Посылка не найдена</div>;
  }

  const category = getStatusCategory(pkg.status);
  const isAdmin = user?.role === 'admin';

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <div className="mb-6">
        <Link href={isAdmin ? "/admin" : "/dashboard"}>
          <Button variant="ghost" className="gap-2 -ml-4 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            Назад
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border shadow-sm rounded-xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1 block">
                  Трек-номер
                </span>
                <h1 className="text-3xl font-mono font-black tracking-tight">
                  {pkg.trackingNumber}
                </h1>
              </div>
              <div className={`px-4 py-1.5 text-sm font-bold rounded-full border self-start ${CATEGORY_COLORS[category]}`}>
                {CATEGORY_LABELS[category]}
              </div>
            </div>

            <div className="bg-muted/30 border border-border rounded-lg p-5 mb-8">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-2">
                  <Box className="w-4 h-4" />
                  Описание вложения
                </h3>
                {pkg.userId === user?.id && !isEditingDesc && (
                  <Button variant="ghost" size="sm" onClick={startEditing} className="h-8 gap-1">
                    <PenSquare className="w-3.5 h-3.5" />
                    Изменить
                  </Button>
                )}
              </div>
              
              {isEditingDesc ? (
                <div className="flex gap-2">
                  <Input 
                    value={descValue}
                    onChange={e => setDescValue(e.target.value)}
                    placeholder="Например: Чехлы для телефона, 10 шт"
                    className="bg-background"
                    autoFocus
                  />
                  <Button size="icon" onClick={handleSaveDesc} disabled={updatePackage.isPending}>
                    <Save className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => setIsEditingDesc(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <p className="text-lg font-medium">
                  {pkg.description || <span className="text-muted-foreground italic">Без описания</span>}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-background border border-border rounded-lg p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 dark:bg-orange-900/30 dark:text-orange-500 shrink-0">
                  <Weight className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Вес</span>
                  <span className="text-lg font-bold">
                    {pkg.weight != null ? `${pkg.weight} кг` : '—'}
                  </span>
                </div>
              </div>
              
              <div className="bg-background border border-border rounded-lg p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-500 shrink-0">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Стоимость</span>
                  <span className="text-lg font-bold">
                    {pkg.deliveryCost != null ? `${pkg.deliveryCost} ₸` : '—'}
                  </span>
                </div>
              </div>
            </div>

            {pkg.adminComment && (
              <div className="mt-6 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-4 flex gap-3 text-amber-900 dark:text-amber-200">
                <Info className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold mb-1">Комментарий администрации</h4>
                  <p className="text-sm">{pkg.adminComment}</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-card border border-border shadow-sm rounded-xl p-6">
            <h2 className="text-xl font-bold mb-6 border-b border-border pb-4">Идентификация</h2>
            <div className="flex flex-col sm:flex-row items-center gap-8">
              <div className="bg-white p-3 rounded-xl shadow-sm border border-border shrink-0">
                <QRCodeSVG 
                  value={pkg.trackingNumber} 
                  size={120}
                  bgColor={"#ffffff"}
                  fgColor={"#000000"}
                  level={"M"}
                />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-muted-foreground mb-2 text-sm">
                  Этот QR-код содержит трек-номер. Используется сотрудниками склада для быстрого сканирования.
                </p>
                <div className="inline-block bg-muted px-3 py-1.5 rounded-md font-mono text-sm font-semibold">
                  {pkg.trackingNumber}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline Sidebar */}
        <div className="bg-card border border-border shadow-sm rounded-xl p-6">
          <h2 className="text-xl font-bold mb-6 border-b border-border pb-4">История движения</h2>
          <PackageTimeline detail={pkg} />
        </div>
      </div>
    </div>
  );
}
