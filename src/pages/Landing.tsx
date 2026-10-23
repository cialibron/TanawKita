import { useState, type FormEvent } from 'react'
import { BrandEmblem } from '../components/Logo'
import GlowEdge from '../components/GlowEdge'
import {
  EnvelopeIcon,
  KeyIcon,
  MapPinIcon,
  PersonIcon,
  PesoShieldIcon,
  ShieldCheckIcon,
} from '../components/LandingIcons'
import EyeIcon from '../components/EyeIcon'
import LandingMap from '../components/LandingMap'
import { PLACES, PlacesCaption, PlacesSlides, useSlide } from '../components/PlacesSlideshow'
import background from '../assets/brand/bg-4.svg'
import {
  emailError,
  MIN_PASSWORD,
  nameError,
  passwordError,
  saveSession,
  signIn,
  signInWith,
  type SignedInUser,
} from '../auth'
import type { Role } from '../types'
import '../landing.css'

type Mode = 'signin' | 'signup' | 'forgot'
type Provider = 'google' | 'facebook'

interface Props {
  // Called once signed in. `signup` carries the role and name picked when creating an account.
  onEnter: (user: SignedInUser, signup?: { role: Role; name: string }) => void
  // Skip sign-in for testing.
  onExplore: () => void
}

const FEATURES = [
  {
    Icon: MapPinIcon,
    tone: 'cyan',
    title: 'Jobs on a map',
    text: 'See paid work within walking or jeepney distance, with the pay shown up front.',
  },
  {
    Icon: ShieldCheckIcon,
    tone: 'violet',
    title: 'Verified employers',
    text: 'Every employer shows a DTI, SEC or CDA record and a current Mayor’s permit.',
  },
  {
    Icon: PesoShieldIcon,
    tone: 'gold',
    title: 'Fair pay check',
    text: 'Posts below the daily minimum are blocked before anyone sees them.',
  },
]

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#1877F2" />
      <path
        fill="#fff"
        d="M15.1 12.6l.4-2.8h-2.7V8c0-.8.4-1.5 1.6-1.5h1.2V4.1s-1.1-.2-2.2-.2c-2.2 0-3.7 1.4-3.7 3.8v2.1H7.3v2.8h2.4V20h3.1v-7.4h2.3z"
      />
    </svg>
  )
}

export default function Landing({ onEnter, onExplore }: Props) {
  const [mode, setMode] = useState<Mode>('signin')
  const slide = useSlide(PLACES.length)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<Role>('jobseeker')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [authError, setAuthError] = useState('')
  const [loading, setLoading] = useState<'form' | Provider | null>(null)
  const [resetSentTo, setResetSentTo] = useState('')

  const pwMode = mode === 'signup' ? 'signup' : 'signin'
  const errors = {
    email: emailError(email),
    password: mode === 'forgot' ? null : passwordError(password, pwMode),
    name: mode === 'signup' ? nameError(name) : null,
  }
  // Show a field's error once the user has left it or tried to submit.
  const shown = (field: keyof typeof errors) => (touched[field] ? errors[field] : null)
  const busy = loading !== null

  function switchMode(next: Mode) {
    setMode(next)
    setTouched({})
    setAuthError('')
    setResetSentTo('')
  }

  function touch(field: string) {
    setTouched((t) => ({ ...t, [field]: true }))
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setTouched({ email: true, password: true, name: true })
    setAuthError('')
    if (errors.email || errors.password || errors.name) return

    if (mode === 'forgot') {
      setLoading('form')
      await new Promise((r) => setTimeout(r, 900))
      setLoading(null)
      setResetSentTo(email.trim())
      return
    }

    setLoading('form')
    try {
      const user = await signIn(email, password)
      saveSession(user, remember)
      if (mode === 'signup') onEnter({ ...user, name: name.trim() }, { role, name: name.trim() })
      else onEnter(user)
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
      setLoading(null)
    }
  }

  async function sso(provider: Provider) {
    setAuthError('')
    setLoading(provider)
    const user = await signInWith(provider)
    saveSession(user, remember)
    onEnter(user)
  }

  const title = mode === 'signup' ? 'Create your account' : mode === 'forgot' ? 'Reset your password' : 'Welcome back'
  const cta = mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Sign in'
  const ctaBusy = mode === 'signup' ? 'Creating account…' : mode === 'forgot' ? 'Sending…' : 'Signing in…'

  return (
    <div className="landing" style={{ backgroundImage: `url("${background}")` }}>
      <LandingMap />
      <div className="landing-glass" aria-hidden="true">
        <PlacesSlides index={slide} />
      </div>
      <GlowEdge />
      <div className="landing-page">
        <header className="landing-nav">
          <div className="brand-lockup">
            <BrandEmblem height={54} />
            <div className="brand-text">
              <span className="brand-word">TANAWKITA</span>
              <span className="brand-sub">Davao City • CBMS Innovation Challenge</span>
            </div>
          </div>
          {mode !== 'signup' && (
            <button type="button" className="landing-link" onClick={() => switchMode('signup')}>
              Create an account
            </button>
          )}
        </header>

        <main className="landing-main">
          <section className="landing-pitch">
            <h1>
              See the work <span className="hl-cyan">around you.</span>
              <br />
              Get hired close to <span className="hl-blue">home.</span>
            </h1>
            <p className="landing-lead">
              TanawKita matches jobseekers, TVET graduates and out-of-school youth with verified employers within
              minutes of where they live: fair pay checked, no guesswork.
            </p>
            <ul className="landing-features">
              {FEATURES.map((f) => (
                <li key={f.title} className={`feature feature-${f.tone}`}>
                  <span className="feature-icon">
                    <f.Icon />
                  </span>
                  <span className="feature-text">
                    <strong>{f.title}</strong>
                    <span>{f.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="landing-card" aria-labelledby="auth-title">
            <h2 id="auth-title">{title}</h2>

            {mode !== 'forgot' && (
              <>
                <div className="sso">
                  <button type="button" className="sso-button" disabled={busy} onClick={() => sso('google')}>
                    {loading === 'google' ? <span className="spinner" /> : <GoogleIcon />}
                    {loading === 'google' ? 'Signing in (demo)…' : 'Continue with Google (demo)'}
                  </button>
                  <button type="button" className="sso-button" disabled={busy} onClick={() => sso('facebook')}>
                    {loading === 'facebook' ? <span className="spinner" /> : <FacebookIcon />}
                    {loading === 'facebook' ? 'Signing in (demo)…' : 'Continue with Facebook (demo)'}
                  </button>
                </div>
                <div className="divider">
                  <span>or use your email</span>
                </div>
              </>
            )}

            {mode === 'forgot' && resetSentTo ? (
              <div className="notice" role="status">
                If an account exists for <strong>{resetSentTo}</strong>, a reset link is on its way. Prototype: no email
                is actually sent.
              </div>
            ) : (
              <form noValidate onSubmit={submit}>
                {authError && (
                  <div className="form-error" role="alert">
                    {authError}
                  </div>
                )}

                {mode === 'signup' && (
                  <>
                    <div className={`field${shown('name') ? ' invalid' : ''}`}>
                      <label htmlFor="auth-name">Full name or business name</label>
                      <div className="input-wrap">
                        <span className="input-icon">
                          <PersonIcon />
                        </span>
                        <input
                          id="auth-name"
                          value={name}
                          placeholder="Ana Reyes"
                          autoComplete="name"
                          disabled={busy}
                          aria-invalid={Boolean(shown('name'))}
                          aria-describedby="auth-name-error"
                          onChange={(e) => setName(e.target.value)}
                          onBlur={() => touch('name')}
                        />
                      </div>
                      {shown('name') && (
                        <p id="auth-name-error" className="field-error">
                          {shown('name')}
                        </p>
                      )}
                    </div>
                    <fieldset className="role-pick" disabled={busy}>
                      <legend>I want to</legend>
                      <label className={role === 'jobseeker' ? 'selected' : ''}>
                        <input
                          type="radio"
                          name="role"
                          checked={role === 'jobseeker'}
                          onChange={() => setRole('jobseeker')}
                        />
                        Find work
                      </label>
                      <label className={role === 'employer' ? 'selected' : ''}>
                        <input
                          type="radio"
                          name="role"
                          checked={role === 'employer'}
                          onChange={() => setRole('employer')}
                        />
                        Hire workers
                      </label>
                    </fieldset>
                  </>
                )}

                <div className={`field${shown('email') || authError ? ' invalid' : ''}`}>
                  <label htmlFor="auth-email">Email address</label>
                  <div className="input-wrap">
                    <span className="input-icon">
                      <EnvelopeIcon />
                    </span>
                    <input
                      id="auth-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="name@example.com"
                      value={email}
                      disabled={busy}
                      aria-invalid={Boolean(shown('email') || authError)}
                      aria-describedby="auth-email-error"
                      onChange={(e) => {
                        setEmail(e.target.value)
                        setAuthError('')
                      }}
                      onBlur={() => touch('email')}
                    />
                  </div>
                  {shown('email') && (
                    <p id="auth-email-error" className="field-error">
                      {shown('email')}
                    </p>
                  )}
                </div>

                {mode !== 'forgot' && (
                  <div className={`field${shown('password') || authError ? ' invalid' : ''}`}>
                    <div className="field-label-row">
                      <label htmlFor="auth-password">Password</label>
                      {mode === 'signin' && (
                        <button type="button" className="landing-link small" onClick={() => switchMode('forgot')}>
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="password-wrap input-wrap">
                      <span className="input-icon">
                        <KeyIcon />
                      </span>
                      <input
                        id="auth-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                        placeholder={mode === 'signup' ? `At least ${MIN_PASSWORD} characters` : 'Your password'}
                        value={password}
                        disabled={busy}
                        aria-invalid={Boolean(shown('password') || authError)}
                        aria-describedby="auth-password-error"
                        onChange={(e) => {
                          setPassword(e.target.value)
                          setAuthError('')
                        }}
                        onBlur={() => touch('password')}
                      />
                      <button
                        type="button"
                        className="toggle-password"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showPassword}
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        <EyeIcon closed={showPassword} />
                      </button>
                    </div>
                    {shown('password') && (
                      <p id="auth-password-error" className="field-error">
                        {shown('password')}
                      </p>
                    )}
                  </div>
                )}

                {mode !== 'forgot' && (
                  <label className="remember">
                    <input
                      type="checkbox"
                      checked={remember}
                      disabled={busy}
                      onChange={(e) => setRemember(e.target.checked)}
                    />
                    Remember me on this device
                  </label>
                )}

                <button type="submit" className="cta" disabled={busy} aria-busy={loading === 'form'}>
                  {loading === 'form' && <span className="spinner" />}
                  {loading === 'form' ? ctaBusy : cta}
                </button>
              </form>
            )}

            <p className="card-footer">
              {mode === 'signin' && (
                <>
                  New to TanawKita?{' '}
                  <button type="button" className="landing-link" onClick={() => switchMode('signup')}>
                    Create an account
                  </button>
                </>
              )}
              {mode === 'signup' && (
                <>
                  Already have an account?{' '}
                  <button type="button" className="landing-link" onClick={() => switchMode('signin')}>
                    Sign in
                  </button>
                </>
              )}
              {mode === 'forgot' && (
                <button type="button" className="landing-link" onClick={() => switchMode('signin')}>
                  Back to sign in
                </button>
              )}
            </p>
            <p className="card-hint">
              Prototype: any email with a password of {MIN_PASSWORD}+ characters signs in.{' '}
              <button type="button" className="landing-link small" onClick={onExplore}>
                Explore without an account
              </button>
            </p>
          </section>
        </main>
        <PlacesCaption index={slide} />
        <p className="landing-map-credit">
          Map:{' '}
          <a href="https://openfreemap.org" target="_blank" rel="noreferrer">
            OpenFreeMap
          </a>{' '}
          ©{' '}
          <a href="https://www.openmaptiles.org/" target="_blank" rel="noreferrer">
            OpenMapTiles
          </a>{' '}
          ©{' '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
            OpenStreetMap
          </a>{' '}
          contributors
        </p>
      </div>
    </div>
  )
}
