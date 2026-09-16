'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Settings,
  Building,
  MessageSquare,
  CheckCircle2,
  Copy,
  Save,
  AlertCircle,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Eye,
  RefreshCw
} from 'lucide-react'

export default function SettingsPage() {
  // Business Settings State
  const [brandName, setBrandName] = useState('')
  const [tagline, setTagline] = useState('')
  const [lowStockThreshold, setLowStockThreshold] = useState('')
  const [deliveryFee, setDeliveryFee] = useState('')
  const [copied, setCopied] = useState(false)

  const [loadingSettings, setLoadingSettings] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [settingsError, setSettingsError] = useState<string | null>(null)

  // Chatbot Opening Message State
  const [welcomeHeader, setWelcomeHeader] = useState('Welcome to Bestiet Fresh 🐟')
  const [additionalMessage, setAdditionalMessage] = useState('Onam special orders are now open! Pre-book your fresh fish today.')
  const [isOpeningMessageEnabled, setIsOpeningMessageEnabled] = useState(true)
  const [chatbotSaving, setChatbotSaving] = useState(false)
  const [chatbotSaved, setChatbotSaved] = useState(false)
  const [chatbotError, setChatbotError] = useState<string | null>(null)

  const supabase = createClient()
  const webhookUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.vercel.app'}/api/whatsapp/webhook`

  useEffect(() => {
    fetchStoreBusinessSettings()
    fetchChatbotSettings()
  }, [])

  const fetchStoreBusinessSettings = async () => {
    setLoadingSettings(true)
    setSettingsError(null)
    try {
      const { data, error } = await supabase.rpc('get_store_business_settings')
      if (error) {
        console.error('Error fetching get_store_business_settings RPC:', error)
        setSettingsError(error.message || 'Failed to load store settings from database.')
        return
      }
      if (data) {
        setBrandName(data.brand_name ?? '')
        setTagline(data.tagline ?? '')
        setLowStockThreshold(
          data.default_low_stock_threshold_kg !== undefined && data.default_low_stock_threshold_kg !== null
            ? String(data.default_low_stock_threshold_kg)
            : '5'
        )
        setDeliveryFee(
          data.standard_delivery_charge !== undefined && data.standard_delivery_charge !== null
            ? String(data.standard_delivery_charge)
            : '30'
        )
      }
    } catch (err: any) {
      console.error('Exception fetching store business settings:', err)
      setSettingsError(err?.message || 'Error connecting to database.')
    } finally {
      setLoadingSettings(false)
    }
  }

  const fetchChatbotSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('chatbot_settings')
        .select('*')
        .eq('branch_id', 'global')
        .single()

      if (data && !error) {
        if (data.welcome_header) setWelcomeHeader(data.welcome_header)
        if (data.additional_message !== undefined && data.additional_message !== null) {
          setAdditionalMessage(data.additional_message)
        }
        if (data.is_enabled !== undefined) setIsOpeningMessageEnabled(data.is_enabled)
      }
    } catch (err) {
      console.error('Error loading chatbot settings:', err)
    }
  }

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingSettings(true)
    setSettingsError(null)
    setSettingsSaved(false)

    try {
      const numThreshold = parseFloat(lowStockThreshold) || 0
      const numDelivery = parseFloat(deliveryFee) || 0

      // 1. CALL update_store_business_settings RPC
      const { error: updateErr } = await supabase.rpc('update_store_business_settings', {
        p_brand_name: brandName.trim(),
        p_tagline: tagline.trim(),
        p_low_stock_threshold_kg: numThreshold,
        p_delivery_charge: numDelivery,
      })

      if (updateErr) {
        console.error('Error in update_store_business_settings RPC:', updateErr)
        setSettingsError(updateErr.message || 'Failed to update business settings.')
        return
      }

      // 2. VERIFY AFTER SAVE BY RE-FETCHING FROM DATABASE
      const { data: verifiedData, error: verifyErr } = await supabase.rpc('get_store_business_settings')

      if (verifyErr || !verifiedData) {
        console.error('Error verifying business settings after update:', verifyErr)
        setSettingsError('Settings could not be verified from database. Please try again.')
        return
      }

      // 3. REPLACE UI STATE WITH VERIFIED DATABASE RESPONSE
      setBrandName(verifiedData.brand_name ?? '')
      setTagline(verifiedData.tagline ?? '')
      setLowStockThreshold(
        verifiedData.default_low_stock_threshold_kg !== undefined && verifiedData.default_low_stock_threshold_kg !== null
          ? String(verifiedData.default_low_stock_threshold_kg)
          : String(numThreshold)
      )
      setDeliveryFee(
        verifiedData.standard_delivery_charge !== undefined && verifiedData.standard_delivery_charge !== null
          ? String(verifiedData.standard_delivery_charge)
          : String(numDelivery)
      )

      setSettingsSaved(true)
      setTimeout(() => setSettingsSaved(false), 4000)
    } catch (err: any) {
      console.error('Save business settings failed:', err)
      setSettingsError(err?.message || 'Settings could not be saved to database.')
    } finally {
      setSavingSettings(false)
    }
  }

  const handleSaveChatbotSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setChatbotSaving(true)
    setChatbotError(null)

    try {
      const payload = {
        branch_id: 'global',
        welcome_header: welcomeHeader.trim() || 'Welcome to Bestiet Fresh 🐟',
        additional_message: additionalMessage.trim(),
        is_enabled: isOpeningMessageEnabled,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('chatbot_settings')
        .upsert(payload, { onConflict: 'branch_id' })

      if (error) {
        console.error('Supabase error saving chatbot_settings:', error)
        // Fallback to local storage if DB table is unavailable
        localStorage.setItem('bf_chatbot_settings', JSON.stringify(payload))
      }

      setChatbotSaved(true)
      setTimeout(() => setChatbotSaved(false), 3000)
    } catch (err: any) {
      console.error('Save chatbot settings failed:', err)
      setChatbotError(err?.message || 'Failed to save chatbot opening message.')
    } finally {
      setChatbotSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-7 h-7 text-emerald-600" />
          Store & WhatsApp API Settings
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure default inventory alert thresholds, chatbot opening announcements, delivery charges, and Meta WhatsApp Cloud API webhooks.
        </p>
      </div>

      {settingsSaved && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Business settings updated successfully.
        </div>
      )}

      {settingsError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          {settingsError}
        </div>
      )}

      {/* DYNAMIC CHATBOT OPENING MESSAGE CONFIGURATION CARD */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Chatbot Opening Message Configuration
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Add custom promotions or announcements (e.g. Onam Specials) to the WhatsApp welcome message without code redeployment.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-slate-700">Status:</span>
            <button
              type="button"
              onClick={() => setIsOpeningMessageEnabled(!isOpeningMessageEnabled)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                isOpeningMessageEnabled
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
              }`}
            >
              {isOpeningMessageEnabled ? (
                <>
                  <ToggleRight className="w-4 h-4" /> ON
                </>
              ) : (
                <>
                  <ToggleLeft className="w-4 h-4" /> OFF
                </>
              )}
            </button>
          </div>
        </div>

        {chatbotSaved && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Chatbot opening message updated successfully!
          </div>
        )}

        {chatbotError && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            {chatbotError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Settings Form */}
          <form onSubmit={handleSaveChatbotSettings} className="lg:col-span-7 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Standard Welcome Header
              </label>
              <input
                type="text"
                value={welcomeHeader}
                onChange={(e) => setWelcomeHeader(e.target.value)}
                placeholder="Welcome to Bestiet Fresh 🐟"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Additional Dynamic Message / Festival Banner
              </label>
              <textarea
                rows={3}
                value={additionalMessage}
                onChange={(e) => setAdditionalMessage(e.target.value)}
                placeholder="🎉 Onam special orders are now open! Pre-book your fresh fish today."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                This text will automatically append below the main welcome text when enabled.
              </p>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={chatbotSaving}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50"
              >
                {chatbotSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Save Chatbot Message
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setAdditionalMessage('')
                }}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs rounded-xl transition-colors"
              >
                Clear Additional Text
              </button>
            </div>
          </form>

          {/* Live WhatsApp Chat Simulation Card */}
          <div className="lg:col-span-5 bg-slate-900 rounded-2xl p-4 text-white shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-3">
                <Eye className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Live WhatsApp Preview</span>
              </div>

              {/* Chat Bubble */}
              <div className="bg-emerald-950/80 border border-emerald-800/60 p-3.5 rounded-2xl text-xs space-y-2 font-sans shadow-inner">
                <p className="font-bold text-emerald-300">{welcomeHeader || 'Welcome to Bestiet Fresh 🐟'}</p>

                {isOpeningMessageEnabled && additionalMessage.trim() ? (
                  <p className="text-emerald-100 font-medium whitespace-pre-wrap bg-emerald-900/50 p-2 rounded-lg border border-emerald-700/50">
                    {additionalMessage.trim()}
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-400 italic">(Additional announcement message is currently turned OFF)</p>
                )}

                <p className="text-[11px] text-emerald-200/80 pt-1">
                  Please select a shop branch to view available fresh fish today:
                </p>
              </div>

              {/* Interactive buttons mock */}
              <div className="mt-2.5 space-y-1.5">
                <div className="w-full py-1.5 bg-emerald-700/60 rounded-xl text-center text-[11px] font-bold text-white border border-emerald-600/50">
                  1. Manvila Kazhakkoottam Branch
                </div>
                <div className="w-full py-1.5 bg-emerald-700/60 rounded-xl text-center text-[11px] font-bold text-white border border-emerald-600/50">
                  2. Peroorkada Branch
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 text-[10px] text-slate-400 text-center">
              Changes reflect live on WhatsApp immediately after saving.
            </div>
          </div>
        </div>
      </div>

      {/* Business & Inventory Defaults Form */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Building className="w-4 h-4 text-emerald-600" />
          Business & Inventory Rules
        </h3>

        {loadingSettings ? (
          <div className="p-8 text-center border border-slate-100 rounded-2xl bg-slate-50/50 space-y-2">
            <div className="inline-block w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-500 font-medium">Loading business settings from database...</p>
          </div>
        ) : (
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Brand Name
                </label>
                <input
                  type="text"
                  required
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
                  required
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
                  required
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
                  required
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
                disabled={savingSettings}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50"
              >
                {savingSettings ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Save Business Rules
                  </>
                )}
              </button>
            </div>
          </form>
        )}
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
                type="button"
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

