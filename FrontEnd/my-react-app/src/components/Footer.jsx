// components/Footer.jsx
import { FaTwitter, FaFacebookF, FaLinkedinIn, FaGithub } from 'react-icons/fa';
import logo from '../assets/icon.png'; // Adjust the path if needed

export const Footer = () => {
  return (
    <footer className="bg-gray-900 py-12 px-6">
      <div className="container mx-auto flex flex-col lg:flex-row justify-between items-center text-gray-400">
        
        {/* Social Media Section */}
        <div className="flex space-x-8 mb-8 lg:mb-0">
          <a
            href="https://twitter.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-blue-500 transition-colors duration-300"
          >
            <FaTwitter size={24} />
          </a>
          <a
            href="https://facebook.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-blue-600 transition-colors duration-300"
          >
            <FaFacebookF size={24} />
          </a>
          <a
            href="https://linkedin.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-blue-700 transition-colors duration-300"
          >
            <FaLinkedinIn size={24} />
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-gray-100 transition-colors duration-300"
          >
            <FaGithub size={24} />
          </a>
        </div>

        {/* Center Section - Logo or Tagline */}
        <div className="text-center mb-8 lg:mb-0">
          <img
            src={logo}
            alt="AI Made Easier Logo"
            className="w-24 h-auto mx-auto mb-4 filter invert"
            // The `invert` filter inverts the colors of the image
          />
          <p className="text-sm font-medium">Revolutionizing AI, Making It Easier for Everyone</p>
        </div>

        {/* Legal Section */}
        <div className="text-sm text-gray-500 text-center lg:text-right">
          <p className="mb-3">© 2023 AI Made Easier. All rights reserved.</p>
          <div>
            <a
              href="/privacy-policy"
              className="hover:text-white transition duration-300 mx-4"
            >
              Privacy Policy
            </a>
            <a
              href="/terms-of-service"
              className="hover:text-white transition duration-300 mx-4"
            >
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
