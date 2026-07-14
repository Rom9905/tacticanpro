import React from 'react';
import { motion } from 'framer-motion';

/**
 * Unified dark hero strip used at the top of every main page.
 * Matches the dashboard/insights/input design language:
 * dark green gradient, glowing icon tile, title + subtitle, optional actions.
 */
export default function PageHero({ icon: Icon, title, subtitle, actions, titleExtra, children, className = '', style = {} }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`rounded-2xl overflow-hidden ${className}`}
      style={{
        background: 'linear-gradient(135deg, #0D1A12 0%, #12251A 100%)',
        border: '1px solid rgba(74,222,128,0.15)',
        ...style,
      }}
    >
      <div className="px-5 py-5 md:px-6 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {Icon && (
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgba(74,222,128,0.14)', border: '1px solid rgba(74,222,128,0.25)' }}>
              <Icon className="w-5 h-5" style={{ color: '#4ADE80' }} />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base md:text-lg font-bold truncate" style={{ color: '#F4EFE6', fontFamily: 'Heebo, sans-serif' }}>
                {title}
              </h1>
              {titleExtra}
            </div>
            {subtitle && (
              <p className="text-xs mt-0.5" style={{ color: 'rgba(244,239,230,0.55)' }}>{subtitle}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap flex-shrink-0">{actions}</div>}
      </div>
      {children}
    </motion.div>
  );
}
