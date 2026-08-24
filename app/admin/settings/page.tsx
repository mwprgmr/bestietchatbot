'use client'

import React, { useState } from 'react'
import {
  Settings,
  Shield,
  MessageSquare,
  Building,
  CheckCircle2,
  Copy,
  ExternalLink,
  Save
} from 'lucide-react'

export default function SettingsPage() {
  const [brandName, setBrandName] = useState('BESTIET FRESH')
  const [tagline, setTagline] = useState('Your Fresh Friend At The Door')
  const [lowStockThreshold, setLowStockThreshold] = useState('2')
  const [deliveryFee, setDeliveryFee] = useState('30')
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)

  const webhookUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.vercel.app'}/api/whatsapp/webhook`

  React.useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('bf_store_settings')
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings)
        if (parsed.brandName) setBrandName(parsed.brandName)
        if (parsed.tagline) setTagline(parsed.tagline)
        if (parsed.lowStockThreshold) setLowStockThreshold(parsed.lowStockThreshold)
        if (parsed.deliveryFee) setDeliveryFee(parsed.deliveryFee)
      }
    } catch (err) {
      console.error('Failed to parse store settings from localStorage:', err)
    }
  }, [])

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const settingsPayload = {
        brandName,
        tagline,
        lowStockThreshold,
        deliveryFee,
      }
      localStorage.setItem('bf_store_settings', JSON.stringify(settingsPayload))
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Failed to save settings:', err)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-7 h-7 text-emerald-600" />
          Store & WhatsApp API Settings
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure default inventory alert thresholds, delivery charges, and Meta WhatsApp Cloud API webhooks.
        </p>
      </div>

      {saved && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Settings saved successfully!
        </div>
      )}

      {/* Business & Inventory Defaults Form */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Building className="w-4 h-4 text-emerald-600" />
          Business & Inventory Rules
        </h3>

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Brand Name
              </label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tagline
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Default Low Stock Alert Threshold (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Items with stock at or below this threshold trigger LOW_STOCK alerts.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Standard Delivery Charge (₹)
              </label>
              <input
                type="number"
                step="1"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Applied to customer order checkout subtotal.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" /> Save Business Rules
            </button>
          </div>
        </form>
      </div>

      {/* WhatsApp Cloud API Integration Setup Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            Meta WhatsApp Business Cloud API Settings
          </h3>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> API Credentials Active
          </span>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              WhatsApp Webhook Callback URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={webhookUrl}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 focus:outline-none"
              />
              <button
                onClick={handleCopyWebhook}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl flex items-center gap-1 shrink-0 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Paste this URL into Meta Developers Dashboard under WhatsApp Webhooks.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Phone Number ID</label>
              <input
                type="text"
                readOnly
                value="1126837613855957"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">WhatsApp Business Account ID</label>
              <input
                type="text"
                readOnly
                value="1335771114672348"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Webhook Verify Token</label>
            <input
              type="text"
              readOnly
              value="bestiet_fresh_verify_token_2026"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
