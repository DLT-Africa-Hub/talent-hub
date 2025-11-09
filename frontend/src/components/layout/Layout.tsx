import React from 'react'
import Nav from './Nav'
import Header from './Header'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex flex-col relative w-full bg-[#F9F9F9]">
      <Header />
      <main className="flex-grow">{children}</main>
      <Nav />
    </div>
  )
}

export default Layout
