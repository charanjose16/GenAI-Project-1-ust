import { FaTwitter, FaFacebookF, FaLinkedinIn, FaGithub } from 'react-icons/fa';
import logo from '../assets/icon.png'; // Adjust the path if needed
import { useState, useEffect } from 'react';

export const Footer = () => {
  const [isVisible, setIsVisible] = useState(false);

  // Check scroll position and toggle button visibility
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <footer className="bg-gray-900 py-12 px-6">
      <div className="container mx-auto flex flex-col lg:flex-row justify-between items-center text-gray-400">
        
        {/* Social Media Section */}
        <div className="flex space-x-8 mb-8 lg:mb-0">
          <a
            href="https://twitter.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-blue-500 transition-colors duration-300 relative"
          >
            <FaTwitter size={24} />
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#FFD700] transform scale-x-0 transition-all duration-300 group-hover:scale-x-100"></span>
          </a>
          <a
            href="https://facebook.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-blue-600 transition-colors duration-300 relative"
          >
            <FaFacebookF size={24} />
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#FFD700] transform scale-x-0 transition-all duration-300 group-hover:scale-x-100"></span>
          </a>
          <a
            href="https://linkedin.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-blue-700 transition-colors duration-300 relative"
          >
            <FaLinkedinIn size={24} />
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#FFD700] transform scale-x-0 transition-all duration-300 group-hover:scale-x-100"></span>
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-gray-100 transition-colors duration-300 relative"
          >
            <FaGithub size={24} />
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#FFD700] transform scale-x-0 transition-all duration-300 group-hover:scale-x-100"></span>
          </a>
        </div>

        {/* Center Section - Logo or Tagline */}
        <div className="text-center mb-8 lg:mb-0 relative">
          <img
            src={logo}
            alt="AI Made Easier Logo"
            className="w-32 h-32 mx-auto mb-4 filter invert rounded-full transform transition-transform duration-300 hover:scale-110 hover:shadow-2xl" // Changed to a circular shape (rounded-full)
          />
          <p className="text-sm font-medium">Revolutionizing AI, Making It Easier for Everyone</p>
        </div>

        {/* Legal Section */}
        <div className="text-sm text-gray-500 text-center lg:text-right">
          <p className="mb-3">© 2023 AI Made Easier. All rights reserved.</p>
          <div className="flex justify-center lg:justify-end space-x-4">
            <a
              href="/privacy-policy"
              className="text-gray-400 hover:text-white transition-colors duration-300 relative"
            >
              Privacy Policy
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#FFD700] transform scale-x-0 transition-all duration-300 hover:scale-x-100"></span>
            </a>
            <a
              href="/terms-of-service"
              className="text-gray-400 hover:text-white transition-colors duration-300 relative"
            >
              Terms of Service
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#FFD700] transform scale-x-0 transition-all duration-300 hover:scale-x-100"></span>
            </a>
          </div>
        </div>
      </div>

      {/* Back to Top Button */}
      {isVisible && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 bg-blue-500 text-white p-4 rounded-full shadow-lg hover:bg-blue-600 transition duration-300"
          aria-label="Back to top"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7-7-7 7"
            />
          </svg>
        </button>
      )}
    </footer>
  );
};
