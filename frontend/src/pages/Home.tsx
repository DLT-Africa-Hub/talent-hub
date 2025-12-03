import FloatingNavbar from '../components/home/floating-nav'
import HeroSection from '../components/home/hero-section'
import Features from '../components/home/features'
import Opportunities from '../components/home/opportunities'
import SimpleProcess from '../components/home/simpleProcess'
import TryItNow from '../components/home/tryItNow'
import Footer from '../components/home/footer'

const Home = () => {
  return (
    <div className='relative'>
      <FloatingNavbar />
      <HeroSection />
       <Features/>
      <Opportunities />
      <SimpleProcess />
      <TryItNow />
      <Footer />
    </div>
  )
}

export default Home