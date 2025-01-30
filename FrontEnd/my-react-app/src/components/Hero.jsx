export const Hero = () => {
    return (
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Transform Your Workflow with{' '}
            <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              AI Simplicity
            </span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Empower your business with our intuitive AI solutions. No complexity, no hassle - just smart results.
          </p>
          <div className="flex justify-center space-x-4">
            <button className="bg-blue-500 hover:bg-blue-600 px-8 py-4 rounded-lg font-semibold transition transform hover:scale-105">
             Get Started
            </button>
          </div>
        </div>
      </section>
    );
  };