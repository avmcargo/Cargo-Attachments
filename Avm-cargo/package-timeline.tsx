import React from 'react';
import { Package, PackageDetail, PackageStatus, StatusHistory } from '@workspace/api-client-react';
import { STATUS_LABELS, STATUS_ORDER, STATUS_DOT_COLORS } from '@/lib/status';
import { format } from 'date-fns';
import { Check, CircleDot, PackageCheck } from 'lucide-react';
import { motion } from 'framer-motion';

type TimelinePackage = Package | PackageDetail;

export function PackageTimeline({ detail }: { detail: TimelinePackage }) {
  const currentStatusIndex = STATUS_ORDER.indexOf(detail.status);
  const historyByStatus = new Map<PackageStatus, StatusHistory>();

  detail.history?.forEach((entry) => {
    const previous = historyByStatus.get(entry.status);
    if (!previous || new Date(entry.changedAt).getTime() > new Date(previous.changedAt).getTime()) {
      historyByStatus.set(entry.status, entry);
    }
  });

  // Old records may not have an initial history entry. The package creation
  // date is the correct fallback for the first stage in that case.
  if (!historyByStatus.has("preparation") && detail.createdAt) {
    historyByStatus.set("preparation", {
      id: 0,
      packageId: detail.id,
      status: "preparation",
      changedAt: detail.createdAt,
    });
  }

  if (!historyByStatus.has(detail.status) && detail.updatedAt) {
    historyByStatus.set(detail.status, {
      id: 0,
      packageId: detail.id,
      status: detail.status,
      changedAt: detail.updatedAt,
    });
  }

  return (
    <div className="relative py-1">
      <div className="flex flex-col">
        {STATUS_ORDER.map((status, index) => {
          const isCompleted = index < currentStatusIndex || Boolean(historyByStatus.get(status));
          const isCurrent = index === currentStatusIndex;
          
          const historyEntry = historyByStatus.get(status);
          const isLast = index === STATUS_ORDER.length - 1;
          const markerColor = STATUS_DOT_COLORS[status];
          
          return (
            <motion.div 
              key={status}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08 }}
              className={`relative flex min-h-[76px] gap-4 ${isCompleted || isCurrent ? 'opacity-100' : 'opacity-45'}`}
            >
              {!isLast && (
                <div className="absolute left-[15px] top-9 h-[calc(100%-13px)] w-px bg-border">
                  {index < currentStatusIndex && (
                    <div className={`h-full w-full ${markerColor}`} />
                  )}
                </div>
              )}

              <div className="relative z-10 shrink-0">
                {isCurrent ? (
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${markerColor} shadow-md ring-4 ring-background`}>
                    <CircleDot className="h-4 w-4 text-white" />
                  </div>
                ) : isCompleted ? (
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${markerColor} shadow-sm ring-4 ring-background`}>
                    <Check className="h-4 w-4 text-white" strokeWidth={3} />
                  </div>
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-border bg-background ring-4 ring-background">
                    <div className="h-2 w-2 rounded-full bg-border" />
                  </div>
                )}
              </div>
              
              <div className={`min-w-0 flex-1 pb-6 ${isCurrent ? 'rounded-lg bg-primary/5 px-3 py-2 -mt-2' : ''}`}>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <span className={`text-sm font-bold leading-5 ${isCurrent ? 'text-foreground' : isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {STATUS_LABELS[status]}
                  </span>
                  {isCurrent && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                      Сейчас
                    </span>
                  )}
                </div>
                {historyEntry && (
                  <span className="mt-1 block text-xs font-medium text-muted-foreground">
                    {format(new Date(historyEntry.changedAt), 'dd.MM.yyyy')}
                  </span>
                )}
                {!historyEntry && !isCurrent && (
                  <span className="mt-1 block text-xs text-muted-foreground/70">
                    Ожидается
                  </span>
                )}
                {isCurrent && (
                  <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-primary">
                    <PackageCheck className="h-3.5 w-3.5" />
                    Этап пройден текущим статусом
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
