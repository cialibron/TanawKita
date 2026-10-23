import pin from '../assets/brand/pin.svg'
import eyeWhite from '../assets/brand/eye-white.svg'
import eyeMask from '../assets/brand/eye-mask.svg'
import pupil from '../assets/brand/pupil.svg'
import pupilStar from '../assets/brand/pupil-star.png'
import smallEyeWhite from '../assets/brand/small-eye-white.svg'
import smallEyePupil from '../assets/brand/small-eye-pupil.svg'

// Figma "Logo" frame (10:78), measured from its top-left content corner (42, 82). Design size 239 x 67.
const DESIGN_WIDTH = 239
const DESIGN_HEIGHT = 67

interface Props {
  height?: number
  // The pin's eye looks around (Figma motion: 4.2 s loop). Off for users who prefer reduced motion.
  animated?: boolean
}

export default function Logo({ height = 67, animated = true }: Props) {
  const scale = height / DESIGN_HEIGHT
  const mask = `url("${eyeMask}")`
  return (
    <div className="tk-logo" role="img" aria-label="TanawKita" style={{ width: DESIGN_WIDTH * scale, height }}>
      <div className="tk-logo-art" style={{ transform: `scale(${scale})` }}>
        <img src={pin} width={43} height={52} alt="" style={{ left: 0, top: 15 }} />
        <img src={eyeWhite} width={31} height={17} alt="" style={{ left: 7, top: 26 }} />
        <div className="tk-logo-eye" style={{ left: 7, top: 26, maskImage: mask, WebkitMaskImage: mask }}>
          <div className={animated ? 'tk-logo-look' : undefined}>
            <img src={pupil} width={17} height={17} alt="" style={{ left: 7, top: 0 }} />
            <img src={pupilStar} width={13} height={13} alt="" className="tk-logo-star" style={{ left: 9, top: 2 }} />
          </div>
        </div>
        <div className="tk-logo-word">
          <span className="tk-logo-tanaw">Tanaw</span>
          <span className="tk-logo-kita">Kita</span>
        </div>
        <img src={smallEyeWhite} width={14.5882} height={8} alt="" style={{ left: 224, top: 39 }} />
        <img src={smallEyePupil} width={8} height={8} alt="" style={{ left: 227.29, top: 39 }} />
        <img src={pupilStar} width={6.118} height={6.118} alt="" style={{ left: 228.24, top: 39.94 }} />
      </div>
    </div>
  )
}

// The pin-and-eye mark alone (43 x 52 in Figma), for the landing page brand lockup.
export function BrandEmblem({ height = 52, animated = true }: { height?: number; animated?: boolean }) {
  const scale = height / 52
  const mask = `url("${eyeMask}")`
  return (
    <div className="tk-emblem" aria-hidden="true" style={{ width: 43 * scale, height }}>
      <div className="tk-logo-art" style={{ width: 43, height: 52, transform: `scale(${scale})` }}>
        <img src={pin} width={43} height={52} alt="" style={{ left: 0, top: 0 }} />
        <img src={eyeWhite} width={31} height={17} alt="" style={{ left: 7, top: 11 }} />
        <div className="tk-logo-eye" style={{ left: 7, top: 11, maskImage: mask, WebkitMaskImage: mask }}>
          <div className={animated ? 'tk-logo-look' : undefined}>
            <img src={pupil} width={17} height={17} alt="" style={{ left: 7, top: 0 }} />
            <img src={pupilStar} width={13} height={13} alt="" className="tk-logo-star" style={{ left: 9, top: 2 }} />
          </div>
        </div>
      </div>
    </div>
  )
}
