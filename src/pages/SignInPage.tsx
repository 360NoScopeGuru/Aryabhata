import { SignIn } from '@clerk/clerk-react'
import { dark } from '@clerk/themes'

const appearance = {
  baseTheme: dark,
  variables: {
    colorBackground: '#0d0f12',
    colorPrimary: '#7ad7ff',
    colorText: '#e2eaf5',
    colorTextSecondary: '#8a9bb8',
    colorInputBackground: '#161b25',
    colorInputText: '#e2eaf5',
    colorNeutral: '#8a9bb8',
    borderRadius: '4px',
    fontFamily: '"Inter", system-ui, sans-serif',
    fontSize: '13px',
  },
  elements: {
    card: { boxShadow: 'none', border: '.5px solid rgba(122,215,255,.15)', background: '#0d0f12' },
    socialButtonsBlockButton: { border: '.5px solid rgba(122,215,255,.15)', background: '#161b25' },
    dividerLine: { background: 'rgba(122,215,255,.1)' },
    formFieldInput: { border: '.5px solid rgba(122,215,255,.2)' },
    footerActionLink: { color: '#7ad7ff' },
  },
}

export default function SignInPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '32px',
    }}>
      {/* Brand */}
      <div style={{ textAlign: 'center' }}>
        <svg width="40" height="40" viewBox="0 0 28 28" fill="none" style={{ margin: '0 auto 16px', display: 'block' }}>
          <circle cx="14" cy="14" r="11" stroke="var(--accent)" strokeWidth="0.75" opacity="0.45"/>
          <circle cx="14" cy="14" r="6.5" stroke="var(--accent)" strokeWidth="0.75"/>
          <circle cx="14" cy="14" r="2.5" fill="var(--accent)"/>
          <line x1="0" y1="14" x2="5.5" y2="14" stroke="var(--accent)" strokeWidth="0.75"/>
          <line x1="22.5" y1="14" x2="28" y2="14" stroke="var(--accent)" strokeWidth="0.75"/>
          <line x1="14" y1="0" x2="14" y2="5.5" stroke="var(--accent)" strokeWidth="0.75"/>
          <line x1="14" y1="22.5" x2="14" y2="28" stroke="var(--accent)" strokeWidth="0.75"/>
        </svg>
        <div style={{ fontFamily: 'var(--mono)', fontSize: '18px', letterSpacing: '.18em', color: 'var(--ink)', textTransform: 'uppercase', marginBottom: '4px' }}>
          Aryabhata
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '.28em', color: 'var(--ink-dim)', textTransform: 'uppercase' }}>
          LLM · Studio
        </div>
      </div>

      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" appearance={appearance} />
    </div>
  )
}
