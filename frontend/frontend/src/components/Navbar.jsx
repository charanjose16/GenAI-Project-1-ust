import { FaBrain } from 'react-icons/fa';

export const Navbar = () => {
  return (
    <nav className="fixed w-full bg-gray-900/80 backdrop-blur-sm z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <FaBrain className="h-8 w-8 text-blue-400 mr-2" />
            <span className="text-xl font-bold">AI Made Easier</span>
          </div>
          <div className="hidden md:flex space-x-8">
            <a href="#features" className="hover:text-blue-400 transition">Features</a>
            <a href="#testimonials" className="hover:text-blue-400 transition">Testimonials</a>
            <a href="#pricing" className="hover:text-blue-400 transition">Pricing</a>
          </div>
        </div>
      </div>
    </nav>
  );
};