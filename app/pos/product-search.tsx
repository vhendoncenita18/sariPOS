'use client'

import { useState } from 'react'

export type SearchProduct = {
  id: string
  name: string
  stock_quantity: number | string | null
}

function formatStock(value: SearchProduct['stock_quantity']) {
  if (value === null || value === '') return 'Stock unavailable'
  const quantity = Number(value)
  if (!Number.isFinite(quantity)) return 'Stock unavailable'
  if (quantity < 0) return `${quantity} · review stock`
  return `${quantity} in stock`
}

export function ProductSearch({ products }: { products: SearchProduct[] }) {
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const matches = normalizedQuery
    ? products.filter((product) => product.name.toLocaleLowerCase().includes(normalizedQuery))
    : products.slice(0, 8)

  return (
    <div className="mt-4">
      <label htmlFor="product-search" className="sr-only">Search products</label>
      <div className="flex h-12 items-center gap-2.5 rounded-lg border border-[#DCE5E1] bg-white px-3 focus-within:border-[#16835D] focus-within:ring-4 focus-within:ring-[#16835D]/10">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-[18px] shrink-0 text-[#687873]" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="10.8" cy="10.8" r="6.8" />
          <path d="m16 16 4.5 4.5" />
        </svg>
        <input
          id="product-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search products by name"
          className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#89928D]"
        />
      </div>

      {products.length === 0 ? (
        <p className="mt-4 rounded-lg bg-[#F7F8F7] p-4 text-sm leading-6 text-[#687873]">No products are available yet.</p>
      ) : matches.length === 0 ? (
        <p className="mt-4 rounded-lg bg-[#F7F8F7] p-4 text-sm leading-6 text-[#687873]">No products match “{query}”. Try another name.</p>
      ) : (
        <ul aria-live="polite" className="mt-2 divide-y divide-[#EEF1EF]">
          {matches.map((product) => (
            <li key={product.id} className="flex min-h-[60px] items-center justify-between gap-4 py-2.5">
              <span className="min-w-0 truncate text-sm font-medium">{product.name}</span>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium tabular-nums ${product.stock_quantity !== null && Number(product.stock_quantity) < 0 ? 'bg-[#FFF1EF] text-[#9A453C]' : 'bg-[#F3F6F4] text-[#535D57]'}`}>
                {formatStock(product.stock_quantity)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {!normalizedQuery && products.length > matches.length ? (
        <p className="mt-2 text-xs text-[#89928D]">Showing 8 of {products.length} products. Search to find another item.</p>
      ) : null}
    </div>
  )
}
