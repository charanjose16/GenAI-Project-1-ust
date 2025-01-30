// components/Testimonials.jsx
import { TestimonialCard } from './TestimonialCard';
import { FaStar } from 'react-icons/fa';

export const Testimonials = () => {
  // Mock testimonial data
  const testimonials = [
    {
      name: "Sarah Thompson",
      role: "CTO at TechInnovate",
      text: "This AI platform reduced our development time by 40% while maintaining exceptional accuracy. The easiest integration we've ever experienced.",
      image: "https://via.placeholder.com/150"
    },
    {
      name: "Michael Chen",
      role: "Lead Data Scientist",
      text: "Revolutionized our workflow with its intuitive interface. The automated model tuning alone saved us hundreds of hours quarterly.",
      image: "https://via.placeholder.com/150"
    },
    {
      name: "Emma Wilson",
      role: "AI Product Manager",
      text: "The natural language processing capabilities surpassed our expectations. Customer satisfaction scores jumped 35% after implementation.",
      image: "https://via.placeholder.com/150"
    },
    {
      name: "David Rodriguez",
      role: "Head of Operations",
      text: "Real-time analytics transformed our decision-making process. The predictive maintenance features eliminated 90% of downtime.",
      image: "https://via.placeholder.com/150"
    }
  ];

  return (
    <section id="testimonials" className="py-20 px-6 bg-gray-800">
      <div className="container mx-auto max-w-7xl">
        <h2 className="text-4xl font-bold text-center mb-16">Trusted by Industry Leaders</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard key={index} {...testimonial} />
          ))}
        </div>
        <div className="mt-12 text-center text-gray-400 flex items-center justify-center gap-2">
          <FaStar className="text-yellow-400" />
          <FaStar className="text-yellow-400" />
          <FaStar className="text-yellow-400" />
          <FaStar className="text-yellow-400" />
          <FaStar className="text-yellow-400" />
          <span className="ml-2">4.9/5 from 500+ reviews</span>
        </div>
      </div>
    </section>
  );
};
