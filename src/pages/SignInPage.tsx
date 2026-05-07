import { SignIn } from '@clerk/clerk-react'
import { dark } from '@clerk/themes'
import AuthLayout from '@/components/AuthLayout'

// Minimal — all visual styling lives in index.css under `.auth-card-body .cl-*`.
// We only set the dark base theme + Inter for the input typeface.
const appearance = {
  baseTheme: dark,
  variables: {
    fontFamily: '"Inter", system-ui, sans-serif',
    fontSize: '13px',
  },
}

export default function SignInPage() {
  return (
    <AuthLayout mode="signin">
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" appearance={appearance} />
    </AuthLayout>
  )
}
