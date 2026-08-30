import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from './components/admin/AdminLayout'
import { AppShell } from './components/patient/AppShell'
import { RequirePatientAuth } from './components/patient/RequirePatientAuth'
import { DoctorLayout } from './components/staff/DoctorLayout'
import { RequireRole } from './components/staff/RequireRole'
import { StaffLayout } from './components/staff/StaffLayout'
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
import { SuperAdminPage } from './pages/admin/SuperAdminPage'
import { DoctorDashboardPage } from './pages/doctor/DoctorDashboardPage'
import { StaffHomePage } from './pages/staff/StaffHomePage'
import { StaffLoginPage } from './pages/staff/StaffLoginPage'
import { StaffQueueConsolePage } from './pages/staff/StaffQueueConsolePage'
import { StaffRevenuePage } from './pages/staff/StaffRevenuePage'

export default function App() {
  return (
    <Routes>
      {/* "/" is always the public marketing site — a stable, always-
          reachable URL, the way a real company's homepage works even
          for a signed-in visitor (stripe.com, notion.so, etc. all still
          show the marketing page at "/" and put a "go to app" link in
          the corner, rather than yanking a returning user straight past
          it). This used to auto-redirect anyone with a saved identity
          straight to /home, which meant there was no way to ever see or
          link back to the landing page again once you'd logged in once
          — LandingPage itself now reads identity and adapts its own
          CTAs instead of the route disappearing. */}
      <Route path="/" element={<LandingPage />} />
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

      {/* clinic_admin + clinic_staff — the operational console. Revenue
          nav is hidden for clinic_staff by StaffLayout itself; the
          backend also 403s that call for them regardless (defense in
          depth, not duplicated trust). */}
      <Route element={<RequireRole allow={['clinic_admin', 'clinic_staff']} />}>
        <Route element={<StaffLayout />}>
          <Route path="/staff" element={<StaffHomePage />} />
          <Route path="/staff/revenue" element={<StaffRevenuePage />} />
          <Route path="/staff/sessions/:sessionId" element={<StaffQueueConsolePage />} />
        </Route>
      </Route>

      {/* doctor — a personal dashboard, plus the same queue console
          reused for whichever of their own sessions they open (ownership
          is enforced server-side either way — see assertCanActOnSession). */}
      <Route element={<RequireRole allow={['doctor']} />}>
        <Route element={<DoctorLayout />}>
          <Route path="/doctor" element={<DoctorDashboardPage />} />
          <Route path="/doctor/sessions/:sessionId" element={<StaffQueueConsolePage />} />
        </Route>
      </Route>

      {/* super_admin — tenant onboarding + the same revenue report
          component, which the backend returns unscoped for this role. */}
      <Route element={<RequireRole allow={['super_admin']} />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<SuperAdminPage />} />
          <Route path="/admin/revenue" element={<StaffRevenuePage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
