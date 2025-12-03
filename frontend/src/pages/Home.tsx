import React from 'react'
import FloatingNavbar from '../components/home/floating-nav'
import HeroSection from '../components/home/hero-section'
import Opportunities from '../components/home/opportunities'
import SimpleProcess from '../components/home/simpleProcess'
import TryItNow from '../components/home/tryItNow'
import Footer from '../components/home/footer'

const Home = () => {
  return (
    <div className='relative'>
      <FloatingNavbar />
      <HeroSection />
      <Opportunities />
      <SimpleProcess />
      <TryItNow />
      <Footer />
    </div>
  )
}

export default Home