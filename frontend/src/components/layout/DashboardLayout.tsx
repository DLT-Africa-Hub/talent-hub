import React from 'react';
import DashboardHeader from './DashboardHeader';
import SideBar from './SideBar';
import MobileHeader from './MobileHeader';
import MobileNav from './MobileNav';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <MobileHeader />
      <DashboardHeader />

      <div className="hidden lg:flex gap-[32px] h-[calc(100vh-100px)] bg-onBoard">
        <aside className="self-start sticky top-4">
          <SideBar />
        </aside>

        <main className="grow overflow-auto">{children}</main>
      </div>

      <div className="lg:hidden">{children}</div>

      <MobileNav />
    </div>
  );
};

export default DashboardLayout;

