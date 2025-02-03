// components/TestimonialCard.jsx

// eslint-disable-next-line react/prop-types
export const TestimonialCard = ({ name, role, text, image }) => {
  return (
    <div className="bg-gray-900 p-8 rounded-xl border-l-4 border-blue-400 hover:transform hover:translate-x-2 transition-all duration-300">
      <p className="text-xl mb-6 text-gray-300">&quot;{text}&quot;</p>
      <div className="flex items-center gap-4">
        <img 
          src={image} 
          alt={name} 
          className="w-14 h-14 rounded-full object-cover"
        />
        <div>
          <p className="font-bold text-lg">{name}</p>
          <p className="text-gray-400 text-sm">{role}</p>
        </div>
      </div>
    </div>
  );
};

