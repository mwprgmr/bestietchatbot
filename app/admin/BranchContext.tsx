'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Branch } from '@/types/database'

interface BranchContextType {
  selectedBranchId: string // 'ALL' or specific branch UUID
  setSelectedBranchId: (id: string) => void
  branches: Branch[]
  loadingBranches: boolean
}

const BranchContext = createContext<BranchContextType>({
  selectedBranchId: 'ALL',
  setSelectedBranchId: () => {},
  branches: [],
  loadingBranches: true,
})

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL')
  const [branches, setBranches] = useState<Branch[]>([])
  const [loadingBranches, setLoadingBranches] = useState<boolean>(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadBranches() {
      try {
        const { data, error } = await supabase.from('branches').select('*').eq('is_active', true)
        if (!error && data && data.length > 0) {
          setBranches(data)
        } else {
          setBranches([
            { id: 'b1111111-1111-1111-1111-111111111111', name: 'Marine Drive Branch', location: 'Marine Drive, Kochi', is_active: true },
            { id: 'b2222222-2222-2222-2222-222222222222', name: 'Fort Kochi Branch', location: 'Fort Kochi, Kochi', is_active: true },
          ])
        }
      } catch (err) {
        console.error('Failed to load branches:', err)
      } finally {
        setLoadingBranches(false)
      }
    }
    loadBranches()
  }, [])

  return (
    <BranchContext.Provider
      value={{
        selectedBranchId,
        setSelectedBranchId,
        branches,
        loadingBranches,
      }}
    >
      {children}
    </BranchContext.Provider>
  )
}

export function useBranchContext() {
  return useContext(BranchContext)
}
