export const dynamic = 'force-dynamic';
export const revalidate = 0;

import React from 'react'
import StorefrontLayout from '@/components/customer/StorefrontLayout'
import HomepageHero from '@/components/customer/HomepageHero'
import ProductGrid from '@/components/customer/ProductGrid'

export default function CustomerHomepage() {
  return (
    <StorefrontLayout>
      <HomepageHero />
      <ProductGrid />
    </StorefrontLayout>
  )
}
