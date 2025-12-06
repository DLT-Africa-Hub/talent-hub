import React, { useState, useEffect } from 'react';
import DashboardHeader from './DashboardHeader';
import SideBar from './SideBar';
import MobileHeader from './MobileHeader';
import MobileNav from './MobileNav';
import EmailVerificationModal from '../EmailVerificationModal';
import EmailVerificationBanner from '../EmailVerificationBanner';
import { useAuth } from '../../context/AuthContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user } = useAuth();
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationDismissed, setVerificationDismissed] = useState(false);

  useEffect(() => {
    // Check if user has dismissed verification
    const dismissed =
      localStorage.getItem('emailVerificationDismissed') === 'true';
    setVerificationDismissed(dismissed);

    // Show modal if user is not verified and hasn't dismissed
    if (user && (user.emailVerified === false || !user.emailVerified)) {
      if (!dismissed) {
        // Check if user has seen the modal in this session
        const hasSeenModal = sessionStorage.getItem(
          'emailVerificationModalShown'
        );
        if (!hasSeenModal) {
          setShowVerificationModal(true);
          sessionStorage.setItem('emailVerificationModalShown', 'true');
        }
      }
    } else {
      setShowVerificationModal(false);
      setVerificationDismissed(false);
      // Clear the flags when user is verified
      sessionStorage.removeItem('emailVerificationModalShown');
      localStorage.removeItem('emailVerificationDismissed');
    }
  }, [user]);

  const handleDismissVerification = () => {
    setVerificationDismissed(true);
    localStorage.setItem('emailVerificationDismissed', 'true');
  };

  const handleOpenModal = () => {
    setShowVerificationModal(true);
  };

  // Check if user is unverified and has dismissed
  const shouldDisableInteractions =
    user &&
    (user.emailVerified === false || !user.emailVerified) &&
    verificationDismissed;

  return (
    <div className="min-h-screen flex flex-col bg-white relative">
      <div className="relative z-50">
        <EmailVerificationBanner onOpenModal={handleOpenModal} />
      </div>

      <div
        className={
          shouldDisableInteractions ? 'pointer-events-none opacity-50' : ''
        }
      >
        <MobileHeader />
        <DashboardHeader />
      </div>

      {shouldDisableInteractions && (
        <div
          className="fixed inset-0 bg-white/80 z-40 pointer-events-auto"
          style={{ top: '0', height: '100vh' }}
        />
      )}

      <div
        className={`hidden lg:flex gap-[32px] h-[calc(100vh-100px)] bg-onBoard relative ${
          shouldDisableInteractions ? 'pointer-events-none opacity-50' : ''
        }`}
      >
        <aside className="self-start sticky top-4">
          <SideBar />
        </aside>

        <main className="grow overflow-auto">{children}</main>
      </div>

      <div
        className={`lg:hidden relative ${
          shouldDisableInteractions ? 'pointer-events-none opacity-50' : ''
        }`}
      >
        {children}
      </div>

      <div
        className={
          shouldDisableInteractions ? 'pointer-events-none opacity-50' : ''
        }
      >
        <MobileNav />
      </div>

      <EmailVerificationModal
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        onDismiss={handleDismissVerification}
      />
    </div>
  );
};

export default DashboardLayout;
