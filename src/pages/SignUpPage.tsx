import { SignUp } from '@clerk/clerk-react'
import { dark } from '@clerk/themes'
import AuthLayout from '@/components/AuthLayout'

const appearance = {
  baseTheme: dark,
  variables: {
    colorBackground: 'transparent',
    colorPrimary: '#7ad7ff',
    colorText: '#e2eaf5',
    colorTextSecondary: '#8a9bb8',
    colorInputBackground: 'rgba(20,26,38,.55)',
    colorInputText: '#e2eaf5',
    colorNeutral: '#8a9bb8',
    borderRadius: '6px',
    fontFamily: '"Inter", system-ui, sans-serif',
    fontSize: '13px',
  },
  elements: {
    rootBox: { width: '100%' },
    card: {
      boxShadow: 'none',
      border: 'none',
      background: 'transparent',
      width: '100%',
      padding: 0,
    },
    headerTitle: { display: 'none' },
    headerSubtitle: { display: 'none' },
    socialButtonsBlockButton: {
      border: '.5px solid rgba(122,215,255,.18)',
      background: 'rgba(20,26,38,.5)',
      backdropFilter: 'blur(6px)',
      transition: 'all .15s',
      '&:hover': {
        borderColor: 'rgba(122,215,255,.45)',
        background: 'rgba(122,215,255,.06)',
      },
    },
    dividerLine: { background: 'rgba(122,215,255,.12)' },
    dividerText: { color: 'rgba(138,155,184,.6)', fontSize: '10px', letterSpacing: '.18em', textTransform: 'uppercase' },
    formFieldInput: {
      border: '.5px solid rgba(122,215,255,.22)',
      backdropFilter: 'blur(4px)',
      transition: 'all .15s',
      '&:focus': { borderColor: '#7ad7ff', boxShadow: '0 0 0 3px rgba(122,215,255,.12)' },
    },
    formFieldLabel: { fontSize: '10px', letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(138,155,184,.85)' },
    formButtonPrimary: {
      background: '#7ad7ff',
      color: '#0d0f12',
      fontWeight: 600,
      letterSpacing: '.06em',
      textTransform: 'uppercase',
      fontSize: '11px',
      transition: 'all .15s',
      '&:hover': { background: '#9be3ff', boxShadow: '0 0 18px rgba(122,215,255,.45)' },
    },
    footerActionLink: { color: '#7ad7ff' },
    footer: { background: 'transparent' },
  },
}

export default function SignUpPage() {
  return (
    <AuthLayout mode="signup">
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" appearance={appearance} />
    </AuthLayout>
  )
}
