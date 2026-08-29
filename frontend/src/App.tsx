import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/patient/AppShell'
import { RequirePatientAuth } from './components/patient/RequirePatientAuth'
import { RequireStaffAuth } from './components/staff/RequireStaffAuth'
import { StaffLayout } from './components/staff/StaffLayout'
import { getPatientIdentity } from './lib/patientIdentity'
import { ActiveVisitPage } from './pages/patient/ActiveVisitPage'
import { AuthPage } from './pages/patient/AuthPage'
import { ClinicDetailPage } from './pages/patient/ClinicDetailPage'
import { ClinicsListPage } from './pages/patient/ClinicsListPage'
import { DoctorPage } from './pages/patient/DoctorPage'
import { HomePage } from './pages/patient/HomePage'
import { LandingPage } from './pages/marketing/LandingPage'
import { ContactPage, DeleteProfilePage, EditProfilePage, PrivacyPage, TermsPage } from './pages/patient/ProfileSubPages'
import { ProfilePage } from './pages/patient/ProfilePage'
import { SessionDetailPage } from './pages/patient/SessionDetailPage'
import { TokenConfirmedPage } from './pages/patient/TokenConfirmedPage'
import { TokenPaymentPage } from './pages/patient/TokenPaymentPage'
import { VisitsPage } from './pages/patient/VisitsPage'
import { StaffHomePage } from './pages/staff/StaffHomePage'
import { StaffLoginPage } from './pages/staff/StaffLoginPage'
import { StaffQueueConsolePage } from './pages/staff/StaffQueueConsolePage'
import { StaffRevenuePage } from './pages/staff/StaffRevenuePage'

/** No splash, no animated logo gate for a returning patient — a
 * website loads straight to where you're going. A first-time visitor
 * (no local identity yet) sees the public marketing page instead of
 * being dropped straight into an auth form with no context for what
 * they're signing up for. */
function RootRedirect() {
  return getPatientIdentity() ? <Navigate to="/home" replace /> : <LandingPage />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/auth" element={<AuthPage />} />

      <Route element={<RequirePatientAuth />}>
        <Route element={<AppShell />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/clinics" element={<ClinicsListPage />} />
          <Route path="/clinics/:clinicId" element={<ClinicDetailPage />} />
          <Route path="/doctors/:doctorId" element={<DoctorPage />} />
          <Route path="/sessions/:sessionId" element={<SessionDetailPage />} />
          <Route path="/sessions/:sessionId/token" element={<TokenPaymentPage />} />
          <Route path="/queue/:entryId/confirmed" element={<TokenConfirmedPage />} />
          <Route path="/queue/:entryId" element={<ActiveVisitPage />} />
          <Route path="/visits" element={<VisitsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/edit" element={<EditProfilePage />} />
          <Route path="/profile/privacy" element={<PrivacyPage />} />
          <Route path="/profile/terms" element={<TermsPage />} />
          <Route path="/profile/contact" element={<ContactPage />} />
          <Route path="/profile/delete" element={<DeleteProfilePage />} />
        </Route>
      </Route>

      <Route path="/staff/login" element={<StaffLoginPage />} />
      <Route element={<RequireStaffAuth />}>
        <Route element={<StaffLayout />}>
          <Route path="/staff" element={<StaffHomePage />} />
          <Route path="/staff/revenue" element={<StaffRevenuePage />} />
          <Route path="/staff/sessions/:sessionId" element={<StaffQueueConsolePage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
