import { SignIn } from '@clerk/clerk-react'
import { useAppStore } from '@/store/appStore'
import { buildAuthAppearance } from '@/lib/authAppearance'
import AuthLayout from '@/components/AuthLayout'

export default function SignInPage() {
  const theme = useAppStore(s => s.theme)
  const appearance = buildAuthAppearance(theme)

  return (
    <AuthLayout mode="signin">
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" appearance={appearance} />
    </AuthLayout>
  )
}
