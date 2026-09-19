export const dynamic = 'force-dynamic';
export const revalidate = 0;

import React from 'react'
import StorefrontLayout from '@/components/customer/StorefrontLayout'
import CinematicHero from '@/components/cinematic/CinematicHero'
import ProductShowcase from '@/components/cinematic/ProductShowcase'
import HomepageHero from '@/components/customer/HomepageHero'
import ProductGrid from '@/components/customer/ProductGrid'

export default function CustomerHomepage() {
  return (
    <StorefrontLayout>
      {/* 1. Full-Screen Cinematic Animated WebGL Hero */}
      <CinematicHero />

      {/* 2. Interactive Product Category Showcase */}
      <ProductShowcase />

      {/* 3. Promotional Posters & Category Slider */}
      <div id="categories" className="max-w-7xl mx-auto px-4 pt-10">
        <HomepageHero />
      </div>

      {/* 4. Live Branch Inventory Product Grid */}
      <div id="products" className="max-w-7xl mx-auto px-4">
        <ProductGrid />
      </div>
    </StorefrontLayout>
  )
}
