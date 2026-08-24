'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { getCurrentAdminUser, AdminUser } from '@/lib/auth/admin-auth'
import { Branch } from '@/types/database'

export const FIXED_BRANCHES: Branch[] = [
  {
    id: 'b1111111-1111-1111-1111-111111111111',
    name: 'Marine Drive Branch',
    location: 'Marine Drive, Kochi',
    is_active: true,
  },
  {
    id: 'b2222222-2222-2222-2222-222222222222',
    name: 'Fort Kochi Branch',
    location: 'Fort Kochi, Kochi',
    is_active: true,
  },
]

interface BranchContextType {
  selectedBranchId: string
  activeBranch: Branch
  branches: Branch[]
  currentUser: AdminUser | null
  loadingUser: boolean
}

const BranchContext = createContext<BranchContextType>({
  selectedBranchId: FIXED_BRANCHES[0].id,
  activeBranch: FIXED_BRANCHES[0],
  branches: FIXED_BRANCHES,
  currentUser: null,
  loadingUser: true,
})

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null)
  const [loadingUser, setLoadingUser] = useState<boolean>(true)

  useEffect(() => {
    async function loadUser() {
      try {
        const user = await getCurrentAdminUser()
        if (user) {
          setCurrentUser(user)
        }
      } catch (err) {
        console.error('Failed to load admin user profile:', err)
      } finally {
        setLoadingUser(false)
      }
    }
    loadUser()
  }, [])

  const selectedBranchId = currentUser?.branch_id || FIXED_BRANCHES[0].id
  const activeBranch = FIXED_BRANCHES.find((b) => b.id === selectedBranchId) || FIXED_BRANCHES[0]

  return (
    <BranchContext.Provider
      value={{
        selectedBranchId,
        activeBranch,
        branches: FIXED_BRANCHES,
        currentUser,
        loadingUser,
      }}
    >
      {children}
    </BranchContext.Provider>
  )
}

export function useBranchContext() {
  return useContext(BranchContext)
}
