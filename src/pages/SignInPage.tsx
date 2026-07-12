import { SignIn } from '@clerk/clerk-react'

import AuthLayout from '@/components/AuthLayout'
import { buildAuthAppearance } from '@/lib/authAppearance'
import { useAppStore } from '@/store/appStore'

export default function SignInPage() {
  const theme = useAppStore((s) => s.theme)
  const appearance = buildAuthAppearance(theme)

  return (
    <AuthLayout mode="signin">
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" appearance={appearance} />
    </AuthLayout>
  )
}
