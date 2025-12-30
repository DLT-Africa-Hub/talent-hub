import React, { useState, useEffect } from 'react';
import DashboardHeader from './DashboardHeader';
import SideBar from './SideBar';
import MobileHeader from './MobileHeader';
import MobileNav from './MobileNav';
import EmailVerificationBanner from '../EmailVerificationBanner';
import { useAuth } from '../../context/AuthContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user } = useAuth();
  const [verificationDismissed, setVerificationDismissed] = useState(false);

  useEffect(() => {
    // Check if user has dismissed verification
    const dismissed =
      localStorage.getItem('emailVerificationDismissed') === 'true';
    setVerificationDismissed(dismissed);

    if (user && user.emailVerified) {
      setVerificationDismissed(false);
      // Clear the flags when user is verified
      localStorage.removeItem('emailVerificationDismissed');
    }
  }, [user]);

  const handleOpenModal = () => {
    // Modal removed - banner can still show verification status
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
    </div>
  );
};

export default DashboardLayout;
