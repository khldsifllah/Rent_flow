import React from 'react';

export function DashboardSkeleton() {
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-pulse">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 gap-2">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-full bg-m3-surface-variant"></div>
          <div className="h-6 w-32 bg-m3-surface-variant rounded-full"></div>
        </div>
        <div className="h-9 w-32 bg-m3-surface-variant rounded-full"></div>
      </div>
      
      {/* Days remaining banner */}
      <div className="bg-m3-surface-variant/40 rounded-3xl p-6 mb-6">
        <div className="h-4 w-40 bg-m3-surface-variant rounded mb-3"></div>
        <div className="h-12 w-48 bg-m3-surface-variant rounded-xl"></div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-m3-surface border border-m3-surface-variant rounded-3xl p-5 flex flex-col items-center">
          <div className="h-3 w-12 bg-m3-surface-variant rounded mb-2"></div>
          <div className="h-8 w-10 bg-m3-surface-variant rounded-lg"></div>
        </div>
        <div className="bg-m3-surface border border-m3-surface-variant rounded-3xl p-5 flex flex-col items-center">
          <div className="h-3 w-12 bg-m3-surface-variant rounded mb-2"></div>
          <div className="h-8 w-10 bg-m3-surface-variant rounded-lg"></div>
        </div>
        <div className="bg-m3-surface border border-m3-surface-variant rounded-3xl p-5 flex flex-col items-center">
          <div className="h-3 w-12 bg-m3-surface-variant rounded mb-2"></div>
          <div className="h-8 w-10 bg-m3-surface-variant rounded-lg"></div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-m3-surface border border-m3-surface-variant rounded-3xl p-6 mb-6">
        <div className="h-4 w-28 bg-m3-surface-variant rounded mb-4"></div>
        <div className="grid grid-cols-4 gap-3">
          <div className="h-16 bg-m3-surface-variant/50 rounded-2xl"></div>
          <div className="h-16 bg-m3-surface-variant/50 rounded-2xl"></div>
          <div className="h-16 bg-m3-surface-variant/50 rounded-2xl"></div>
          <div className="h-16 bg-m3-surface-variant/50 rounded-2xl"></div>
        </div>
      </div>

      {/* Financial stats */}
      <div className="space-y-4">
        <div className="bg-m3-surface border border-m3-surface-variant rounded-3xl p-6">
          <div className="h-4 w-48 bg-m3-surface-variant rounded mb-2"></div>
          <div className="h-9 w-36 bg-m3-surface-variant rounded-lg mb-3"></div>
          <div className="w-full bg-m3-surface-variant/60 rounded-full h-3"></div>
        </div>
        
        <div className="bg-m3-surface border border-m3-surface-variant rounded-3xl p-6">
          <div className="h-4 w-44 bg-m3-surface-variant rounded mb-2"></div>
          <div className="h-9 w-36 bg-m3-surface-variant rounded-lg"></div>
        </div>
      </div>
    </div>
  );
}

export function TenantsSkeleton() {
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-pulse">
      {/* Title */}
      <div className="h-8 w-48 bg-m3-surface-variant rounded-full mb-6"></div>
      
      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-m3-surface border border-m3-surface-variant rounded-3xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              {/* Profile Avatar */}
              <div className="w-14 h-14 bg-m3-surface-variant rounded-full shrink-0"></div>
              <div className="space-y-2 flex-1">
                {/* Title */}
                <div className="h-5 w-1/2 bg-m3-surface-variant rounded-full"></div>
                {/* Text info */}
                <div className="h-3 w-2/3 bg-m3-surface-variant rounded-full"></div>
              </div>
            </div>
            {/* Arrow key */}
            <div className="w-8 h-8 rounded-full bg-m3-surface-variant shrink-0"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
