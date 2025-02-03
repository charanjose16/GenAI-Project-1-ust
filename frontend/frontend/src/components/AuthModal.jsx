import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios'; // Import Axios

// eslint-disable-next-line react/prop-types
export const AuthModal = ({ onClose }) => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true); // Toggle between login/signup
  const [username, setUsername] = useState(''); // Username field
  const [password, setPassword] = useState(''); // Password field
  const [role, setRole] = useState('user'); // Role field (default: 'user')
  const [error, setError] = useState(''); // For error messages
  const [isLoading, setIsLoading] = useState(false); // For loading state
  const [isClosing, setIsClosing] = useState(false); // To trigger the close animation

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isLogin) {
        // Login logic
        const response = await axios.post(
          'http://127.0.0.1:8000/token',
          new URLSearchParams({
            username: username,
            password: password,
            grant_type: 'password', // Required for OAuth2 compatibility
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded', // Set the correct content type
            },
          }
        );

        // Save the token, username, and role in localStorage
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('username', username);
        localStorage.setItem('role', response.data.role); // Save the role
        navigate('/dashboard'); // Redirect to dashboard after login
      } else {
        // Signup logic
        await axios.post('http://127.0.0.1:8000/register', {
          username: username,
          password: password,
          role: role, // Include role in the signup request
        });

        // After successful signup, switch to login mode
        setIsLogin(true); // Fall back to login form
        setError('Account created successfully! Please log in.');
      }
    } catch (err) {
      // Handle errors from the backend
      setError(err.response?.data?.detail || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      navigate('/'); // Navigate to the homepage
      onClose(); // Close the modal (trigger callback passed as a prop)
    }, 300); // Matches the transition duration for smooth closing
  };

  return (
    <AnimatePresence>
      {!isClosing && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="bg-gray-900 rounded-xl p-8 w-full max-w-md relative"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Close Button */}
            <button
              onClick={(e) => {
                e.stopPropagation(); // Prevent the click event from propagating
                handleClose();
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-white z-60"
            >
              ✕
            </button>

            {/* Title */}
            <motion.h2
              className="text-2xl font-bold mb-6"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </motion.h2>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 text-red-400 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username Field */}
              <motion.div
                key={isLogin ? 'login-username' : 'signup-username'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <label className="block text-sm font-medium mb-2">Username</label>
                <input
                  type="text"
                  required
                  className="w-full bg-gray-800 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                />
              </motion.div>

              {/* Password Field */}
              <motion.div
                key={isLogin ? 'login-password' : 'signup-password'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <label className="block text-sm font-medium mb-2">Password</label>
                <input
                  type="password"
                  required
                  className="w-full bg-gray-800 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </motion.div>

              {/* Role Dropdown (Only for Signup) */}
              {!isLogin && (
                <motion.div
                  key="signup-role"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <label className="block text-sm font-medium mb-2">Role</label>
                  <select
                    className="w-full bg-gray-800 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    disabled={isLoading}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </motion.div>
              )}

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
            <motion.p
              className="mt-6 text-center text-gray-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-blue-400 hover:text-blue-300 underline"
                disabled={isLoading}
              >
                {isLogin ? 'Create account' : 'Login instead'}
              </button>
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};