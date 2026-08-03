import React, { useState } from 'react';
import { PackageDetail, PackageStatus } from '@workspace/api-client-react';
import { STATUS_LABELS, STATUS_ORDER, STATUS_DOT_COLORS } from '@/lib/status';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { CheckCircle2, Circle } from 'lucide-react';
import { motion } from 'framer-motion';

export function PackageTimeline({ detail }: { detail: PackageDetail }) {
  const currentStatusIndex = STATUS_ORDER.indexOf(detail.status);
  const historyByStatus = new Map<PackageStatus, PackageDetail["history"][number]>();

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

  return (
    <div className="relative py-4 pl-4 pr-2">
      <div className="absolute left-[27px] top-6 bottom-6 w-0.5 bg-border z-0" />
      
      <div className="flex flex-col gap-6 relative z-10">
        {STATUS_ORDER.map((status, index) => {
          const isCompleted = index <= currentStatusIndex;
          const isCurrent = index === currentStatusIndex;
          
          const historyEntry = historyByStatus.get(status);
          
          return (
            <motion.div 
              key={status}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex gap-4 items-start ${isCompleted ? 'opacity-100' : 'opacity-40'}`}
            >
              <div className="relative shrink-0 mt-1">
                {isCompleted ? (
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shadow-sm ${STATUS_DOT_COLORS[status]}`}>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-white dark:bg-card border-2 border-border flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-muted" />
                  </div>
                )}
                
                {isCurrent && (
                  <span className={`absolute -inset-1 rounded-full animate-ping opacity-25 ${STATUS_DOT_COLORS[status]}`} />
                )}
              </div>
              
              <div className="flex flex-col">
                <span className={`font-semibold text-sm ${isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {STATUS_LABELS[status]}
                </span>
                
                {historyEntry && (
                  <span className="text-xs font-medium text-muted-foreground mt-0.5">
                    Дата: {format(new Date(historyEntry.changedAt), 'dd.MM.yyyy', { locale: ru })}
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
