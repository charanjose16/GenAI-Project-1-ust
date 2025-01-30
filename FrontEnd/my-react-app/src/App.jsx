import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Features } from './components/Features';
import { Testimonials } from './components/Testimonials';
import { CTA } from './components/CTA';
import { Footer } from './components/Footer';
import { Pricing } from './components/Pricing';


export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-850 to-gray-800 text-white">
      <Navbar />
      
      <main className="relative z-10">
        <Hero />
        
        <Features />
        
        <Testimonials />

        <CTA />

        <Pricing />
      </main>

      <Footer />

      {/* Scroll to top button */}
      <button 
        className="fixed bottom-8 right-8 p-4 bg-blue-500 rounded-full hover:bg-blue-600 transition"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        ↑
      </button>
    </div>
  );
}