'use client'

import React, { useState, useEffect } from 'react'
import SuperAdminLayout from '../SuperAdminLayout'
import { createClient } from '@/lib/supabase/client'
import { generatePDFReport } from '@/lib/reports/pdf-generator'
import { downloadCSVReport } from '@/lib/reports/csv-generator'
import { ShieldAlert, Search, RefreshCw, Clock, User, FileText, Download, FileSpreadsheet, Filter, CheckCircle2 } from 'lucide-react'

export default function AuditLogsPage() {
  return (
    <SuperAdminLayout>
      <AuditLogsContent />
    </SuperAdminLayout>
  )
}

function AuditLogsContent() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('ALL')

  useEffect(() => {
    fetchAuditLogs()
  }, [])

  const fetchAuditLogs = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)

      if (error) throw error
      if (data) setLogs(data)
    } catch (err) {
      console.error('Audit Logs Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter((l) => {
    if (actionFilter !== 'ALL' && l.action !== actionFilter) return false
    if (!search) return true
    const q = search.toLowerCase()
    const action = (l.action || '').toLowerCase()
    const entity = (l.entity_type || '').toLowerCase()
    const user = (l.user_id || '').toLowerCase()
    const metaStr = JSON.stringify(l.metadata || {}).toLowerCase()
    return action.includes(q) || entity.includes(q) || user.includes(q) || metaStr.includes(q)
  })

  // Format Metadata cleanly for rendering
  const renderFormattedMetadata = (meta: any) => {
    if (!meta || Object.keys(meta).length === 0) {
      return <span className="text-slate-400 italic">No extra payload</span>
    }

    return (
      <div className="flex flex-wrap gap-1.5 max-w-xs">
        {Object.entries(meta).map(([k, v]) => (
          <span key={k} className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-700 text-[10px] px-2 py-0.5 rounded-md font-mono">
            <strong className="font-semibold text-slate-900">{k}:</strong> {String(v)}
          </span>
        ))}
      </div>
    )
  }

  const handleDownloadPDF = () => {
    generatePDFReport({
      reportTitle: 'Security & Audit Log Trail',
      dateRangeText: 'Last 200 Audit Events',
      branchText: 'System Global Audit',
      filename: `bestietfresh_audit_logs_${new Date().toISOString().slice(0, 10)}.pdf`,
      summaryCards: [
        { label: 'Total Logs', value: String(filteredLogs.length) },
        { label: 'Logins Tracked', value: String(filteredLogs.filter(l => l.action.includes('LOGIN')).length) },
        { label: 'Settings Edits', value: String(filteredLogs.filter(l => l.action.includes('SETTING')).length) },
        { label: 'Reports Downloaded', value: String(filteredLogs.filter(l => l.action.includes('REPORT')).length) },
      ],
      tableHeaders: ['Timestamp', 'Action', 'Entity Type', 'User / Entity ID', 'Details / Metadata'],
      tableRows: filteredLogs.map((l) => [
        l.created_at ? new Date(l.created_at).toLocaleString() : 'N/A',
        l.action || 'SYSTEM_EVENT',
        l.entity_type || 'SYSTEM',
        l.entity_id || l.user_id ? (l.entity_id || l.user_id).slice(0, 12) : 'N/A',
        JSON.stringify(l.metadata || {}),
      ]),
    })
  }

  const handleExportCSV = () => {
    downloadCSVReport({
      filename: `bestietfresh_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`,
      headers: ['Timestamp', 'Action', 'Entity Type', 'User ID', 'Entity ID', 'Metadata Payload'],
      rows: filteredLogs.map((l) => [
        l.created_at,
        l.action,
        l.entity_type,
        l.user_id,
        l.entity_id,
        JSON.stringify(l.metadata || {}),
      ]),
    })
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">SYSTEM AUDIT LOGS</h1>
          <p className="text-xs text-slate-500 mt-1">
            Database-backed audit trail tracking admin logins, setting updates, report downloads & security events
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAuditLogs}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 shadow-2xs transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={loading || filteredLogs.length === 0}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>DOWNLOAD PDF</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={loading || filteredLogs.length === 0}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold shadow-2xs disabled:opacity-50 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>EXPORT CSV</span>
          </button>
        </div>
      </div>

      {/* Audit Log Table Container */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        {/* Controls Toolbar */}
        <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-emerald-600" />
            Security & Administrative Event Trail ({filteredLogs.length})
          </h3>

          <div className="flex flex-wrap items-center gap-3">
            {/* Action Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">All Event Types</option>
                <option value="SUPER_ADMIN_LOGIN">Super Admin Login</option>
                <option value="SUPER_ADMIN_LOGOUT">Super Admin Logout</option>
                <option value="DOWNLOAD_PDF_REPORT">PDF Report Download</option>
                <option value="UPDATE_STORE_SETTINGS">Settings Update</option>
                <option value="ORDER_STATUS_UPDATE">Order Status Update</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search action, user, payload..."
                className="bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-[11px] font-bold uppercase text-slate-600 border-b border-slate-200">
                <th className="p-3.5">Timestamp (IST)</th>
                <th className="p-3.5">Action Event</th>
                <th className="p-3.5">Entity Type</th>
                <th className="p-3.5">User / Entity ID</th>
                <th className="p-3.5">Metadata Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400 font-semibold">
                    <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
                    Loading system audit trail...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                    No audit logs matching search filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {l.created_at ? new Date(l.created_at).toLocaleString('en-IN') : 'N/A'}
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        (l.action || '').includes('LOGIN')
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : (l.action || '').includes('REPORT') || (l.action || '').includes('DOWNLOAD')
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : (l.action || '').includes('SETTING')
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-slate-100 text-slate-800 border border-slate-200'
                      }`}>
                        {l.action}
                      </span>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-700 whitespace-nowrap">
                      <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md text-[11px]">
                        {l.entity_type || 'SYSTEM'}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-600 text-[11px] whitespace-nowrap">
                      {l.entity_id || l.user_id ? (l.entity_id || l.user_id).slice(0, 13) + '...' : 'N/A'}
                    </td>
                    <td className="p-3.5">
                      {renderFormattedMetadata(l.metadata)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
