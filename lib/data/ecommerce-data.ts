export interface CategoryInfo {
  id: string
  name: string
  slug: string
  description: string
  image: string
  itemCount: number
}

export const CATEGORIES: CategoryInfo[] = [
  {
    id: 'fish-seafood',
    name: 'Fish & Seafood',
    slug: 'fish',
    description: 'Fresh ocean catch & backwater fish cleaned your way',
    image: 'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?auto=format&fit=crop&w=600&q=80',
    itemCount: 12,
  },
  {
    id: 'chicken',
    name: 'Fresh Chicken',
    slug: 'chicken',
    description: 'Farm fresh tender, antibiotic-free chicken',
    image: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=600&q=80',
    itemCount: 8,
  },
  {
    id: 'mutton',
    name: 'Tender Mutton',
    slug: 'mutton',
    description: 'Fresh pasture-raised goat meat & biryani cuts',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
    itemCount: 6,
  },
  {
    id: 'seafood-prawns',
    name: 'Prawns & Crabs',
    slug: 'seafood',
    description: 'Cleaned Tiger Prawns, White Prawns & Swimmer Crabs',
    image: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=600&q=80',
    itemCount: 5,
  },
  {
    id: 'ready-to-cook',
    name: 'Ready to Cook',
    slug: 'ready-to-cook',
    description: 'Marinated fish fry, chicken starters & curry mixes',
    image: 'https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?auto=format&fit=crop&w=600&q=80',
    itemCount: 4,
  },
  {
    id: 'combos',
    name: 'Fresh Combos',
    slug: 'combos',
    description: 'Family fish packs & weekend meat combo bundles',
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=600&q=80',
    itemCount: 4,
  },
]

export const CLEANING_OPTIONS: Record<string, string[]> = {
  Fish: ['Cleaned & Whole', 'Curry Cut', 'Fry Cut', 'Fillet', 'Whole (Uncleaned)'],
  Seafood: ['Cleaned & Deveined', 'Shell On', 'Curry Cut'],
  Specialty: ['Cleaned & Deveined', 'Whole'],
  Chicken: ['Curry Cut', 'Boneless', 'Skinless', 'Drumsticks Only', 'Whole Chicken'],
  Mutton: ['Curry Cut', 'Boneless', 'Biryani Cut', 'Chops'],
  Combos: ['Standard Pack', 'Custom Cut'],
  'Ready to Cook': ['Standard Pack'],
}

export const WEIGHT_OPTIONS = [
  { label: '500g', value: 0.5 },
  { label: '1 kg', value: 1.0 },
  { label: '1.5 kg', value: 1.5 },
  { label: '2 kg', value: 2.0 },
  { label: '3 kg', value: 3.0 },
]

export interface DeliverySlot {
  id: string
  day: 'TODAY' | 'TOMORROW'
  dateLabel: string
  timeSlot: string
  isFull: boolean
}

export function getDeliverySlots(): DeliverySlot[] {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const formatDay = (d: Date) =>
    d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })

  return [
    {
      id: 'slot_1',
      day: 'TODAY',
      dateLabel: `Today (${formatDay(today)})`,
      timeSlot: '10:00 AM – 12:30 PM',
      isFull: false,
    },
    {
      id: 'slot_2',
      day: 'TODAY',
      dateLabel: `Today (${formatDay(today)})`,
      timeSlot: '01:00 PM – 03:30 PM',
      isFull: false,
    },
    {
      id: 'slot_3',
      day: 'TODAY',
      dateLabel: `Today (${formatDay(today)})`,
      timeSlot: '04:30 PM – 07:00 PM',
      isFull: false,
    },
    {
      id: 'slot_4',
      day: 'TODAY',
      dateLabel: `Today (${formatDay(today)})`,
      timeSlot: '07:30 PM – 09:30 PM',
      isFull: false,
    },
    {
      id: 'slot_5',
      day: 'TOMORROW',
      dateLabel: `Tomorrow (${formatDay(tomorrow)})`,
      timeSlot: '07:00 AM – 09:30 AM',
      isFull: false,
    },
    {
      id: 'slot_6',
      day: 'TOMORROW',
      dateLabel: `Tomorrow (${formatDay(tomorrow)})`,
      timeSlot: '10:00 AM – 12:30 PM',
      isFull: false,
    },
    {
      id: 'slot_7',
      day: 'TOMORROW',
      dateLabel: `Tomorrow (${formatDay(tomorrow)})`,
      timeSlot: '04:30 PM – 07:00 PM',
      isFull: false,
    },
  ]
}

export function getProductImagePlaceholder(category: string, name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes('neymeen') || lower.includes('seer')) {
    return 'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?auto=format&fit=crop&w=800&q=80'
  }
  if (lower.includes('ayala') || lower.includes('mackerel')) {
    return 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80'
  }
  if (lower.includes('mathi') || lower.includes('sardine')) {
    return 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80'
  }
  if (lower.includes('prawn') || lower.includes('shrimp')) {
    return 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=800&q=80'
  }
  if (lower.includes('salmon')) {
    return 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=800&q=80'
  }
  if (lower.includes('pomfret') || lower.includes('avoli')) {
    return 'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?auto=format&fit=crop&w=800&q=80'
  }
  if (lower.includes('chicken')) {
    return 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=800&q=80'
  }
  if (lower.includes('mutton') || lower.includes('goat')) {
    return 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80'
  }
  return 'https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?auto=format&fit=crop&w=800&q=80'
}
