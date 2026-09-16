'use client'

import React, { useState, useEffect, createContext, useContext } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  MessageSquare,
  ShoppingBag,
  Users,
  TrendingUp,
  Fish,
  Package,
  Store,
  FileText,
  ShieldAlert,
  Settings,
  LogOut,
  Calendar,
  Filter,
  ChevronDown,
  ShieldCheck,
  Image as ImageIcon,
} from 'lucide-react'
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns'

export interface SuperAdminFilterState {
  branchId: string // 'ALL' | UUID
  datePreset: 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM'
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
}

interface SuperAdminContextType {
  filter: SuperAdminFilterState
  setFilter: React.Dispatch<React.SetStateAction<SuperAdminFilterState>>
  user: any
  branches: any[]
}

const SuperAdminContext = createContext<SuperAdminContextType | null>(null)

export function useSuperAdminContext() {
  const ctx = useContext(SuperAdminContext)
  if (!ctx) throw new Error('useSuperAdminContext must be used within SuperAdminLayout')
  return ctx
}

export function getTodayIST(): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }
  return new Intl.DateTimeFormat('en-CA', options).format(new Date())
}

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [branches, setBranches] = useState<any[]>([])

  const today = getTodayIST()

  const [filter, setFilter] = useState<SuperAdminFilterState>({
    branchId: 'ALL',
    datePreset: 'THIS_MONTH',
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: today,
  })

  useEffect(() => {
    checkAuthAndLoadBranches()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null)
        router.replace('/super-admin/login')
      } else if (session?.user) {
        setUser(session.user)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const checkAuthAndLoadBranches = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        router.replace('/super-admin/login')
        return
      }

      // Verify Super Admin database authorization via public.super_admin_users
      const { data: superAdmin, error: sErr } = await supabase
        .from('super_admin_users')
        .select('user_id')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (sErr || !superAdmin) {
        await supabase.auth.signOut()
        router.replace('/super-admin/login')
        return
      }

      setUser(session.user)

      // Load official branches
      const { data: branchList } = await supabase.from('branches').select('*').order('name')
      if (branchList) setBranches(branchList)

      setLoading(false)
    } catch (err) {
      console.error('Super Admin Auth Error:', err)
      router.replace('/super-admin/login')
    }
  }

  const handlePresetChange = (preset: SuperAdminFilterState['datePreset']) => {
    const now = new Date()
    let start = today
    let end = today

    if (preset === 'TODAY') {
      start = today
      end = today
    } else if (preset === 'YESTERDAY') {
      const yest = format(subDays(now, 1), 'yyyy-MM-dd')
      start = yest
      end = yest
    } else if (preset === 'LAST_7_DAYS') {
      start = format(subDays(now, 6), 'yyyy-MM-dd')
      end = today
    } else if (preset === 'LAST_30_DAYS') {
      start = format(subDays(now, 29), 'yyyy-MM-dd')
      end = today
    } else if (preset === 'THIS_MONTH') {
      start = format(startOfMonth(now), 'yyyy-MM-dd')
      end = today
    } else if (preset === 'LAST_MONTH') {
      const prevMonth = subMonths(now, 1)
      start = format(startOfMonth(prevMonth), 'yyyy-MM-dd')
      end = format(endOfMonth(prevMonth), 'yyyy-MM-dd')
    }

    setFilter((prev) => ({
      ...prev,
      datePreset: preset,
      startDate: start,
      endDate: end,
    }))
  }

  const handleLogout = async () => {
    try {
      await supabase.rpc('log_audit_event', { p_action: 'SUPER_ADMIN_LOGOUT' })
    } catch (_) {}
    await supabase.auth.signOut()
    router.replace('/super-admin/login')
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="p-3 rounded-2xl bg-white shadow-lg border border-slate-100 animate-pulse">
            <img src="/logo.png" alt="Bestiet Fresh Logo" className="w-16 h-16 object-contain" />
          </div>
          <div className="flex items-center gap-2.5 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-xs">
            <div className="w-4 h-4 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
            <span className="text-xs font-bold text-slate-700 tracking-wide uppercase">
              Verifying Super Admin Session...
            </span>
          </div>
        </div>
      </div>
    )
  }

  const navItems = [
    { label: 'Dashboard', href: '/super-admin/dashboard', icon: LayoutDashboard },
    { label: 'Posters', href: '/super-admin/posters', icon: ImageIcon },
    { label: 'Chatbot', href: '/super-admin/chatbot', icon: MessageSquare },
    { label: 'Orders', href: '/super-admin/orders', icon: ShoppingBag },
    { label: 'Customers', href: '/super-admin/customers', icon: Users },
    { label: 'Revenue', href: '/super-admin/revenue', icon: TrendingUp },
    { label: 'Products', href: '/super-admin/products', icon: Fish },
    { label: 'Inventory', href: '/super-admin/inventory', icon: Package },
    { label: 'Branches', href: '/super-admin/branches', icon: Store },
    { label: 'Reports', href: '/super-admin/reports', icon: FileText },
    { label: 'Audit Logs', href: '/super-admin/audit-logs', icon: ShieldAlert },
    { label: 'Settings', href: '/super-admin/settings', icon: Settings },
  ]

  return (
    <SuperAdminContext.Provider value={{ filter, setFilter, user, branches }}>
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Brand Logo & Super Admin badge */}
              <div className="flex items-center gap-3">
                <div className="p-1 rounded-xl bg-white shadow-xs border border-slate-200 flex items-center justify-center shrink-0">
                  <img src="/logo.png" alt="Bestiet Fresh Logo" className="w-9 h-9 object-contain" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-lg text-slate-900 tracking-tight leading-none">BESTIET FRESH</span>
                    <span className="bg-emerald-100 border border-emerald-200 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                      SUPER ADMIN
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">"Your Fresh Friend At The Door"</p>
                </div>
              </div>

              {/* Header Right Actions */}
              <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Production Live</span>
                </div>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-red-600 bg-slate-100 hover:bg-red-50 px-3 py-1.5 rounded-xl transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-none border-t border-slate-100 pt-2">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </header>

        {/* Global Filters Control Bar */}
        <div className="bg-white border-b border-slate-200/80 py-3 shadow-2xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
            {/* Branch Selector */}
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Branch:</span>
              <select
                value={filter.branchId}
                onChange={(e) => setFilter((prev) => ({ ...prev, branchId: e.target.value }))}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="ALL">All Branches (Global)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Selector */}
            <div className="flex flex-wrap items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Period:</span>
              <select
                value={filter.datePreset}
                onChange={(e) => handlePresetChange(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="TODAY">Today ({today})</option>
                <option value="YESTERDAY">Yesterday</option>
                <option value="LAST_7_DAYS">Last 7 Days</option>
                <option value="LAST_30_DAYS">Last 30 Days</option>
                <option value="THIS_MONTH">This Month</option>
                <option value="LAST_MONTH">Last Month</option>
                <option value="CUSTOM">Custom Range</option>
              </select>

              {filter.datePreset === 'CUSTOM' && (
                <div className="flex items-center gap-2 ml-1">
                  <input
                    type="date"
                    value={filter.startDate}
                    onChange={(e) => setFilter((prev) => ({ ...prev, startDate: e.target.value }))}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-medium text-slate-800"
                  />
                  <span className="text-xs text-slate-400">to</span>
                  <input
                    type="date"
                    value={filter.endDate}
                    onChange={(e) => setFilter((prev) => ({ ...prev, endDate: e.target.value }))}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-medium text-slate-800"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
          Bestiet Fresh Production Super Admin System • Database Role Enforced (Supabase RLS)
        </footer>
      </div>
    </SuperAdminContext.Provider>
  )
}
