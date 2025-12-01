import { Routes, Route, useParams, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
import {
  Home,
  GraduateDashboard,
  GraduateProfile,
  CompanyDashboard,
  CompanyProfile,
  CompanyCandidates,
  CompanyJobs,
  CompanyOnboarding,
  AdminDashboard,
  ProtectedRoute,
  AssessmentGuard,
  CompanyRouteGuard,
  AccountType,
  Layout,
  ExploreCompany,
  ExploreGraduates,
  GraduateApplications,
  CompanyPreview,
  CandidatePreview,
  AuthPage,
  Messages,
  Notifications,
  GraduateOnboarding,
  SkillAssessment,
  ForgotPassword,
  ResetPassword,
  EmailVerification,
  EmailVerificationGuard,
  Interviews,
  InterviewRoom,
} from './index';
import GuestRoute from './components/GuestRoute';
import Companies from './pages/admin/Companies';
import Graduates from './pages/admin/Graduates';
import Jobs from './pages/admin/Jobs';
import ApplicationStatus from './pages/admin/AppStatus';

// Redirect component for old explore-preview route
const ExplorePreviewRedirect = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/explore?preview=${id}`} replace />;
};

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
       <AuthProvider>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/login"
            element={
              <GuestRoute>
                <AuthPage mode="login" />
              </GuestRoute>
            }
          />
          <Route
            path="/register"
            element={
              <GuestRoute>
                <AuthPage mode="register" />
              </GuestRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <GuestRoute>
                <ForgotPassword />
              </GuestRoute>
            }
          />
          <Route
            path="/reset-password"
            element={
              <GuestRoute>
                <ResetPassword />
              </GuestRoute>
            }
          />
          <Route path="/verify-email" element={<EmailVerification />} />
          <Route
            path="/graduate/*"
            element={
              <ProtectedRoute allowedRoles={['graduate']}>
                <EmailVerificationGuard>
                <AssessmentGuard>
                  <Layout>
                    <GraduateDashboard />
                  </Layout>
                </AssessmentGuard>
                </EmailVerificationGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/graduate/profile"
            element={
              <ProtectedRoute allowedRoles={['graduate']}>
                <EmailVerificationGuard>
                <AssessmentGuard>
                  <Layout>
                    <GraduateProfile />
                  </Layout>
                  </AssessmentGuard>
                </EmailVerificationGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/talent/profile"
            element={<Navigate to="/graduate/profile" replace />}
          />
          <Route path="/talent/*" element={<Navigate to="/graduate" replace />} />
          <Route 
            path="/company/*"
            element={
              <ProtectedRoute allowedRoles={['company']}>
                <EmailVerificationGuard>
                  <CompanyRouteGuard>
                    <CompanyDashboard />
                  </CompanyRouteGuard>
                </EmailVerificationGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/company/profile"
            element={
              <ProtectedRoute allowedRoles={['company']}>
                <EmailVerificationGuard>
                  <CompanyRouteGuard>
                    <Layout>
                      <CompanyProfile />
                    </Layout>
                  </CompanyRouteGuard>
                </EmailVerificationGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <EmailVerificationGuard>
                <AdminDashboard />
                </EmailVerificationGuard>
              </ProtectedRoute>
            }
          />
          <Route path="/role" element={<AccountType />} />
          <Route path="/onboarding" element={<GraduateOnboarding />} />

          <Route
            path="/assessment"
            element={
              <ProtectedRoute allowedRoles={['graduate']}>
                <EmailVerificationGuard>
                  <AssessmentGuard>
                    <SkillAssessment />
                  </AssessmentGuard>
                </EmailVerificationGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/company-preview/:id"
            element={<CompanyPreview mode="application" />}
          />
          <Route
            path="/contactCompany/:id"
            element={<CompanyPreview mode="contact" />}
          />
          <Route
            path="/explore"
            element={
              <ProtectedRoute allowedRoles={['graduate']}>
                <EmailVerificationGuard>
                <AssessmentGuard>
                  <Layout>
                    <ExploreCompany />
                  </Layout>
                  </AssessmentGuard>
                </EmailVerificationGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/company/explore"
            element={
              <ProtectedRoute allowedRoles={['company']}>
                <EmailVerificationGuard>
                  <Layout>
                    <ExploreGraduates />
                  </Layout>
                </EmailVerificationGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/applications"
            element={
              <ProtectedRoute allowedRoles={['graduate']}>
                <EmailVerificationGuard>
                <AssessmentGuard>
                  <Layout>
                    <GraduateApplications />
                  </Layout>
                </AssessmentGuard>
                </EmailVerificationGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages/:id"
            element={
              <Layout>
                <Messages />
              </Layout>
            }
          />
          <Route
            path="/interviews/:slug"
            element={
              <ProtectedRoute allowedRoles={['company', 'graduate']}>
                <EmailVerificationGuard>
                  <InterviewRoom />
                </EmailVerificationGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/company/onboarding"
            element={
              <ProtectedRoute allowedRoles={['company']}>
                <EmailVerificationGuard>
                  <CompanyRouteGuard>
                    <CompanyOnboarding />
                  </CompanyRouteGuard>
                </EmailVerificationGuard>
              </ProtectedRoute>
            }
          />
        

          <Route
            path="/candidates"
            element={
              <ProtectedRoute allowedRoles={['company']}>
                <EmailVerificationGuard>
                  <CompanyRouteGuard>
                    <Layout>
                      <CompanyCandidates />
                    </Layout>
                  </CompanyRouteGuard>
                </EmailVerificationGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/candidates/:id"
            element={
              <ProtectedRoute allowedRoles={['company']}>
                <EmailVerificationGuard>
                  <CompanyRouteGuard>
                    <Layout>
                      <CompanyCandidates />
                    </Layout>
                  </CompanyRouteGuard>
                </EmailVerificationGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages"
            element={
              <ProtectedRoute allowedRoles={['company', 'graduate']}>
                <EmailVerificationGuard>
                  <Layout>
                    <Messages />
                  </Layout>
                </EmailVerificationGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/interviews"
            element={
              <ProtectedRoute allowedRoles={['company', 'graduate']}>
                <EmailVerificationGuard>
                  <Layout>
                    <Interviews />
                  </Layout>
                </EmailVerificationGuard>
              </ProtectedRoute>
            }
          />


          <Route
            path="/candidate-preview/:id"
            element={
              <ProtectedRoute allowedRoles={['company']}>
                <EmailVerificationGuard>
                  <CompanyRouteGuard>
                    <Layout>
                      <CandidatePreview />
                    </Layout>
                  </CompanyRouteGuard>
                </EmailVerificationGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute allowedRoles={['company', 'graduate']}>
                <EmailVerificationGuard>
                  <Layout>
                    <Notifications />
                  </Layout>
                </EmailVerificationGuard>
              </ProtectedRoute>
            }
          />

          <Route
            path="/jobs"
            element={
              <ProtectedRoute allowedRoles={['company']}>
                <EmailVerificationGuard>
                  <CompanyRouteGuard>
                    <Layout>
                      <CompanyJobs />
                    </Layout>
                  </CompanyRouteGuard>
                </EmailVerificationGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/explore-preview/:id"
            element={<ExplorePreviewRedirect />}
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <AdminDashboard />
                </Layout>
            </ProtectedRoute>
            }
          />
          
          <Route
            path="/admin/companies"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <Companies />
                </Layout>
                </ProtectedRoute>
            }
          />
          <Route
            path="/admin/talents"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <Graduates />
                </Layout>
                </ProtectedRoute>
            }
          />
          <Route
            path="/admin/jobs"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <Jobs />
                </Layout>
                </ProtectedRoute>
            }
          />
          <Route
            path="/app-status"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <ApplicationStatus />
                </Layout>
                </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </AuthProvider>
    </GoogleOAuthProvider>
   
  );
}

export default App;
