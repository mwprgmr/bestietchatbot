'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Branch {
  id: string
  name: string
  location: string
  is_active: boolean
}

export interface CartItem {
  cart_key: string // product_id + cut + weight
  product_id: string
  product_name: string
  image_url: string | null
  category: string
  unit: string
  price_per_kg: number
  weight_kg: number // selected weight option e.g., 0.5, 1.0, 2.0
  quantity: number // pack count
  cleaning_option: string // 'Whole' | 'Cleaned' | 'Curry Cut' | 'Fry Cut' | 'Fillet' | 'Boneless'
  available_stock: number
}

export interface AppliedCoupon {
  code: string
  discount_type: 'flat' | 'percent'
  discount_value: number
  max_discount?: number
  min_order?: number
}

interface CustomerContextType {
  branches: Branch[]
  selectedBranch: Branch
  setSelectedBranch: (branch: Branch) => void
  deliveryAddress: string
  setDeliveryAddress: (address: string) => void
  userLocation: { lat?: number; lng?: number; addressName?: string } | null
  setUserLocation: (loc: { lat?: number; lng?: number; addressName?: string } | null) => void
  cart: CartItem[]
  addToCart: (item: Omit<CartItem, 'cart_key'>) => void
  updateCartQuantity: (cart_key: string, delta: number) => void
  removeFromCart: (cart_key: string) => void
  clearCart: () => void
  isCartOpen: boolean
  setIsCartOpen: (open: boolean) => void
  isLocationOpen: boolean
  setIsLocationOpen: (open: boolean) => void
  appliedCoupon: AppliedCoupon | null
  applyCoupon: (code: string) => { success: boolean; message: string }
  removeCoupon: () => void
  cartSubtotal: number
  discountAmount: number
  deliveryFee: number
  grandTotal: number
}

const DEFAULT_BRANCH: Branch = {
  id: 'b1111111-1111-1111-1111-111111111111',
  name: 'Manvila Kazhakkoottam Branch',
  location: 'Manvila, Kazhakkoottam, Trivandrum',
  is_active: true,
}

const PEROORKADA_BRANCH: Branch = {
  id: 'b2222222-2222-2222-2222-222222222222',
  name: 'Peroorkada Branch',
  location: 'Peroorkada, Trivandrum',
  is_active: true,
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined)

export function CustomerProvider({ children }: { children: React.ReactNode }) {
  const [branches, setBranches] = useState<Branch[]>([DEFAULT_BRANCH, PEROORKADA_BRANCH])
  const [selectedBranch, setSelectedBranchState] = useState<Branch>(DEFAULT_BRANCH)
  const [deliveryAddress, setDeliveryAddressState] = useState<string>('Manvila, Kazhakkoottam, Trivandrum')
  const [userLocation, setUserLocation] = useState<{ lat?: number; lng?: number; addressName?: string } | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isLocationOpen, setIsLocationOpen] = useState(false)
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null)

  // Load saved state from localStorage on mount
  useEffect(() => {
    try {
      const savedBranch = localStorage.getItem('bestiet_selected_branch')
      if (savedBranch) {
        const parsed = JSON.parse(savedBranch)
        if (parsed && typeof parsed === 'object' && parsed.id && parsed.name) {
          setSelectedBranchState(parsed)
        }
      }
      const savedAddress = localStorage.getItem('bestiet_delivery_address')
      if (savedAddress) {
        setDeliveryAddressState(savedAddress)
      }
      const savedCart = localStorage.getItem('bestiet_cart')
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart)
        if (Array.isArray(parsedCart)) {
          setCart(parsedCart)
        }
      }
    } catch (e) {
      console.warn('Failed to load local storage state:', e)
    }
  }, [])

  // Persist cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('bestiet_cart', JSON.stringify(cart))
    } catch (e) {}
  }, [cart])

  const setSelectedBranch = (branch: Branch) => {
    setSelectedBranchState(branch)
    try {
      localStorage.setItem('bestiet_selected_branch', JSON.stringify(branch))
    } catch (e) {}
  }

  const setDeliveryAddress = (addr: string) => {
    setDeliveryAddressState(addr)
    try {
      localStorage.setItem('bestiet_delivery_address', addr)
    } catch (e) {}
  }

  const addToCart = (item: Omit<CartItem, 'cart_key'>) => {
    const key = `${item.product_id}_${item.cleaning_option.replace(/\s+/g, '_')}_${item.weight_kg}`
    setCart((prevCart) => {
      const existingIdx = prevCart.findIndex((i) => i.cart_key === key)
      if (existingIdx > -1) {
        const updated = [...prevCart]
        const currentQty = updated[existingIdx].quantity
        const maxAllowed = Math.floor(item.available_stock / item.weight_kg)
        const nextQty = Math.min(currentQty + item.quantity, Math.max(1, maxAllowed))
        updated[existingIdx] = { ...updated[existingIdx], quantity: nextQty }
        return updated
      } else {
        return [...prevCart, { ...item, cart_key: key }]
      }
    })
    setIsCartOpen(true)
  }

  const updateCartQuantity = (cart_key: string, delta: number) => {
    setCart((prevCart) => {
      return prevCart
        .map((item) => {
          if (item.cart_key === cart_key) {
            const newQty = item.quantity + delta
            const maxAllowed = Math.floor(item.available_stock / item.weight_kg)
            if (newQty <= 0) return null
            if (newQty > maxAllowed) {
              alert(`Maximum available stock reached (${item.available_stock} kg).`)
              return { ...item, quantity: Math.max(1, maxAllowed) }
            }
            return { ...item, quantity: newQty }
          }
          return item
        })
        .filter(Boolean) as CartItem[]
    })
  }

  const removeFromCart = (cart_key: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.cart_key !== cart_key))
  }

  const clearCart = () => {
    setCart([])
    setAppliedCoupon(null)
    try {
      localStorage.removeItem('bestiet_cart')
    } catch (e) {}
  }

  const cartSubtotal = cart.reduce((sum, item) => sum + item.price_per_kg * item.weight_kg * item.quantity, 0)

  // Calculate Delivery Fee (Free above ₹500, else ₹35)
  const deliveryFee = cartSubtotal > 0 ? (cartSubtotal >= 500 ? 0 : 35) : 0

  // Calculate Coupon Discount
  let discountAmount = 0
  if (appliedCoupon) {
    if (appliedCoupon.discount_type === 'flat') {
      discountAmount = appliedCoupon.discount_value
    } else if (appliedCoupon.discount_type === 'percent') {
      discountAmount = Math.round((cartSubtotal * appliedCoupon.discount_value) / 100)
      if (appliedCoupon.max_discount) {
        discountAmount = Math.min(discountAmount, appliedCoupon.max_discount)
      }
    }
  }

  const grandTotal = Math.max(0, cartSubtotal - discountAmount + deliveryFee)

  const applyCoupon = (code: string) => {
    const cleanCode = code.trim().toUpperCase()
    if (!cleanCode) {
      return { success: false, message: 'Please enter a valid coupon code.' }
    }
    if (cleanCode === 'BESTIET100') {
      if (cartSubtotal < 499) {
        return { success: false, message: 'Minimum order value of ₹499 required for BESTIET100.' }
      }
      setAppliedCoupon({
        code: 'BESTIET100',
        discount_type: 'flat',
        discount_value: 100,
      })
      return { success: true, message: 'Coupon BESTIET100 applied! You saved ₹100.' }
    }
    if (cleanCode === 'FRESH20' || cleanCode === 'WELCOME20') {
      setAppliedCoupon({
        code: cleanCode,
        discount_type: 'percent',
        discount_value: 20,
        max_discount: 150,
      })
      return { success: true, message: `Coupon ${cleanCode} applied! 20% discount added.` }
    }
    return { success: false, message: 'Invalid or expired coupon code.' }
  }

  const removeCoupon = () => {
    setAppliedCoupon(null)
  }

  return (
    <CustomerContext.Provider
      value={{
        branches,
        selectedBranch,
        setSelectedBranch,
        deliveryAddress,
        setDeliveryAddress,
        userLocation,
        setUserLocation,
        cart,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        isCartOpen,
        setIsCartOpen,
        isLocationOpen,
        setIsLocationOpen,
        appliedCoupon,
        applyCoupon,
        removeCoupon,
        cartSubtotal,
        discountAmount,
        deliveryFee,
        grandTotal,
      }}
    >
      {children}
    </CustomerContext.Provider>
  )
}

export function useCustomer() {
  const context = useContext(CustomerContext)
  if (!context) {
    throw new Error('useCustomer must be used within a CustomerProvider')
  }
  return context
}
