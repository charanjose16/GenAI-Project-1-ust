import { FaRocket, FaShieldAlt, FaClock, FaMagic, FaChartLine, FaRobot } from 'react-icons/fa';
import { FeatureItem } from './FeatureItems';

export const Features = () => {
  // Mock data array
  const features = [
    {
      icon: FaRocket,
      title: "Lightning Fast Processing",
      text: "Real-time data analysis with sub-second response times"
    },
    {
      icon: FaShieldAlt,
      title: "Security",
      text: "End-to-end encryption and GDPR compliance"
    },
    {
      icon: FaClock,
      title: "24/7 Availability",
      text: "Round-the-clock system monitoring and support"
    },
    {
      icon: FaMagic,
      title: "Smart Automation",
      text: "AI-powered workflow automation and task management"
    },
    {
      icon: FaChartLine,
      title: "Predictive Analytics",
      text: "Advanced forecasting and trend prediction models"
    },
    {
      icon: FaRobot,
      title: "Self-Learning AI",
      text: "Continuous improvement through machine learning algorithms"
    }
  ];

  return (
    <section id="features" className="py-20 bg-gray-800/50 px-6">
      <div className="container mx-auto">
        <h2 className="text-4xl font-bold text-center mb-16">Core Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FeatureItem 
              key={index}
              icon={feature.icon}
              title={feature.title}
              text={feature.text}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
