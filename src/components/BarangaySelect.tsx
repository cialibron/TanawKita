import { BARANGAYS } from '../data/barangays'

interface Props {
  id: string
  value: string
  onChange: (code: string) => void
}

export default function BarangaySelect({ id, value, onChange }: Props) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      {BARANGAYS.map((b) => (
        <option key={b.code} value={b.code}>
          {b.name}
        </option>
      ))}
    </select>
  )
}
