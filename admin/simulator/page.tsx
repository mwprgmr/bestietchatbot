'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  MessageSquareCode,
  Send,
  RefreshCw,
  Phone,
  Fish,
  ShoppingBag,
  Boxes,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  RotateCcw,
  Trash2
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { normalizePhoneNumber } from '@/lib/whatsapp/phone-utils'
import { processWhatsAppMessage } from '@/lib/whatsapp/state-machine'

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  buttons?: { id: string; title: string }[];
  listSections?: { title: string; rows: { id: string; title: string; description?: string }[] }[];
  timestamp: string;
}

export default function WhatsAppSimulatorPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [phone, setPhone] = useState('15551964153')
  const [loading, setLoading] = useState(false)
  const [sessionState, setSessionState] = useState<any>(null)
  const [customerInfo, setCustomerInfo] = useState<any>(null)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchSessionState()
  }, [phone])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchSessionState = async () => {
    setSessionError(null)
    const normalized = normalizePhoneNumber(phone)
    if (!normalized) return

    try {
      // 1. Fetch or identify customer
      const { data: cust } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', normalized)
        .single()

      if (cust) {
        setCustomerInfo(cust)
        // 2. Fetch session for customer
        const { data: sess } = await supabase
          .from('chat_sessions')
          .select('*')
          .eq('customer_id', cust.id)
          .single()

        if (sess) {
          setSessionState(sess)
        } else {
          setSessionState(null)
          setSessionError(`No active session found for phone ${normalized}. Click "Start Fresh Session" to initialize.`)
        }

        // 3. Fetch chat history from chat_messages table
        const { data: dbMsgs } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('phone', normalized)
          .order('created_at', { ascending: true })

        if (dbMsgs && dbMsgs.length > 0) {
          const formatted: ChatMessage[] = dbMsgs.map((m: any) => ({
            id: m.id,
            sender: m.sender as 'bot' | 'user',
            text: m.text,
            buttons: m.buttons,
            listSections: m.list_sections,
            timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }))
          setMessages(formatted)
        }
      } else {
        setCustomerInfo(null)
        setSessionState(null)
        setSessionError(`No customer record found for phone ${normalized}. Click "Start Fresh Session" to create.`)
      }
    } catch (err: any) {
      console.error('Error fetching session state:', err)
      setSessionError(`Session lookup notice: ${err.message}`)
    }
  }

  const handleStartFreshSession = async () => {
    const normalized = normalizePhoneNumber(phone)
    if (!normalized) {
      alert('Please enter a valid phone number')
      return
    }

    setLoading(true)
    setSessionError(null)
    setMessages([])

    try {
      // Send "cancel_flow" to clear existing test cart and reset state
      await sendMessageInternal(normalized, 'cancel_flow')
      // Then send "Hi" to display main menu greeting
      await sendMessageInternal(normalized, 'Hi')
      await fetchSessionState()
    } catch (err: any) {
      console.error('Error starting session:', err)
      setSessionError(err.message || 'Failed to start fresh session')
    } finally {
      setLoading(false)
    }
  }

  const handleClearCart = async () => {
    const normalized = normalizePhoneNumber(phone)
    if (!normalized) return
    setLoading(true)
    try {
      await sendMessageInternal(normalized, 'btn_clear_cart')
      await fetchSessionState()
    } catch (err: any) {
      console.error('Clear cart error:', err)
    } finally {
      setLoading(false)
    }
  }

  const sendMessageInternal = async (targetPhone: string, textToSend: string, buttonIdToSend?: string, listIdToSend?: string) => {
    const normalized = normalizePhoneNumber(targetPhone)

    // Optimistically append user message to UI state (unless silent internal reset)
    if (textToSend !== 'cancel_flow') {
      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        sender: 'user',
        text: textToSend,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, userMsg])
    }
    setInputText('')

    // Process via state machine handler
    const botResponse: any = await processWhatsAppMessage({
      from: normalized,
      type: buttonIdToSend ? 'button_reply' : listIdToSend ? 'list_reply' : 'text',
      text: textToSend,
      buttonId: buttonIdToSend,
      listId: listIdToSend,
      messageId: `sim_${Date.now()}`,
    })

    // Extract & Optimistically append bot response message to UI state
    if (botResponse && textToSend !== 'cancel_flow') {
      const respText = botResponse.reply || botResponse.text || botResponse.data?.text
      const respButtons = botResponse.buttons || botResponse.data?.buttons
      const respLists = botResponse.listSections || botResponse.data?.listSections

      if (respText) {
        const botMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: respText,
          buttons: respButtons,
          listSections: respLists,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
        setMessages((prev) => [...prev, botMsg])
      }
    }

    await fetchSessionState()
  }

  const handleSendMessage = (textToSend: string, buttonIdToSend?: string, listIdToSend?: string) => {
    if (!textToSend && !buttonIdToSend && !listIdToSend) return
    setLoading(true)
    sendMessageInternal(phone, textToSend, buttonIdToSend, listIdToSend)
      .catch((err) => console.error('Send error:', err))
      .finally(() => setLoading(false))
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <MessageSquareCode className="w-7 h-7 text-emerald-600" />
            WhatsApp Chatbot Sandbox
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Simulate live WhatsApp ordering, test fish catalogue selection, and verify real-time session persistence.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-1.5 px-2">
            <Phone className="w-4 h-4 text-emerald-600" />
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 15551964153 or +919876543210"
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 w-44"
            />
          </div>

          <button
            onClick={handleStartFreshSession}
            disabled={loading}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Start Fresh Session</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Phone Mockup + Realtime Debugger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Phone Simulator UI */}
        <div className="lg:col-span-2 bg-slate-900 rounded-3xl p-4 shadow-2xl border-4 border-slate-800 max-w-md mx-auto w-full">
          {/* Phone Header */}
          <div className="bg-emerald-800 text-white p-3 rounded-2xl flex items-center justify-between mb-3 shadow-sm">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Bestiet Fresh" className="w-10 h-10 object-contain bg-white rounded-full p-1 shrink-0" />
              <div>
                <p className="font-extrabold text-sm leading-none flex items-center gap-1">
                  BESTIET FRESH 🐟
                </p>
                <p className="text-[10px] text-emerald-200 mt-0.5">Your Fresh Friend At The Door</p>
              </div>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" title="Online" />
          </div>

          {/* Chat Messages Body */}
          <div className="bg-[#efeae2] rounded-2xl p-4 h-[440px] overflow-y-auto space-y-3 font-sans">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">WhatsApp Simulator Ready</h4>
                <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                  Click "Start Fresh Session" or send "Hi" to begin an interactive fish ordering session for <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-[11px]">{normalizePhoneNumber(phone)}</code>.
                </p>
                <button
                  onClick={handleStartFreshSession}
                  className="px-4 py-2 bg-emerald-600 text-white font-semibold text-xs rounded-xl shadow-xs hover:bg-emerald-700 transition-all flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Start Fresh Session</span>
                </button>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl text-xs space-y-2.5 shadow-xs ${
                      msg.sender === 'user'
                        ? 'bg-[#d9fdd3] text-slate-900 rounded-tr-none'
                        : 'bg-white text-slate-900 rounded-tl-none border border-slate-100'
                    }`}
                  >
                    <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>

                    {/* Render Interactive Reply Buttons */}
                    {msg.buttons && msg.buttons.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 flex flex-col gap-1.5">
                        {msg.buttons.map((btn) => (
                          <button
                            key={btn.id}
                            onClick={() => handleSendMessage(btn.title, btn.id)}
                            className="w-full py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] rounded-xl text-center transition-colors border border-emerald-200/80"
                          >
                            {btn.title}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Render Interactive List Rows */}
                    {msg.listSections && msg.listSections.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        {msg.listSections.map((sec, sIdx) => (
                          <div key={sIdx} className="space-y-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">{sec.title}</p>
                            {sec.rows.map((row) => (
                              <button
                                key={row.id}
                                onClick={() => handleSendMessage(row.title, undefined, row.id)}
                                className="w-full text-left p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200/70 hover:border-emerald-200 transition-colors"
                              >
                                <p className="font-bold text-slate-900 text-xs">{row.title}</p>
                                {row.description && (
                                  <p className="text-[10px] text-slate-500 line-clamp-1">{row.description}</p>
                                )}
                              </button>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="text-[9px] text-slate-400 text-right">{msg.timestamp}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Reply Bar */}
          <div className="pt-3 flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => handleSendMessage('Hi')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-[11px] font-semibold rounded-xl whitespace-nowrap"
            >
              🐟 Main Menu
            </button>
            <button
              onClick={() => handleSendMessage('Order Fresh Fish', 'btn_order_fish')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-[11px] font-semibold rounded-xl whitespace-nowrap"
            >
              🛒 Order Fish
            </button>
            <button
              onClick={() => handleSendMessage('Track Order', 'btn_track_order')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-[11px] font-semibold rounded-xl whitespace-nowrap"
            >
              📦 Track Order
            </button>
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSendMessage(inputText)
            }}
            className="pt-2 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type message or reply to bot..."
              className="flex-1 px-4 py-2.5 bg-slate-800 text-white placeholder-slate-400 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors shrink-0 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Right Column: Real-time Session State Machine Debugger */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Boxes className="w-4 h-4 text-emerald-600" />
                Session State Machine
              </h3>
              <button
                onClick={fetchSessionState}
                className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors"
                title="Refresh Session State"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {sessionError && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{sessionError}</span>
              </div>
            )}

            {customerInfo && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <p className="font-bold text-slate-900">{customerInfo.name}</p>
                <p className="text-[11px] text-slate-500 font-mono">Phone: {customerInfo.phone}</p>
              </div>
            )}

            {sessionState ? (
              <div className="space-y-3.5 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Current Bot State</span>
                  <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg text-xs inline-block mt-1 border border-emerald-200">
                    {sessionState.state}
                  </span>
                </div>

                {sessionState.selected_branch_id && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Selected Branch</span>
                    <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px] inline-block mt-0.5 border border-blue-200">
                      🏪 {sessionState.selected_branch_id === 'b2222222-2222-2222-2222-222222222222' ? 'Fort Kochi Branch' : 'Marine Drive Branch'}
                    </span>
                  </div>
                )}

                {sessionState.pending_remarks && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Pending Remarks</span>
                    <span className="font-medium text-amber-900 bg-amber-50 px-2 py-0.5 rounded text-[11px] inline-block mt-0.5 border border-amber-200">
                      📝 {sessionState.pending_remarks}
                    </span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Cart Items ({sessionState.cart?.length || 0})
                    </span>
                    {sessionState.cart && sessionState.cart.length > 0 && (
                      <button
                        onClick={handleClearCart}
                        className="text-[10px] font-bold text-red-600 hover:text-red-800 hover:underline flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Clear Cart
                      </button>
                    )}
                  </div>

                  {!sessionState.cart || sessionState.cart.length === 0 ? (
                    <p className="text-slate-400 italic text-[11px]">Cart is currently empty</p>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {sessionState.cart.map((i: any, idx: number) => (
                        <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                          <div>
                            <p className="font-bold text-slate-800">{i.product_name}</p>
                            <p className="text-[10px] text-slate-500">
                              {i.quantity_kg}kg ({i.cutting_type?.replace('_', ' ') || 'whole'})
                            </p>
                          </div>
                          <span className="font-extrabold text-emerald-700">₹{i.subtotal}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
                  <span>Last State Sync:</span>
                  <span className="font-medium text-slate-700">
                    {new Date(sessionState.updated_at).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400 space-y-2">
                <p>No active session loaded.</p>
                <button
                  onClick={handleStartFreshSession}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl font-semibold text-xs hover:bg-emerald-700 transition-colors"
                >
                  Start Fresh Session
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
