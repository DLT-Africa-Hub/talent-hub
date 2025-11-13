import React from 'react'
import Header from './Header'
import SideBar from './SideBar'
import MobileHeader from './MobileHeader'
import MobileNav from './MobileNav'

interface LayoutProps { children: React.ReactNode }

const Layout: React.FC<LayoutProps> = ({ children }) => {

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <MobileHeader/>
      <Header />

    
      <div className="hidden lg:flex gap-[43px] h-[calc(100vh-72px)]  bg-onBoard">
      
        <aside className="self-start sticky top-4">
          <SideBar />
        </aside>

      
        <main className="flex-grow overflow-auto">
          {children}
        </main>
      </div>

      <div className='lg:hidden'>
        {children}
      </div>

      <MobileNav/>
    </div>
  )
}

export default Layout
