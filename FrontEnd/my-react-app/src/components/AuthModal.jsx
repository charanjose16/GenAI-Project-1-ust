import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// eslint-disable-next-line react/prop-types
export const AuthModal = ({ onClose }) => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true); // Toggle between login/signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(''); // For error messages
  const [isLoading, setIsLoading] = useState(false); // For loading state

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Simulate authentication (replace with actual API call)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Basic validation
      if (!email || !password) {
        throw new Error('Please fill in all fields');
      }

      // On successful login:
      navigate('/dashboard');
      onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl p-8 w-full max-w-md relative">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          ✕
        </button>
        
        {/* Title */}
        <h2 className="text-2xl font-bold mb-6">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              required
              className="w-full bg-gray-800 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          {/* Password Field */}
          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              required
              className="w-full bg-gray-800 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-lg font-semibold transition disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {isLogin ? 'Logging in...' : 'Creating account...'}
              </div>
            ) : (
              isLogin ? 'Sign In' : 'Sign Up'
            )}
          </button>
        </form>

        {/* Toggle between Login/Signup */}
        <p className="mt-6 text-center text-gray-400">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-400 hover:text-blue-300 underline"
            disabled={isLoading}
          >
            {isLogin ? 'Create account' : 'Login instead'}
          </button>
        </p>
      </div>
    </div>
  );
};