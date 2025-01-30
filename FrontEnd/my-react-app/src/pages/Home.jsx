import { useState } from 'react';
import { Navbar } from '../components/Navbar';
import { Hero } from '../components/Hero';
import { Features } from '../components/Features';
import { Testimonials } from '../components/Testimonials';
import { CTA } from '../components/CTA';
import { Footer } from '../components/Footer';
import { AuthModal } from '../components/AuthModal';
import { Pricing } from '../components/Pricing';

export const Home = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-850 to-gray-800 text-white">
      <Navbar />
      
      <main className="relative z-10">
        <Hero onGetStartedClick={() => setShowAuthModal(true)} />
        <Features />
        <Testimonials />
        <CTA />
        <Pricing/>
      </main>

      <Footer />
      
      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
    </div>
  );
};