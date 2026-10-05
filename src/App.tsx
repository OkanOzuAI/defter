import { Route, Routes } from 'react-router-dom'
import { emailEnabled, isConfigured } from './api/supabase'
import { PublicOnly, RequireAuth } from './auth/guards'
import { Layout } from './components/Layout'
import { FullScreen, Message } from './components/ui'
import { useT } from './i18n'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { ProfilePage } from './pages/ProfilePage'
import { RegisterPage } from './pages/RegisterPage'
import { SectionPage } from './pages/SectionPage'

export default function App() {
  const t = useT()

  if (!isConfigured) {
    return (
      <FullScreen>
        <Message title={t('app.notConfigured')} body={t('app.notConfiguredHint')} />
      </FullScreen>
    )
  }

  return (
    <Routes>
      <Route path="privacy" element={<PrivacyPage />} />

      <Route element={<PublicOnly />}>
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        {emailEnabled && <Route path="forgot" element={<ForgotPasswordPage />} />}
      </Route>

      <Route element={<RequireAuth onboarding />}>
        <Route path="onboarding" element={<OnboardingPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route index element={<SectionPage title="nav.today" empty="today.empty" />} />
          <Route
            path="workout"
            element={<SectionPage title="nav.workout" empty="workout.empty" />}
          />
          <Route
            path="nutrition"
            element={<SectionPage title="nav.nutrition" empty="nutrition.empty" />}
          />
          <Route path="cardio" element={<SectionPage title="nav.cardio" empty="cardio.empty" />} />
          <Route
            path="progress"
            element={<SectionPage title="nav.progress" empty="progress.empty" />}
          />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
