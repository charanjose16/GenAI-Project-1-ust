

// eslint-disable-next-line react/prop-types
export const FeatureItem = ({ icon: Icon, title, text }) => {
  return (
    <div className="bg-gray-900 p-8 rounded-xl hover:transform hover:scale-105 transition duration-300">
      <Icon className="h-12 w-12 text-blue-400 mb-4" />
      <h3 className="text-2xl font-bold mb-3">{title}</h3>
      <p className="text-gray-400">{text}</p>
    </div>
  );
};
