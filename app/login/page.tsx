'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInAdminUser } from '@/lib/auth/admin-auth'
import { Fish, Lock, Mail, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('admin@bestietfresh.com')
  const [password, setPassword] = useState('admin123')
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
        throw new Error(result.error || 'Invalid credentials')
      }

      router.push('/admin/dashboard')
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || 'Invalid admin credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-white shadow-lg border border-slate-100 mb-4 transform hover:scale-105 transition-transform">
            <img src="/logo.png" alt="Bestiet Fresh Logo" className="w-20 h-20 object-contain" />
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
            <h2 className="text-xl font-bold text-slate-900">Admin Portal</h2>
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
                  placeholder="admin@bestietfresh.com"
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

          {/* Quick Admin Helper */}
          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <button
              onClick={() => {
                setEmail('admin@bestietfresh.com')
                setPassword('admin123')
              }}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold hover:underline inline-flex items-center gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Fill Default Admin Credentials
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          © {new Date().getFullYear()} BESTIET FRESH. All rights reserved.
        </p>
      </div>
    </div>
  )
}
