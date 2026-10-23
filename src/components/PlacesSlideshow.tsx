import { useEffect, useState } from 'react'
import dencias1 from '../assets/places/dencias-1.jpg'
import dencias2 from '../assets/places/dencias-2.jpg'
import shanghai from '../assets/places/shanghai.jpg'

// Openly licensed photos of real Davao City restaurants from Wikimedia Commons (CC BY-SA 4.0, credited on screen).
// Captions name the place only: these businesses are not partners and are not shown as hiring.
export interface Place {
  src: string
  name: string
  area: string
  credit: string
  source: string
}

export const PLACES: Place[] = [
  {
    src: dencias1,
    name: "Dencia's Restaurant",
    area: 'Davao City',
    credit: 'Herbertkikoy',
    source: 'https://commons.wikimedia.org/wiki/File:Davao_Dencia%27s_Restaurant.jpg',
  },
  {
    src: shanghai,
    name: 'Davao Shanghai Restaurant',
    area: 'Magsaysay Avenue',
    credit: 'Iamharleyas',
    source: 'https://commons.wikimedia.org/wiki/File:Davao_Shanghai_Restaurant_Facade.jpg',
  },
  {
    src: dencias2,
    name: "Dencia's Restaurant",
    area: 'Davao City',
    credit: 'Herbertkikoy',
    source: 'https://commons.wikimedia.org/wiki/File:Davao_Dencia%27s_Restaurant_2.jpg',
  },
]

const SLIDE_MS = 6000

// Current slide index, advancing on a timer. Paused for users who prefer reduced motion.
export function useSlide(count: number): number {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), SLIDE_MS)
    return () => clearInterval(timer)
  }, [count])
  return index
}

// Cross-fading photos that fill their container (the glass panel), with a dark wash for text contrast.
export function PlacesSlides({ index }: { index: number }) {
  return (
    <div className="places-slides">
      {PLACES.map((p, i) => (
        <img key={p.source} src={p.src} alt="" className={i === index ? 'active' : undefined} />
      ))}
      <div className="places-wash" />
    </div>
  )
}

// Caption and photo credit for the current slide (kept outside the glass so the links can be clicked).
export function PlacesCaption({ index }: { index: number }) {
  const p = PLACES[index]
  return (
    <div className="places-caption" aria-live="polite">
      <span className="places-label">Around Davao City</span>
      <strong>{p.name}</strong>
      <span>{p.area}</span>
      <a href={p.source} target="_blank" rel="noreferrer">
        Photo: {p.credit}, CC BY-SA 4.0
      </a>
    </div>
  )
}
