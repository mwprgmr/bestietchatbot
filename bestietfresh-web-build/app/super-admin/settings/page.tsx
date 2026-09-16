'use client'

import React, { useState, useEffect } from 'react'
import SuperAdminLayout from '../SuperAdminLayout'
import { createClient } from '@/lib/supabase/client'
import { Settings, Save, RefreshCw, CheckCircle2, AlertCircle, Store } from 'lucide-react'

function SettingsContent() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [brandName, setBrandName] = useState('Bestiet Fresh')
  const [tagline, setTagline] = useState('Your Fresh Friend At The Door')
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5)
  const [deliveryCharge, setDeliveryCharge] = useState<number>(30)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const { data, error } = await supabase.rpc('get_store_business_settings')
      if (error) throw error

      if (data && data.length > 0) {
        const s = data[0]
        setBrandName(s.brand_name || 'Bestiet Fresh')
        setTagline(s.tagline || 'Your Fresh Friend At The Door')
        setLowStockThreshold(Number(s.low_stock_threshold_kg || 5))
        setDeliveryCharge(Number(s.delivery_charge || 30))
      }
    } catch (err: any) {
      console.error('Failed to load settings:', err)
      setErrorMsg(err.message || 'Failed to fetch settings from Supabase.')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSuccessMsg(null)
    setErrorMsg(null)

    try {
      const { data, error } = await supabase.rpc('update_store_business_settings', {
        p_brand_name: brandName.trim(),
        p_tagline: tagline.trim(),
        p_low_stock_threshold_kg: Number(lowStockThreshold),
        p_delivery_charge: Number(deliveryCharge),
      })

      if (error) throw error

      setSuccessMsg('Store & WhatsApp business settings saved successfully to Supabase database!')

      // Audit Log
      try {
        await supabase.rpc('log_audit_event', {
          p_action: 'UPDATE_STORE_SETTINGS',
          p_entity_type: 'SETTINGS',
          p_metadata: { brandName, tagline, lowStockThreshold, deliveryCharge },
        })
      } catch (_) {}

    } catch (err: any) {
      console.error('Save Settings Error:', err)
      setErrorMsg(err.message || 'Failed to save settings to database.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
        <p className="text-sm font-semibold">Loading System Settings...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-wide">STORE & SYSTEM SETTINGS</h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure global brand name, chatbot tagline, delivery charges & stock thresholds
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 flex items-center gap-3 text-emerald-300 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-950/80 border border-red-800 flex items-center gap-3 text-red-300 text-sm">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <Store className="w-4 h-4 text-emerald-400" />
            Brand & Greeting Configuration
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Brand Name
            </label>
            <input
              type="text"
              required
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="block w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Chatbot Opening Tagline
            </label>
            <input
              type="text"
              required
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="block w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Sent automatically to WhatsApp customers in opening greeting
            </p>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-slate-800">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <Settings className="w-4 h-4 text-cyan-400" />
            Financial & Stock Parameters
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Standard Delivery Charge (₹)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                required
                value={deliveryCharge}
                onChange={(e) => setDeliveryCharge(Number(e.target.value))}
                className="block w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Low Stock Threshold (kg)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                required
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                className="block w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Save Settings to Database</span>
          </button>
        </div>
      </form>
    </div>
  )
}

export default function SuperAdminSettingsPage() {
  return (
    <SuperAdminLayout>
      <SettingsContent />
    </SuperAdminLayout>
  )
}
