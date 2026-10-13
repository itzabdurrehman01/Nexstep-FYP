import React from 'react';
import { motion } from 'motion/react';

// Core Primitive Skeleton Box / Pulse line
export function Skeleton({ className = '', variant = 'rectangular', ...props }) {
  const baseClasses = "animate-pulse bg-slate-200 dark:bg-slate-800/80 rounded-xl relative overflow-hidden";
  
  let variantClasses = "";
  if (variant === 'circular') variantClasses = "rounded-full";
  if (variant === 'text') variantClasses = "h-4 rounded-md my-1";

  return (
    <div className={`${baseClasses} ${variantClasses} ${className}`} {...props}>
      {/* Shimmer Light Reflection Sweep */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-transparent   " />
    </div>
  );
}

// Reusable Skeleton Loader for Dashboard Page
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fadeIn">
      {/* Welcome Banner Skeleton */}
      <div className="p-6 rounded-3xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2 flex-1">
            <Skeleton className="w-2/3 h-8" />
            <Skeleton className="w-1/2 h-4" />
          </div>
          <Skeleton className="w-32 h-10 rounded-2xl shrink-0" />
        </div>

        {/* Stat Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
              <Skeleton className="w-8 h-8 rounded-xl" />
              <Skeleton className="w-1/2 h-3" />
              <Skeleton className="w-3/4 h-6" />
            </div>
          ))}
        </div>
      </div>

      {/* Main 2-Column Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Milestone Roadmap */}
        <div className="lg:col-span-2 space-y-4 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <Skeleton className="w-48 h-6" />
            <Skeleton className="w-24 h-4" />
          </div>

          <div className="space-y-3 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="w-3/4 h-4" />
                    <Skeleton className="w-1/2 h-3" />
                  </div>
                </div>
                <Skeleton className="w-20 h-8 rounded-xl shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: Quick AI Tools & Career Match */}
        <div className="space-y-4 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <Skeleton className="w-36 h-6" />
          <div className="space-y-3 pt-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-3">
                <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="w-2/3 h-4" />
                  <Skeleton className="w-full h-3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Reusable Skeleton Loader for Job & Internship Listing Page
export function JobListingSkeleton({ count = 6 }) {
  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fadeIn">
      {/* Header Search & Filter Bar Skeleton */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Skeleton className="w-full sm:w-80 h-11 rounded-2xl" />
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Skeleton className="w-24 h-10 rounded-xl" />
          <Skeleton className="w-24 h-10 rounded-xl" />
          <Skeleton className="w-24 h-10 rounded-xl" />
        </div>
      </div>

      {/* Job Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div 
            key={i} 
            className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4"
          >
            {/* Card Header: Company Logo + Title */}
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
                  <div className="space-y-1.5">
                    <Skeleton className="w-32 h-4" />
                    <Skeleton className="w-24 h-3" />
                  </div>
                </div>
                <Skeleton className="w-8 h-8 rounded-xl shrink-0" />
              </div>

              {/* Badges Tag Row */}
              <div className="flex items-center gap-2 pt-1">
                <Skeleton className="w-20 h-6 rounded-full" />
                <Skeleton className="w-16 h-6 rounded-full" />
              </div>

              {/* Job Meta Info */}
              <div className="space-y-2 pt-2">
                <Skeleton className="w-3/4 h-3" />
                <Skeleton className="w-1/2 h-3" />
              </div>
            </div>

            {/* Footer Action Button */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <Skeleton className="w-28 h-5" />
              <Skeleton className="w-24 h-9 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Skeleton;
