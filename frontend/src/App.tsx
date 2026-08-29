import { Navigate, Route, Routes } from 'react-router-dom'
import { PatientFlowLayout } from './components/patient/PatientFlowLayout'
import { PatientShellLayout } from './components/patient/PatientShellLayout'
import { RequirePatientAuth } from './components/patient/RequirePatientAuth'
import { RequireStaffAuth } from './components/staff/RequireStaffAuth'
import { StaffLayout } from './components/staff/StaffLayout'
import { AuthPage } from './pages/patient/AuthPage'
import { ActiveVisitPage } from './pages/patient/ActiveVisitPage'
import { DoctorPage } from './pages/patient/DoctorPage'
import { HomePage } from './pages/patient/HomePage'
import { ContactPage, DeleteProfilePage, EditProfilePage, PrivacyPage, TermsPage } from './pages/patient/ProfileSubPages'
import { ProfilePage } from './pages/patient/ProfilePage'
import { SessionDetailPage } from './pages/patient/SessionDetailPage'
import { SplashPage } from './pages/patient/SplashPage'
import { TokenConfirmedPage } from './pages/patient/TokenConfirmedPage'
import { TokenPaymentPage } from './pages/patient/TokenPaymentPage'
import { VisitsPage } from './pages/patient/VisitsPage'
import { StaffHomePage } from './pages/staff/StaffHomePage'
import { StaffLoginPage } from './pages/staff/StaffLoginPage'
import { StaffQueueConsolePage } from './pages/staff/StaffQueueConsolePage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<SplashPage />} />
      <Route path="/auth" element={<AuthPage />} />

      <Route element={<RequirePatientAuth />}>
        {/* Active Visit lives under the shell (bottom nav), not the flow
            layout — a patient sitting on this screen tracking their
            queue needs to jump straight to Visits/Profile/Home, not
            unwind a "back" chain through payment/session-detail to get
            there. Token Confirmed stays a flow screen (see below): it's
            a one-time forced landing right after payment, not somewhere
            a patient lingers or returns to. */}
        <Route element={<PatientShellLayout />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/visits" element={<VisitsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/queue/:entryId" element={<ActiveVisitPage />} />
        </Route>

        <Route element={<PatientFlowLayout />}>
          <Route path="/doctors/:doctorId" element={<DoctorPage />} />
          <Route path="/sessions/:sessionId" element={<SessionDetailPage />} />
          <Route path="/sessions/:sessionId/token" element={<TokenPaymentPage />} />
          <Route path="/queue/:entryId/confirmed" element={<TokenConfirmedPage />} />
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
          <Route path="/staff/sessions/:sessionId" element={<StaffQueueConsolePage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
