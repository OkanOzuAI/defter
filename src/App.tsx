import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { NotFoundPage } from './pages/NotFoundPage'
import { SectionPage } from './pages/SectionPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<SectionPage title="nav.today" empty="today.empty" />} />
        <Route path="workout" element={<SectionPage title="nav.workout" empty="workout.empty" />} />
        <Route
          path="nutrition"
          element={<SectionPage title="nav.nutrition" empty="nutrition.empty" />}
        />
        <Route path="cardio" element={<SectionPage title="nav.cardio" empty="cardio.empty" />} />
        <Route
          path="progress"
          element={<SectionPage title="nav.progress" empty="progress.empty" />}
        />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
