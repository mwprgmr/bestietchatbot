'use client'

import React, { useState } from 'react'
import StorefrontLayout from '@/components/customer/StorefrontLayout'
import { Phone, Mail, MapPin, MessageSquare, Send, CheckCircle2 } from 'lucide-react'

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <StorefrontLayout>
      <div className="max-w-3xl mx-auto space-y-8 py-4">
        <div className="text-center space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Get In Touch
          </span>
          <h1 className="text-3xl font-black text-slate-900">CONTACT BESTIET FRESH</h1>
          <p className="text-xs text-slate-500 max-w-lg mx-auto">
            We are here to help you with order queries, custom cuts, or delivery updates.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Quick Contact Cards */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs text-center space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <Phone className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-extrabold text-slate-900">Phone Support</h3>
            <p className="text-xs font-bold text-emerald-700">+91 96560 55969</p>
            <p className="text-[10px] text-slate-400">Available 7:00 AM – 9:00 PM</p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs text-center space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-extrabold text-slate-900">WhatsApp Order</h3>
            <a
              href="https://wa.me/919656055969"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-bold text-emerald-700 hover:underline block"
            >
              +91 96560 55969
            </a>
            <p className="text-[10px] text-slate-400">Instant chat & order tracking</p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs text-center space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-extrabold text-slate-900">Service Locations</h3>
            <p className="text-xs text-slate-700 font-bold">Manvila & Peroorkada</p>
            <p className="text-[10px] text-slate-400">Trivandrum, Kerala</p>
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
            Send Us a Message
          </h2>

          {submitted ? (
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2 text-emerald-900">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h3 className="text-sm font-extrabold">Message Sent Successfully!</h3>
              <p className="text-xs text-emerald-700">Our customer team will contact you shortly.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 uppercase mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Kumar"
                    className="w-full px-3.5 py-2.5 bg-[#F7F8F5] border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-800 uppercase mb-1">
                    Phone / WhatsApp
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9656055969"
                    className="w-full px-3.5 py-2.5 bg-[#F7F8F5] border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-800 uppercase mb-1">
                  Message / Feedback
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Tell us how we can help you..."
                  className="w-full px-3.5 py-2.5 bg-[#F7F8F5] border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all inline-flex items-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Message</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </StorefrontLayout>
  )
}
