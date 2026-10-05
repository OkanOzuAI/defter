import { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import { emailEnabled, isConfigured } from './api/supabase'
import { PublicOnly, RequireAuth } from './auth/guards'
import { Layout } from './components/Layout'
import { UpdateToast } from './components/UpdateToast'
import { FullScreen, Message } from './components/ui'
import { useT } from './i18n'
import { ActiveWorkoutPage } from './pages/ActiveWorkoutPage'
import { DietPhasesPage } from './pages/DietPhasesPage'
import { ExerciseLibraryPage } from './pages/ExerciseLibraryPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { NutritionPage } from './pages/NutritionPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { ProfilePage } from './pages/ProfilePage'
import { RegisterPage } from './pages/RegisterPage'
import { SessionPage } from './pages/SessionPage'
import { SupplementsPage } from './pages/SupplementsPage'
import { TemplateEditPage } from './pages/TemplateEditPage'
import { TemplatesPage } from './pages/TemplatesPage'
import { TodayPage } from './pages/TodayPage'
import { WorkoutPage } from './pages/WorkoutPage'

// Pages with charts load on demand, so the chart library stays out of the first paint.
const CardioPage = lazy(() => import('./pages/CardioPage').then((m) => ({ default: m.CardioPage })))
const ExerciseHistoryPage = lazy(() =>
  import('./pages/ExerciseHistoryPage').then((m) => ({ default: m.ExerciseHistoryPage })),
)
const ProgressPage = lazy(() =>
  import('./pages/ProgressPage').then((m) => ({ default: m.ProgressPage })),
)

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
    <>
      <UpdateToast />
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
            <Route index element={<TodayPage />} />
            <Route path="workout" element={<WorkoutPage />} />
            <Route path="workout/active" element={<ActiveWorkoutPage />} />
            <Route path="workout/session/:id" element={<SessionPage />} />
            <Route path="workout/exercise/:id" element={<ExerciseHistoryPage />} />
            <Route path="workout/templates" element={<TemplatesPage />} />
            <Route path="workout/templates/:id" element={<TemplateEditPage />} />
            <Route path="nutrition" element={<NutritionPage />} />
            <Route path="cardio" element={<CardioPage />} />
            <Route path="progress" element={<ProgressPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="profile/supplements" element={<SupplementsPage />} />
            <Route path="profile/phases" element={<DietPhasesPage />} />
            <Route path="profile/exercises" element={<ExerciseLibraryPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  )
}
