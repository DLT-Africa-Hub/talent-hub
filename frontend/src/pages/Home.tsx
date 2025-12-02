import React from 'react'
import FloatingNavbar from '../components/home/floating-nav'
import HeroSection from '../components/home/hero-section'


const Home = () => {
  return (
    <div className='relative'>
      <FloatingNavbar/>
      <HeroSection/>
    </div>
  )
}

export default Home