import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // Import useNavigate from react-router-dom
import axios from "axios";
import {
  FaUserCircle,
  FaProjectDiagram,
  FaSignOutAlt,
  FaLaptop,
  FaImage,
  FaRegCommentDots,
  FaFileAlt,
  FaBars,
  FaTimes,
  FaKey,
  FaBrain
} from "react-icons/fa";

export const Dashboard = () => {
  const navigate = useNavigate();

  // Sidebar and active section state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState("projects");

  // Data states for token usage and errors/loading
  const [tokenUsage, setTokenUsage] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sorting states for detailed table
  const [mainSortField, setMainSortField] = useState(null);
  const [mainSortDirection, setMainSortDirection] = useState("asc");

  // Sorting states for aggregated tables (by feature and user)
  const [featureSortField, setFeatureSortField] = useState(null);
  const [featureSortDirection, setFeatureSortDirection] = useState("asc");

  const [userSortField, setUserSortField] = useState(null);
  const [userSortDirection, setUserSortDirection] = useState("asc");

  // Retrieve user details from localStorage
  const username = localStorage.getItem("username") || "User";
  const role = localStorage.getItem("role") || "user";
  const token = localStorage.getItem("token");

  // Fetch token usage data for admins when token-usage section is active
  useEffect(() => {
    if (role === "admin" && activeSection === "token-usage") {
      setError(null);
      setLoading(true);

      if (!token) {
        setError("No authorization token found. Please log in again.");
        setLoading(false);
        return;
      }

      const fetchTokenUsage = async () => {
        try {
          const response = await axios.get("http://127.0.0.1:8000/token-usage", {
            headers: { Authorization: `Bearer ${token}` },
          });
          // Set data and reset sorting states
          setTokenUsage(response.data);
          setMainSortField(null);
          setFeatureSortField(null);
          setUserSortField(null);
        } catch (err) {
          console.error("Error fetching token usage:", err);
          setError("There was an error fetching token usage data.");
        } finally {
          setLoading(false);
        }
      };

      fetchTokenUsage();
    }
  }, [role, activeSection, token]);

  // Sorting handlers for detailed table
  const handleMainSort = (field) => {
    if (mainSortField === field) {
      setMainSortDirection(mainSortDirection === "asc" ? "desc" : "asc");
    } else {
      setMainSortField(field);
      setMainSortDirection("asc");
    }
  };

  // Sorting handlers for aggregated feature table
  const handleFeatureSort = (field) => {
    if (featureSortField === field) {
      setFeatureSortDirection(featureSortDirection === "asc" ? "desc" : "asc");
    } else {
      setFeatureSortField(field);
      setFeatureSortDirection("asc");
    }
  };

  // Sorting handlers for aggregated user table
  const handleUserSort = (field) => {
    if (userSortField === field) {
      setUserSortDirection(userSortDirection === "asc" ? "desc" : "asc");
    } else {
      setUserSortField(field);
      setUserSortDirection("asc");
    }
  };

  // Compute sorted detailed data
  const sortedTokenUsage = mainSortField
    ? [...tokenUsage].sort((a, b) => {
        let valA = a[mainSortField];
        let valB = b[mainSortField];
        if (typeof valA === "string") {
          return mainSortDirection === "asc"
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }
        return mainSortDirection === "asc" ? valA - valB : valB - valA;
      })
    : tokenUsage;

  // Compute overall totals
  const totalUsage = tokenUsage.reduce(
    (acc, curr) => ({
      input_tokens: acc.input_tokens + curr.input_tokens,
      output_tokens: acc.output_tokens + curr.output_tokens,
      total_tokens: acc.total_tokens + curr.total_tokens,
    }),
    { input_tokens: 0, output_tokens: 0, total_tokens: 0 }
  );

  // Aggregate by feature
  const aggregatedByFeature = Object.values(
    tokenUsage.reduce((acc, curr) => {
      const feat = curr.feature;
      if (!acc[feat]) {
        acc[feat] = { feature: feat, input_tokens: 0, output_tokens: 0, total_tokens: 0 };
      }
      acc[feat].input_tokens += curr.input_tokens;
      acc[feat].output_tokens += curr.output_tokens;
      acc[feat].total_tokens += curr.total_tokens;
      return acc;
    }, {})
  );

  const sortedByFeature = featureSortField
    ? [...aggregatedByFeature].sort((a, b) => {
        let valA = a[featureSortField];
        let valB = b[featureSortField];
        if (typeof valA === "string") {
          return featureSortDirection === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return featureSortDirection === "asc" ? valA - valB : valB - valA;
      })
    : aggregatedByFeature;

  // Aggregate by user
  const aggregatedByUser = Object.values(
    tokenUsage.reduce((acc, curr) => {
      const user = curr.username;
      if (!acc[user]) {
        acc[user] = { username: user, input_tokens: 0, output_tokens: 0, total_tokens: 0 };
      }
      acc[user].input_tokens += curr.input_tokens;
      acc[user].output_tokens += curr.output_tokens;
      acc[user].total_tokens += curr.total_tokens;
      return acc;
    }, {})
  );

  const sortedByUser = userSortField
    ? [...aggregatedByUser].sort((a, b) => {
        let valA = a[userSortField];
        let valB = b[userSortField];
        if (typeof valA === "string") {
          return userSortDirection === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return userSortDirection === "asc" ? valA - valB : valB - valA;
      })
    : aggregatedByUser;

  // Logout and sidebar toggling
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    window.location.href = "/";
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // Static project data
  const projects = [
    {
      id: 1,
      icon: <FaLaptop className="text-3xl text-blue-500 mr-4" />,
      title: "User Data Generator",
      description: "Generate random user data for testing or prototyping.",
      onClick: () => navigate("/user"), // Navigate to /user when clicked
    },
    {
      id: 2,
      icon: <FaImage className="text-3xl text-pink-500 mr-4" />,
      title: "Image Describer",
      description: "Describe the content of an image using AI, for accessibility.",
      onClick: () => navigate("/image"),
    },
    {
      id: 3,
      icon: <FaRegCommentDots className="text-3xl text-green-500 mr-4" />,
      title: "Chat with PDF",
      description: "Interact with PDFs to extract meaningful content.",
      onClick: () => navigate("/pdf"),
    },
    {
      id: 4,
      icon: <FaFileAlt className="text-3xl text-yellow-500 mr-4" />,
      title: "Summarizing Content",
      description: "Condense long content into concise summaries.",
      onClick: () => navigate("/summary"),
    },
  ];

  // Render projects section
  const renderProjects = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
      {projects.map((project) => (
        <div
          key={project.id}
          onClick={project.onClick} // Attach onClick handler for navigation
          className="card bg-gray-800 p-6 rounded-lg shadow-lg transform transition duration-500 hover:scale-105 hover:shadow-2xl cursor-pointer"
        >
          <div className="flex items-center mb-4">
            {project.icon}
            <h3 className="text-2xl font-semibold">{project.title}</h3>
          </div>
          <p className="text-gray-400">{project.description}</p>
        </div>
      ))}
    </div>
  );

  // Render detailed token usage table with overall totals
  const renderDetailedUsage = () => (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
      <h3 className="text-2xl font-semibold mb-4">Detailed Token Usage</h3>
      <table className="min-w-full bg-gray-700 text-gray-300 rounded-lg shadow-lg">
        <thead>
          <tr>
            <th className="px-4 py-2 cursor-pointer" onClick={() => handleMainSort("username")}>
              Username {mainSortField === "username" ? (mainSortDirection === "asc" ? "▲" : "▼") : ""}
            </th>
            <th className="px-4 py-2 cursor-pointer" onClick={() => handleMainSort("feature")}>
              Feature {mainSortField === "feature" ? (mainSortDirection === "asc" ? "▲" : "▼") : ""}
            </th>
            <th className="px-4 py-2 cursor-pointer" onClick={() => handleMainSort("input_tokens")}>
              Input Tokens {mainSortField === "input_tokens" ? (mainSortDirection === "asc" ? "▲" : "▼") : ""}
            </th>
            <th className="px-4 py-2 cursor-pointer" onClick={() => handleMainSort("output_tokens")}>
              Output Tokens {mainSortField === "output_tokens" ? (mainSortDirection === "asc" ? "▲" : "▼") : ""}
            </th>
            <th className="px-4 py-2 cursor-pointer" onClick={() => handleMainSort("total_tokens")}>
              Total Tokens {mainSortField === "total_tokens" ? (mainSortDirection === "asc" ? "▲" : "▼") : ""}
            </th>
            <th className="px-4 py-2 cursor-pointer" onClick={() => handleMainSort("timestamp")}>
              Timestamp {mainSortField === "timestamp" ? (mainSortDirection === "asc" ? "▲" : "▼") : ""}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedTokenUsage.length > 0 ? (
            sortedTokenUsage.map((usage, index) => (
              <tr key={index} className="bg-gray-800 hover:bg-gray-700">
                <td className="px-4 py-2">{usage.username}</td>
                <td className="px-4 py-2">{usage.feature}</td>
                <td className="px-4 py-2">{usage.input_tokens}</td>
                <td className="px-4 py-2">{usage.output_tokens}</td>
                <td className="px-4 py-2">{usage.total_tokens}</td>
                <td className="px-4 py-2">{usage.timestamp}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" className="px-4 py-2 text-center">No token usage data available</td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="mt-4 p-4 bg-gray-700 rounded-lg">
        <h4 className="text-xl font-semibold">Total Aggregation</h4>
        <div className="flex flex-wrap gap-4 mt-2">
          <div className="p-4 bg-gray-800 rounded-lg shadow-md">
            <p className="text-sm text-gray-400">Total Input Tokens</p>
            <p className="text-2xl font-bold">{totalUsage.input_tokens}</p>
          </div>
          <div className="p-4 bg-gray-800 rounded-lg shadow-md">
            <p className="text-sm text-gray-400">Total Output Tokens</p>
            <p className="text-2xl font-bold">{totalUsage.output_tokens}</p>
          </div>
          <div className="p-4 bg-gray-800 rounded-lg shadow-md">
            <p className="text-sm text-gray-400">Total Tokens</p>
            <p className="text-2xl font-bold">{totalUsage.total_tokens}</p>
          </div>
        </div>
      </div>
    </div>
  );

  // Render aggregated usage by feature in a card format
  const renderFeatureAggregation = () => (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
      <h3 className="text-2xl font-semibold mb-4">Feature-wise Aggregation</h3>
      <table className="min-w-full bg-gray-700 text-gray-300 rounded-lg shadow-lg">
        <thead>
          <tr>
            <th className="px-4 py-2 cursor-pointer" onClick={() => handleFeatureSort("feature")}>
              Feature {featureSortField === "feature" ? (featureSortDirection === "asc" ? "▲" : "▼") : ""}
            </th>
            <th className="px-4 py-2 cursor-pointer" onClick={() => handleFeatureSort("input_tokens")}>
              Input Tokens {featureSortField === "input_tokens" ? (featureSortDirection === "asc" ? "▲" : "▼") : ""}
            </th>
            <th className="px-4 py-2 cursor-pointer" onClick={() => handleFeatureSort("output_tokens")}>
              Output Tokens {featureSortField === "output_tokens" ? (featureSortDirection === "asc" ? "▲" : "▼") : ""}
            </th>
            <th className="px-4 py-2 cursor-pointer" onClick={() => handleFeatureSort("total_tokens")}>
              Total Tokens {featureSortField === "total_tokens" ? (featureSortDirection === "asc" ? "▲" : "▼") : ""}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedByFeature.length > 0 ? (
            sortedByFeature.map((agg, index) => (
              <tr key={index} className="bg-gray-800 hover:bg-gray-700">
                <td className="px-4 py-2">{agg.feature}</td>
                <td className="px-4 py-2">{agg.input_tokens}</td>
                <td className="px-4 py-2">{agg.output_tokens}</td>
                <td className="px-4 py-2">{agg.total_tokens}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" className="px-4 py-2 text-center">No aggregated data available</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  // Render aggregated usage by user in a card format
  const renderUserAggregation = () => (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
      <h3 className="text-2xl font-semibold mb-4">User-wise Aggregation</h3>
      <table className="min-w-full bg-gray-700 text-gray-300 rounded-lg shadow-lg">
        <thead>
          <tr>
            <th className="px-4 py-2 cursor-pointer" onClick={() => handleUserSort("username")}>
              Username {userSortField === "username" ? (userSortDirection === "asc" ? "▲" : "▼") : ""}
            </th>
            <th className="px-4 py-2 cursor-pointer" onClick={() => handleUserSort("input_tokens")}>
              Input Tokens {userSortField === "input_tokens" ? (userSortDirection === "asc" ? "▲" : "▼") : ""}
            </th>
            <th className="px-4 py-2 cursor-pointer" onClick={() => handleUserSort("output_tokens")}>
              Output Tokens {userSortField === "output_tokens" ? (userSortDirection === "asc" ? "▲" : "▼") : ""}
            </th>
            <th className="px-4 py-2 cursor-pointer" onClick={() => handleUserSort("total_tokens")}>
              Total Tokens {userSortField === "total_tokens" ? (userSortDirection === "asc" ? "▲" : "▼") : ""}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedByUser.length > 0 ? (
            sortedByUser.map((agg, index) => (
              <tr key={index} className="bg-gray-800 hover:bg-gray-700">
                <td className="px-4 py-2">{agg.username}</td>
                <td className="px-4 py-2">{agg.input_tokens}</td>
                <td className="px-4 py-2">{agg.output_tokens}</td>
                <td className="px-4 py-2">{agg.total_tokens}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" className="px-4 py-2 text-center">No aggregated data available</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  // Render content based on active section
  const renderContent = () => {
    switch (activeSection) {
      case "projects":
        return renderProjects();
      case "token-usage":
        return (
          <div>
            {loading ? (
              <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h3 className="text-2xl font-semibold mb-4">Token Usage</h3>
                <p className="text-gray-400">Loading token usage data...</p>
              </div>
            ) : error ? (
              <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h3 className="text-2xl font-semibold mb-4">Token Usage</h3>
                <p className="text-red-400">{error}</p>
              </div>
            ) : (
              <div>
                {renderDetailedUsage()}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderFeatureAggregation()}
                  {renderUserAggregation()}
                </div>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-900 text-white">
      {/* Sidebar */}
      <div
        className={`w-64 bg-gray-800 p-4 flex flex-col transition-all duration-300 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"
        }`}
      >
        <div className="flex justify-between items-center mb-6">
          <FaUserCircle className="text-5xl text-gray-400" />
          <button className="sm:hidden text-white" onClick={toggleSidebar}>
            <FaTimes className="text-3xl" />
          </button>
        </div>
        <h2 className="text-center text-lg font-semibold text-gray-300">{username}</h2>
        <ul className="mt-8 space-y-4">
          <li
            className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-700 cursor-pointer"
            onClick={() => setActiveSection("projects")}
          >
            <FaProjectDiagram />
            <span>Projects</span>
          </li>
          {role === "admin" && (
            <li
              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-700 cursor-pointer"
              onClick={() => setActiveSection("token-usage")}
            >
              <FaKey />
              <span>Token Usage</span>
            </li>
          )}
        </ul>
        <div className="mt-auto p-4">
          <button
            className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-700 cursor-pointer"
            onClick={handleLogout}
          >
            <FaSignOutAlt />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Navbar */}
        <div className="flex justify-between items-center bg-gray-800 p-4">
          <button className="sm:hidden text-white" onClick={toggleSidebar}>
            <FaBars className="text-3xl" />
          </button>
          <div className="flex items-center">
            <FaBrain className="h-8 w-8 text-blue-400 mr-2" />
            <span className="text-xl font-bold">AI Made Easier</span>
          </div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <div className="flex items-center space-x-2">
            <FaUserCircle className="text-2xl" />
            <span>{username}</span>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="flex-1 p-8 overflow-auto">
          <h2 className="text-4xl font-bold mb-8">Welcome to your Dashboard</h2>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};
