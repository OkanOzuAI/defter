import { Route, Routes } from 'react-router-dom'
import { emailEnabled, isConfigured } from './api/supabase'
import { PublicOnly, RequireAuth } from './auth/guards'
import { Layout } from './components/Layout'
import { FullScreen, Message } from './components/ui'
import { useT } from './i18n'
import { ActiveWorkoutPage } from './pages/ActiveWorkoutPage'
import { ExerciseHistoryPage } from './pages/ExerciseHistoryPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { NutritionPage } from './pages/NutritionPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { ProfilePage } from './pages/ProfilePage'
import { RegisterPage } from './pages/RegisterPage'
import { SectionPage } from './pages/SectionPage'
import { SessionPage } from './pages/SessionPage'
import { SupplementsPage } from './pages/SupplementsPage'
import { TemplateEditPage } from './pages/TemplateEditPage'
import { TemplatesPage } from './pages/TemplatesPage'
import { WorkoutPage } from './pages/WorkoutPage'

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
          <Route path="workout" element={<WorkoutPage />} />
          <Route path="workout/active" element={<ActiveWorkoutPage />} />
          <Route path="workout/session/:id" element={<SessionPage />} />
          <Route path="workout/exercise/:id" element={<ExerciseHistoryPage />} />
          <Route path="workout/templates" element={<TemplatesPage />} />
          <Route path="workout/templates/:id" element={<TemplateEditPage />} />
          <Route path="nutrition" element={<NutritionPage />} />
          <Route path="cardio" element={<SectionPage title="nav.cardio" empty="cardio.empty" />} />
          <Route
            path="progress"
            element={<SectionPage title="nav.progress" empty="progress.empty" />}
          />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="profile/supplements" element={<SupplementsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
