import type { Product } from '../types'

export const CHECK_DATE = '2026-10-23'
export const PRELIM_DATE = '2026-prelim'

type Defaults = 'priceDate' | 'seller' | 'includes' | 'excludes' | 'provides' | 'sources' | 'confidence' | 'specStatus' |
  'raptorStatus' | 'raptorNote' | 'tags' | 'priceStatus' | 'specs' | 'pros' | 'cons' | 'summary' | 'name' | 'brand'

/** Builds a Product with conservative defaults so catalog entries stay short and honest. */
export function product(p: Partial<Pick<Product, Defaults>> & Omit<Product, Defaults>): Product {
  return {
    name: p.id,
    brand: 'Unknown',
    summary: '',
    pros: [],
    cons: [],
    specs: [],
    priceStatus: p.price == null ? 'unknown' : 'preliminary',
    priceDate: PRELIM_DATE,
    seller: 'Manufacturer / authorised seller',
    includes: [],
    excludes: [],
    provides: [],
    sources: [],
    confidence: 'team-estimate',
    specStatus: 'unchecked',
    raptorStatus: 'insufficient-info',
    raptorNote: 'No RAPTOR-specific assessment recorded yet.',
    tags: [],
    ...p,
  } as Product
}

export const PRICE_BASIS_NOTE = 'Preliminary price supplied by the team (earlier research). Not an independently verified quotation.'
