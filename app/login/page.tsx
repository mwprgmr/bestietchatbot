'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInAdminUser } from '@/lib/auth/admin-auth'
import { Lock, Mail, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await signInAdminUser(email, password)
      if (!result.success) {
        throw new Error(result.error || 'Invalid email or password.')
      }

      if (result.isSuperAdmin) {
        // Super Admin visiting branch login portal is redirected to Super Admin dashboard
        router.push('/super-admin/dashboard')
      } else {
        router.push('/admin/dashboard')
      }
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4 transform hover:scale-105 transition-transform">
            <img src="/logo.png" alt="Bestiet Fresh Logo" className="h-20 w-auto object-contain" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            BESTIET FRESH
          </h1>
          <p className="text-emerald-700 font-medium text-sm mt-1">
            "Your Fresh Friend At The Door"
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">Branch Admin Portal</h2>
            <p className="text-xs text-slate-500 mt-1">
              Log in with an authorized store admin account to manage inventory & orders.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  placeholder="manvila@bestietfresh.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-emerald-600/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {loading ? (
                <span>Authenticating with Supabase...</span>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Quick Fill Helper Buttons (Populate input fields only - NEVER auto-submit) */}
          <div className="mt-6 pt-6 border-t border-slate-100 space-y-2 text-center">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Select Active Branch Account:</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEmail('manvila@bestietfresh.com')
                  setPassword('BestietFresh2026!')
                }}
                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 transition-colors flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Manvila Branch</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('peroorkada@bestietfresh.com')
                  setPassword('BestietFresh2026!')
                }}
                className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold rounded-xl border border-blue-200 transition-colors flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Peroorkada Branch</span>
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          © {new Date().getFullYear()} BESTIET FRESH. All rights reserved.
        </p>
      </div>
    </div>
  )
}
