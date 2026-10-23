import { useId, useState, type KeyboardEvent } from 'react'
import { findSkill, isCustomSkill, matchGroups, searchSkills, skillLabel } from './skillCatalog'

// Shown before anything is typed, so people see what kind of skills they can add.
const STARTERS = ['Cashier', 'Customer service', 'Cooking', 'Driving', 'Delivery rider', 'House cleaning', 'Construction helper', 'Data entry']

interface Props {
  value: string[]
  onChange: (skills: string[]) => void
  label?: string
  placeholder?: string
  // Pick one skill only (used as a filter); choosing another replaces it.
  single?: boolean
  // Let people add a skill that is not in the list. It is saved but does not count for matching.
  allowCustom?: boolean
}

// Type a skill and pick from similar pre-placed skills ("cash" → Cashier, Cash handling…).
export default function SkillPicker({ value, onChange, label = 'Skills', placeholder = 'Type a skill, e.g. cashier', single = false, allowCustom = true }: Props) {
  const id = useId()
  const [query, setQuery] = useState('')
  const typed = query.trim()
  const suggestions = typed
    ? searchSkills(typed, value)
    : STARTERS.filter((name) => !value.includes(name)).map((name) => findSkill(name)!).filter(Boolean)
  const exact = findSkill(typed)
  const canAddCustom = allowCustom && typed.length > 1 && !exact && !value.some((v) => v.toLowerCase() === typed.toLowerCase())
  const groups = matchGroups(value)

  function add(name: string) {
    onChange(single ? [name] : [...value, name])
    setQuery('')
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    // Enter picks the best match instead of submitting the form.
    e.preventDefault()
    if (exact && !value.includes(exact.name)) add(exact.name)
    else if (suggestions[0] && typed) add(suggestions[0].name)
    else if (canAddCustom) add(typed)
  }

  return (
    <div className="skill-picker">
      <label htmlFor={id}>{label}</label>

      {value.length > 0 && (
        <ul className="skill-picker-chosen" aria-label={single ? 'Chosen skill' : 'Your skills'}>
          {value.map((name) => (
            <li key={name} className={`skill-picker-chip${isCustomSkill(name) ? ' custom' : ''}`}>
              <span>{skillLabel(name)}</span>
              {isCustomSkill(name) && <small>custom</small>}
              <button type="button" className="skill-picker-remove" aria-label={`Remove ${name}`} onClick={() => onChange(value.filter((v) => v !== name))}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        id={id}
        type="text"
        value={query}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onKeyDown}
      />

      <div className="skill-picker-suggestions" role="group" aria-label={typed ? `Skills like “${typed}”` : 'Common skills'}>
        {!typed && <span className="skill-picker-hint">Common:</span>}
        {suggestions.map((skill) => (
          <button key={skill.name} type="button" className="skill-picker-option" onClick={() => add(skill.name)} title={skill.sector}>
            + {skillLabel(skill.name)}
          </button>
        ))}
        {canAddCustom && (
          <button type="button" className="skill-picker-option custom" onClick={() => add(typed)}>
            + Add “{typed}”
          </button>
        )}
        {typed && suggestions.length === 0 && !canAddCustom && <span className="skill-picker-hint">No similar skills found.</span>}
      </div>

      {!single && groups.length > 0 && (
        <p className="skill-picker-hint">Counts for job matching as: {groups.join(' · ')}</p>
      )}
    </div>
  )
}
