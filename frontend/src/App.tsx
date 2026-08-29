import { Navigate, Route, Routes } from 'react-router-dom'
import { PatientLayout } from './components/patient/PatientLayout'
import { RequireStaffAuth } from './components/staff/RequireStaffAuth'
import { StaffLayout } from './components/staff/StaffLayout'
import { DoctorPage } from './pages/patient/DoctorPage'
import { HomePage } from './pages/patient/HomePage'
import { MyTokenPage } from './pages/patient/MyTokenPage'
import { SessionQueuePage } from './pages/patient/SessionQueuePage'
import { StaffHomePage } from './pages/staff/StaffHomePage'
import { StaffLoginPage } from './pages/staff/StaffLoginPage'
import { StaffQueueConsolePage } from './pages/staff/StaffQueueConsolePage'

export default function App() {
  return (
    <Routes>
      <Route element={<PatientLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/doctors/:doctorId" element={<DoctorPage />} />
        <Route path="/sessions/:sessionId" element={<SessionQueuePage />} />
        <Route path="/queue/:entryId" element={<MyTokenPage />} />
      </Route>

      <Route path="/staff/login" element={<StaffLoginPage />} />

      {/* Everything else under /staff requires the access code — see
          RequireStaffAuth / lib/staffAuth.ts for exactly what this is
          (and isn't) protecting against. */}
      <Route element={<RequireStaffAuth />}>
        <Route element={<StaffLayout />}>
          <Route path="/staff" element={<StaffHomePage />} />
          <Route path="/staff/sessions/:sessionId" element={<StaffQueueConsolePage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
