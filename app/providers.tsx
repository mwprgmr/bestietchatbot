'use client'

import React from 'react'
import { CustomerProvider } from '@/lib/context/CustomerContext'

export default function Providers({ children }: { children: React.ReactNode }) {
  return <CustomerProvider>{children}</CustomerProvider>
}
