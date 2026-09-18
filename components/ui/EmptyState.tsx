import React from 'react'
import { LucideIcon } from 'lucide-react'
import Link from 'next/link'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
  onActionClick?: () => void
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onActionClick,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 bg-slate-50/60 rounded-3xl border border-dashed border-slate-200 ${className}`}
    >
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border border-slate-100 shadow-xs flex items-center justify-center mb-4 text-[#39B54A]">
        <Icon className="w-8 h-8 sm:w-10 sm:h-10" />
      </div>
      <h3 className="text-base sm:text-lg font-extrabold text-slate-900 mb-1">
        {title}
      </h3>
      <p className="text-xs sm:text-sm font-medium text-slate-500 max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="inline-flex items-center justify-center h-11 px-6 rounded-xl font-bold bg-[#39B54A] hover:bg-[#2ea03e] text-white shadow-xs active:scale-[0.98] transition-all text-xs sm:text-sm"
        >
          {actionLabel}
        </Link>
      )}
      {actionLabel && !actionHref && onActionClick && (
        <button
          onClick={onActionClick}
          className="inline-flex items-center justify-center h-11 px-6 rounded-xl font-bold bg-[#39B54A] hover:bg-[#2ea03e] text-white shadow-xs active:scale-[0.98] transition-all text-xs sm:text-sm cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
