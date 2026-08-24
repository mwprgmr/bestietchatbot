'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Fish,
  LayoutDashboard,
  Boxes,
  ShoppingBag,
  Users,
  BarChart3,
  Settings,
  MessageSquareCode,
  LogOut,
  Menu,
  X,
  UserCheck,
  ChevronRight,
  Store,
  ShieldCheck,
} from 'lucide-react'

import { BranchProvider, useBranchContext } from './BranchContext'

const navItems = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Inventory', href: '/admin/inventory', icon: Boxes },
  { name: 'Products', href: '/admin/products', icon: Fish },
  { name: 'Orders', href: '/admin/orders', icon: ShoppingBag },
  { name: 'Customers', href: '/admin/customers', icon: Users },
  { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
  { name: 'WhatsApp Sandbox', href: '/admin/simulator', icon: MessageSquareCode },
]

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const { activeBranch, currentUser, loadingUser } = useBranchContext()

  const [storeSettings, setStoreSettings] = useState({
    brandName: 'BESTIET FRESH',
    tagline: 'Your Fresh Friend At The Door',
  })

  useEffect(() => {
    try {
      const saved = localStorage.getItem('bf_store_settings')
      if (saved) {
        const parsed = JSON.parse(saved)
        setStoreSettings({
          brandName: parsed.brandName || 'BESTIET FRESH',
          tagline: parsed.tagline || 'Your Fresh Friend At The Door',
        })
      }
    } catch (e) {}

    const checkAuth = async () => {
      const sessionFlag = localStorage.getItem('bf_admin_session')
      const { data: { session } } = await supabase.auth.getSession()

      if (!sessionFlag && !session) {
        router.push('/login')
      } else {
        setLoading(false)
      }
    }
    checkAuth()
  }, [router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('bf_admin_session')
    router.push('/login')
  }

  if (loading || loadingUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white animate-bounce shadow-lg shadow-emerald-600/30">
            <Fish className="w-7 h-7" />
          </div>
          <p className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
            Loading Bestiet Fresh Branch Workspace...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Top Navbar */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Bestiet Fresh" className="w-10 h-10 object-contain shrink-0" />
          <div>
            <h1 className="font-extrabold text-slate-900 text-base leading-none">{storeSettings.brandName}</h1>
            <p className="text-[10px] font-medium text-emerald-600">{activeBranch.name}</p>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col justify-between transform transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* Header Brand */}
          <div className="p-6 border-b border-slate-100 hidden md:flex items-center gap-3">
            <img src="/logo.png" alt="Bestiet Fresh" className="w-11 h-11 object-contain shrink-0" />
            <div>
              <h1 className="font-extrabold text-slate-900 text-lg tracking-tight leading-none">
                {storeSettings.brandName}
              </h1>
              <p className="text-[11px] font-semibold text-emerald-600 mt-1">
                {storeSettings.tagline}
              </p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100/80'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span>{item.name}</span>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 text-emerald-600" />}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Sidebar Bottom Profile */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-xs mb-2">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {currentUser?.name || 'Branch Admin'}
                </p>
                <p className="text-[10px] text-slate-500 truncate">
                  {currentUser?.email || 'admin@bestietfresh.com'}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Read-Only Top Branch Indicator Header */}
        <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-3 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-2 text-slate-700 font-semibold text-xs">
            <Store className="w-4 h-4 text-emerald-600" />
            <span>Assigned Branch Context:</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>🏪 {activeBranch.name}</span>
              <span className="text-[10px] bg-emerald-200/60 text-emerald-900 px-2 py-0.5 rounded-md uppercase tracking-wider font-extrabold ml-1">
                Isolated
              </span>
            </div>
          </div>
        </header>

        <div className="p-4 md:p-8 flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  )
}

export default function AdminClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <BranchProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </BranchProvider>
  )
}
