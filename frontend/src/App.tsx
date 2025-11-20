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
  AccountType,
  Layout,
  ExploreCompany,
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
} from './index';

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
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
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
                <CompanyDashboard />
                </EmailVerificationGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/company/profile"
            element={
              <ProtectedRoute allowedRoles={['company']}>
                <EmailVerificationGuard>
                <Layout>
                  <CompanyProfile />
                </Layout>
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
                <SkillAssessment />
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
          <Route path="/company/onboarding" element={<CompanyOnboarding />} />
        

          <Route
            path="/candidates"
            element={
              <Layout>
                <CompanyCandidates />
              </Layout>
            }
          />
          <Route
            path="/messages"
            element={
              <Layout>
                <Messages />
              </Layout>
            }
          />

          <Route
            path="/candidate-preview/:id"
            element={
              <Layout>
                <CandidatePreview />
              </Layout>
            }
          />
          <Route
            path="/notifications"
            element={
              <Layout>
                <Notifications />
              </Layout>
            }
          />

          <Route
            path="/jobs"
            element={
              <Layout>
                <CompanyJobs />
              </Layout>
            }
          />
          <Route
            path="/explore-preview/:id"
            element={<ExplorePreviewRedirect />}
          />
        </Routes>
      </div>
    </AuthProvider>
    </GoogleOAuthProvider>
   
  );
}

export default App;
