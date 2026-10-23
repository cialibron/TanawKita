import { useEffect, useMemo, useState } from 'react'
import {
  BUSINESS_CATEGORIES,
  searchCompetitors,
  type BusinessCategoryId,
  type CompetitorPlace,
  type CompetitorSearchMode,
} from '../../businessDirectory'
import type { Business } from '../../types'
import { CATEGORY_STYLE } from '../../components/businessCategoryStyle'

const DAVAO_CENTER: [number, number] = [7.0731, 125.6128]
const LOCAL_RADII = [1, 3, 5]
const ALL = 'all'
type CategoryChoice = BusinessCategoryId | typeof ALL
export type MarketMode = 'franchise' | 'city'

interface Props {
  mode: MarketMode
  business: Business | null
  onPlacesChange: (places: CompetitorPlace[]) => void
  onSelectedPlaceChange: (place: CompetitorPlace | null) => void
  onMapModeChange: (mode: CompetitorSearchMode) => void
}

export default function MarketResearch({ mode, business, onPlacesChange, onSelectedPlaceChange, onMapModeChange }: Props) {
  const [categoryId, setCategoryId] = useState<CategoryChoice>(ALL)
  const [radiusKm, setRadiusKm] = useState(3)
  const [places, setPlaces] = useState<CompetitorPlace[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const category = BUSINESS_CATEGORIES.find((item) => item.id === categoryId) ?? null
  const categoryText = category ? category.label.toLowerCase() : 'businesses'
  const center: [number, number] = business ? [business.lat, business.lng] : DAVAO_CENTER
  const searchMode: CompetitorSearchMode = mode === 'city' ? 'city' : 'local'
  const selectedPlace = places.find((place) => place.id === selectedId) ?? null
  const nearest = useMemo(
    () => places.filter((place) => place.distanceKm !== undefined).sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))[0],
    [places],
  )

  useEffect(() => onMapModeChange(searchMode), [searchMode, onMapModeChange])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    setSelectedId(null)
    onSelectedPlaceChange(null)
    const categories = category ? [category] : BUSINESS_CATEGORIES
    Promise.all(categories.map((item) => searchCompetitors({ category: item, mode: searchMode, center, radiusKm })))
      .then((groups) => groups.flat().sort((a, b) => searchMode === 'local'
        ? (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity)
        : a.name.localeCompare(b.name)))
      .then((results) => {
        if (!active) return
        setPlaces(results)
        onPlacesChange(results)
      })
      .catch((cause: unknown) => {
        if (!active) return
        setPlaces([])
        onPlacesChange([])
        setError(cause instanceof Error ? cause.message : 'Could not load the local simulation sheet.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [category, searchMode, center[0], center[1], radiusKm, onPlacesChange, onSelectedPlaceChange])

  function selectPlace(place: CompetitorPlace) {
    const nextId = selectedId === place.id ? null : place.id
    setSelectedId(nextId)
    onSelectedPlaceChange(nextId ? place : null)
  }

  const summary = searchMode === 'local'
    ? business
      ? `Within ${radiusKm} km of ${business.name}`
      : `Within ${radiusKm} km of Davao City center (set a business location for a precise catchment)`
    : 'Across Davao City'

  return (
    <section className="market-research">
      <div className="advisor-heading">
        <div className="detail-kicker">LOCAL MARKET RESEARCH · SIMULATION</div>
        <h1>{mode === 'franchise' ? 'Franchise planning' : 'Competitor map'}</h1>
        <p className="muted">
          {mode === 'franchise'
            ? 'Explore nearby businesses in the same category and compare possible franchise locations.'
            : 'Browse similar businesses across Davao City and select one to inspect its approximate position.'}
        </p>
      </div>

      <div className="advisor-filter-card">
        <label htmlFor="competitor-category">Business type</label>
        <select id="competitor-category" value={categoryId} onChange={(event) => setCategoryId(event.target.value as CategoryChoice)}>
          <option value={ALL}>All business types</option>
          {BUSINESS_CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
        {mode === 'franchise' && (
          <>
            <label>Local search radius</label>
            <div className="advisor-radius-options">
              {LOCAL_RADII.map((radius) => (
                <button key={radius} type="button" className={`advisor-radius${radiusKm === radius ? ' active' : ''}`} onClick={() => setRadiusKm(radius)}>
                  {radius} km
                </button>
              ))}
            </div>
          </>
        )}
        <div className="advisor-search-context">
          <span aria-hidden="true">⌖</span>
          <span>{summary}</span>
        </div>
      </div>

      <div className="advisor-result-heading">
        <div>
          <h2>{mode === 'franchise' ? 'Nearby competition' : 'Davao-wide competitors'}</h2>
          <p className="muted">{loading ? 'Loading simulation data…' : `${places.length.toLocaleString()} sample ${categoryText}`}</p>
        </div>
        <span className="simulation-source-pill">CSV simulation</span>
      </div>

      {loading && <div className="advisor-loading">Loading local business simulation…</div>}
      {error && <div className="advisor-error" role="alert"><p>{error}</p></div>}

      {!loading && !error && places.length > 0 && (
        <div className="advisor-market-snapshot">
          <div><span>{mode === 'franchise' ? 'In this area' : 'Across Davao'}</span><strong>{places.length.toLocaleString()}</strong></div>
          {mode === 'franchise' && nearest && <div><span>Closest sample</span><strong>{nearest.distanceKm?.toFixed(1)} km</strong></div>}
          {mode === 'city' && <div><span>Map markers</span><strong>Clustered</strong></div>}
        </div>
      )}

      {!loading && !error && places.length === 0 && (
        <div className="advisor-empty">
          <span aria-hidden="true">⌖</span>
          <strong>No sample {categoryText} found here</strong>
          <p>Try a larger radius or another category. This view only uses the clearly marked synthetic demo sheet.</p>
        </div>
      )}

      {places.length > 0 && (
        <>
          <div className="advisor-place-list">
            {(mode === 'city' ? places.slice(0, 40) : places).map((place, index) => (
              <button key={place.id} type="button" className={`advisor-place${selectedId === place.id ? ' selected' : ''}`} onClick={() => selectPlace(place)}>
                <span className="advisor-place-number" style={{ boxShadow: `inset 3px 0 ${CATEGORY_STYLE[place.category].color}` }}>{String(index + 1).padStart(2, '0')}</span>
                <span className="advisor-place-copy">
                  <strong>{place.name}</strong>
                  <small>{CATEGORY_STYLE[place.category].short} · {place.address}{place.distanceKm !== undefined ? ` · ${place.distanceKm.toFixed(1)} km` : ''}</small>
                </span>
                <span className="advisor-place-marker" aria-hidden="true">↗</span>
              </button>
            ))}
          </div>
          {mode === 'city' && places.length > 40 && <p className="muted">Showing 40 of {places.length.toLocaleString()} sample businesses in the list. All are plotted on the map.</p>}
        </>
      )}

      {selectedPlace && (
        <div className="advisor-selected-place">
          <div className="detail-kicker">SELECTED SIMULATION BUSINESS</div>
          <strong>{selectedPlace.name}</strong>
          <span>{CATEGORY_STYLE[selectedPlace.category].short} · {selectedPlace.address}{selectedPlace.distanceKm !== undefined ? ` · ${selectedPlace.distanceKm.toFixed(1)} km away` : ''}</span>
          <span className="advisor-synthetic-note">Approximate demo location · not an actual storefront</span>
        </div>
      )}

      {mode === 'franchise' && (
        <div className="advisor-positioning">
          <h3>Compare a possible location</h3>
          <p>Use the map to spot clusters and areas with fewer sample competitors. Check rent, access, customer traffic, and local conditions in person before choosing a franchise site.</p>
        </div>
      )}

      <p className="advisor-attribution">All businesses in this view are fictional simulation records from `simulation-data/businesses.csv`. Points are approximate barangay-level demo locations; they are not real competitors or an official business registry.</p>
    </section>
  )
}
