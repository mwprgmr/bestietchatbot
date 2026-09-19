import React from 'react'
import LoadingScreen from '@/components/ui/LoadingScreen'

export default function Loading() {
  return <LoadingScreen fullScreen={true} message="LOADING BESTIET FRESH" subtext="Fetching fresh daily catch & live stock..." />
}
