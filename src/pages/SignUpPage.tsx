import { SignUp } from '@clerk/clerk-react'

import AuthLayout from '@/components/AuthLayout'
import { buildAuthAppearance } from '@/lib/authAppearance'
import { useAppStore } from '@/store/appStore'

export default function SignUpPage() {
  const theme = useAppStore((s) => s.theme)
  const appearance = buildAuthAppearance(theme)

  return (
    <AuthLayout mode="signup">
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" appearance={appearance} />
    </AuthLayout>
  )
}
