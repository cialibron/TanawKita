import eyeWhite from '../assets/brand/icon-eye-white.svg'
import eyePupil from '../assets/brand/icon-eye-pupil.svg'
import eyeStar from '../assets/brand/icon-eye-star.png'

// The eye from the Figma "Assets" frame (14:99), 31 x 17. "closed" adds a slash for the hide-password state.
export default function EyeIcon({ closed = false, width = 26 }: { closed?: boolean; width?: number }) {
  const scale = width / 31
  return (
    <span className="tk-eye-icon" aria-hidden="true" style={{ width, height: 17 * scale }}>
      <span style={{ transform: `scale(${scale})` }}>
        <img src={eyeWhite} width={31} height={17} alt="" style={{ left: 0, top: 0 }} />
        <img src={eyePupil} width={17} height={17} alt="" style={{ left: 7, top: 0 }} />
        <img src={eyeStar} width={13} height={13} alt="" style={{ left: 9, top: 2, borderRadius: '50%' }} />
        {closed && <i className="tk-eye-slash" />}
      </span>
    </span>
  )
}
