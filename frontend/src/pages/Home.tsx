import FloatingNavbar from '../components/home/floating-nav'
import HeroSection from '../components/home/hero-section'
import Features from '../components/home/features'


const Home = () => {
  return (
    <div className='relative'>
      <FloatingNavbar/>
      <HeroSection/>
      <Features/>
    </div>
  )
}

export default Home