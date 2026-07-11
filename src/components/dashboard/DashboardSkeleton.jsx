import React from 'react';

export default function DashboardSkeleton() {
  return (
    <div className="space-y-4" dir="rtl">
      {/* KPI row skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="premium-skeleton p-4" style={{ height: '96px' }} />
        ))}
      </div>
      {/* Performance stats skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="premium-skeleton p-4" style={{ height: '88px' }} />
        ))}
      </div>
      {/* Last 5 + highlights skeleton */}
      <div className="premium-skeleton" style={{ height: '64px' }} />
      <div className="premium-skeleton" style={{ height: '120px' }} />
      <div className="premium-skeleton" style={{ height: '80px' }} />
    </div>
  );
}