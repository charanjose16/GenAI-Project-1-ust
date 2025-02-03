import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { FaBrain } from "react-icons/fa";

const Navbar = () => {
  const username = localStorage.getItem("username") || "User";

  return (
    <nav className="fixed top-0 left-0 w-full bg-gray-900/80 backdrop-blur-sm z-50 shadow-lg">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <FaBrain className="h-8 w-8 text-blue-400 mr-2" />
          <span className="text-xl font-bold text-white">AI Made Easier</span>
        </div>
        <div className="text-gray-300 text-lg font-medium">
          Welcome, <span className="text-blue-400 font-semibold">{username}</span>
        </div>
      </div>
    </nav>
  );
};

const UserGenerator = () => {
  const [syntheticData, setSyntheticData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rawResponse, setRawResponse] = useState("");
  const [isVisible, setIsVisible] = useState(true);

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const fetchSyntheticData = async () => {
    setLoading(true);
    setError("");
    setRawResponse("");
    try {
      const response = await axios.get("http://127.0.0.1:8000/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // If the backend returns an error, capture it and any raw response
      if (response.data.error) {
        setError(response.data.error);
        setRawResponse(response.data.raw_response || "");
      } else {
        // Clean the raw data: Remove any unwanted properties or fix any malformed data
        const cleanedData = response.data.users.map((user) => ({
          firstname: user.firstname || "N/A",
          lastname: user.lastname || "N/A",
          email: user.email || "N/A",
          date_of_birth: user.date_of_birth
            ? new Date(user.date_of_birth).toLocaleDateString()
            : "N/A",
          salary: user.salary ? `$${user.salary.toFixed(2)}` : "N/A",
        }));

        setSyntheticData(cleanedData);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "An error occurred while fetching user data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSyntheticData();
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      navigate("/dashboard");
    }, 300);
  };

  return (
    <>
      <Navbar />
      <AnimatePresence>
        {isVisible && (
          <motion.div
            className="fixed inset-0 bg-gray-900 text-white flex justify-center items-center p-6"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <div className="relative w-full max-w-4xl bg-gray-800 p-8 rounded-lg shadow-lg flex flex-col items-center overflow-y-auto max-h-[90vh]">
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl focus:outline-none transition transform hover:scale-110"
              >
                ✖
              </button>

              <h1 className="text-3xl font-bold mb-6 text-center">
                Synthetic User Data Generator
              </h1>

              <AnimatePresence>
                {loading && (
                  <motion.div
                    className="p-4 bg-blue-600/10 text-blue-400 rounded-lg mt-4 w-full text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    Loading...
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {error && (
                  <motion.div
                    className="p-4 bg-red-500/10 text-red-400 rounded-lg mt-4 w-full text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    Error: {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {syntheticData.length > 0 && (
                  <motion.div
                    className="w-full mt-6 overflow-x-auto"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            First Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Last Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date of Birth
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Salary
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {syntheticData.map((user, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.firstname}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.lastname}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.date_of_birth}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.salary}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </motion.div>
                )}
              </AnimatePresence>

              {rawResponse && (
                <div className="mt-4 w-full">
                  <h3 className="text-lg font-medium">Raw Response</h3>
                  <pre className="bg-gray-100 text-gray-800 p-4 rounded overflow-x-auto">
                    {rawResponse}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default UserGenerator;
