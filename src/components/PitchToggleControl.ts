import type { IControl, Map as LibreMap } from 'maplibre-gl'

const TILT_3D = 45

// Map button under the compass that switches between a flat 2D view and a tilted 3D view (about 45 degrees).
export default class PitchToggleControl implements IControl {
  private map?: LibreMap
  private container?: HTMLDivElement
  private button?: HTMLButtonElement
  private readonly sync = () => this.render()

  onAdd(map: LibreMap): HTMLElement {
    this.map = map
    this.container = document.createElement('div')
    this.container.className = 'maplibregl-ctrl maplibregl-ctrl-group'
    this.button = document.createElement('button')
    this.button.type = 'button'
    this.button.className = 'maplibregl-ctrl-pitch-toggle'
    this.button.addEventListener('click', () => {
      const flat = map.getPitch() < 5
      map.easeTo(flat ? { pitch: TILT_3D, duration: 600 } : { pitch: 0, bearing: 0, duration: 600 })
    })
    this.container.appendChild(this.button)
    map.on('pitchend', this.sync)
    this.render()
    return this.container
  }

  onRemove() {
    this.map?.off('pitchend', this.sync)
    this.container?.remove()
    this.map = undefined
  }

  // The button names the view it switches to.
  private render() {
    if (!this.map || !this.button) return
    const flat = this.map.getPitch() < 5
    this.button.textContent = flat ? '3D' : '2D'
    this.button.title = flat ? 'Switch to 3D view' : 'Switch to flat 2D view'
    this.button.setAttribute('aria-label', this.button.title)
  }
}
