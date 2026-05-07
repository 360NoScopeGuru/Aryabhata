import { SignUp } from '@clerk/clerk-react'
import { dark } from '@clerk/themes'
import AuthLayout from '@/components/AuthLayout'

// Minimal — all visual styling lives in index.css under `.auth-card-body .cl-*`.
const appearance = {
  baseTheme: dark,
  variables: {
    fontFamily: '"Inter", system-ui, sans-serif',
    fontSize: '13px',
  },
}

export default function SignUpPage() {
  return (
    <AuthLayout mode="signup">
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" appearance={appearance} />
    </AuthLayout>
  )
}
