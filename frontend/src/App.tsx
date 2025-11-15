import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import {
  Home,
  GraduateDashboard,
  CompanyDashboard,
  CompanyCandidates,
  CompanyJobs,
  CompanyJobForm,
  JobRankSelector,
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
  ExplorePreview,
  AuthPage,
  Messages,
  Notifications,
  GraduateOnboarding,
  SkillAssessment,
} from './index';

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route
            path="/graduate/*"
            element={
              <ProtectedRoute allowedRoles={['graduate']}>
                <AssessmentGuard>
                  <Layout>
                    <GraduateDashboard />
                  </Layout>
                </AssessmentGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/company/*"
            element={
              <ProtectedRoute allowedRoles={['company']}>
                <CompanyDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/role" element={<AccountType />} />
          <Route path="/onboarding" element={<GraduateOnboarding />} />

          <Route
            path="/assessment"
            element={
              <ProtectedRoute allowedRoles={['graduate']}>
                <SkillAssessment />
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
                <AssessmentGuard>
                  <Layout>
                    <ExploreCompany />
                  </Layout>
                </AssessmentGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/applications"
            element={
              <ProtectedRoute allowedRoles={['graduate']}>
                <AssessmentGuard>
                  <Layout>
                    <GraduateApplications />
                  </Layout>
                </AssessmentGuard>
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
            path="/jobs/new"
            element={
              <Layout>
                <CompanyJobForm />
              </Layout>
            }
          />
          <Route
            path="/jobs/rank-selector"
            element={
              <Layout>
                <JobRankSelector />
              </Layout>
            }
          />
          <Route
            path="/explore-preview/:id"
            element={
              <Layout>
                <ExplorePreview />
              </Layout>
            }
          />
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;
