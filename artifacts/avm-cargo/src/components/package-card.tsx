import React from 'react';
import { Package, useUpdatePackage } from '@workspace/api-client-react';
import { STATUS_LABELS, STATUS_COLORS, STATUS_DOT_COLORS, getStatusCategory, CATEGORY_LABELS, CATEGORY_COLORS } from '@/lib/status';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { Package as PackageIcon, Copy, Trash2, Edit2, Check, ArrowRight } from 'lucide-react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface PackageCardProps {
  pkg: Package;
  onDelete?: (id: number) => void;
  isAdmin?: boolean;
}

export function PackageCard({ pkg, onDelete, isAdmin }: PackageCardProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const copyTracking = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(pkg.trackingNumber);
    toast({
      title: "Скопировано",
      description: "Трек-номер скопирован в буфер обмена.",
    });
  };

  const navigateToDetail = () => {
    setLocation(`/package/${pkg.id}`);
  };

  const category = getStatusCategory(pkg.status);

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={navigateToDetail}
      className="group relative block bg-white dark:bg-card border border-border rounded-lg p-5 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden"
      data-testid={`card-package-${pkg.id}`}
    >
      <div className={`absolute top-0 left-0 w-1 h-full ${STATUS_DOT_COLORS[pkg.status]}`} />
      
      <div className="flex justify-between items-start mb-4 pl-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono font-bold text-lg text-foreground tracking-tight">
              {pkg.trackingNumber}
            </span>
            <button
              onClick={copyTracking}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
              title="Копировать"
              data-testid={`btn-copy-${pkg.id}`}
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          
          <p className="text-sm text-muted-foreground font-medium line-clamp-1">
            {pkg.description || "Без описания"}
          </p>
        </div>

        <div className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${CATEGORY_COLORS[category]}`}>
          {CATEGORY_LABELS[category]}
        </div>
      </div>

      <div className="pl-3 mb-4 flex flex-wrap gap-4 text-sm">
        {pkg.weight != null && (
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Вес</span>
            <span className="font-semibold">{pkg.weight} кг</span>
          </div>
        )}
        {pkg.deliveryCost != null && (
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Стоимость</span>
            <span className="font-semibold">{pkg.deliveryCost} ₸</span>
          </div>
        )}
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Добавлено</span>
          <span className="font-medium text-foreground/80">
            {format(new Date(pkg.createdAt), 'd MMM yyyy', { locale: ru })}
          </span>
        </div>
      </div>

      <div className="pl-3 flex items-center justify-between border-t border-border/50 pt-4">
        <div className="flex items-center gap-2">
          <div className="relative flex h-3 w-3">
            {(category === 'transit' || category === 'pending') && (
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${STATUS_DOT_COLORS[pkg.status]}`}></span>
            )}
            <span className={`relative inline-flex rounded-full h-3 w-3 ${STATUS_DOT_COLORS[pkg.status]}`}></span>
          </div>
          <span className="text-sm font-semibold text-foreground/90">
            {STATUS_LABELS[pkg.status]}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {isAdmin && pkg.user && (
            <span className="text-xs font-medium bg-muted px-2 py-1 rounded text-muted-foreground truncate max-w-[100px]" title={pkg.user.name}>
              {pkg.user.name}
            </span>
          )}
          
          {onDelete && pkg.status === 'preparation' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mr-2"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(pkg.id);
              }}
              data-testid={`btn-delete-${pkg.id}`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          
          <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
        </div>
      </div>
    </motion.div>
  );
}
