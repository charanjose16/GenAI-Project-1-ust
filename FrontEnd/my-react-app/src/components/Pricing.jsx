// components/Pricing.jsx
import { FaCheckCircle } from 'react-icons/fa';

export const Pricing = () => {
  // Mock pricing data
  const pricingPlans = [
    {
      title: "Basic",
      price: "$19/month",
      features: [
        "1 AI Integration",
        "Up to 5 Users",
        "Email Support",
        "500 API Calls"
      ],
      highlight: false
    },
    {
      title: "Pro",
      price: "$49/month",
      features: [
        "3 AI Integrations",
        "Up to 20 Users",
        "Priority Support",
        "5000 API Calls"
      ],
      highlight: true // Highlight this plan
    },
    {
      title: "Enterprise",
      price: "$99/month",
      features: [
        "Unlimited AI Integrations",
        "Unlimited Users",
        "24/7 Support",
        "Unlimited API Calls"
      ],
      highlight: false
    }
  ];

  return (
    <section id="pricing" className="py-20 px-6 bg-gray-900 text-white">
      <div className="container mx-auto max-w-7xl">
        <h2 className="text-4xl font-bold text-center mb-16 text-yellow-400">Affordable Pricing Plans</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {pricingPlans.map((plan, index) => (
            <div
              key={index}
              className={`p-8 rounded-lg text-center transition-all duration-300 transform ${
                plan.highlight
                  ? 'bg-gradient-to-br from-yellow-500 to-yellow-400 border-2 border-yellow-600 shadow-2xl scale-105'
                  : 'bg-gray-800 border border-gray-700'
              } hover:scale-105 hover:shadow-2xl`}
            >
              <h3 className="text-2xl font-semibold mb-4">{plan.title}</h3>
              <p className="text-3xl font-bold mb-4">{plan.price}</p>
              <ul className="list-none mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center justify-start mb-2 text-sm md:text-base">
                    <FaCheckCircle className="text-yellow-400 mr-2" />
                    {feature}
                  </li>
                ))}
              </ul>
              {/* No button, keeping the focus on the pricing details */}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
