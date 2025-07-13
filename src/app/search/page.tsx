'use client';

import { Suspense } from 'react';
import SearchComponent from './search-component';

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading search...</div>}>
      <SearchComponent />
    </Suspense>
  );
}