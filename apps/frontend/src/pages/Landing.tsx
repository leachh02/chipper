export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-8">
      <h1 className="text-4xl font-bold mb-4">Welcome to Chipper</h1>
      <p className="text-lg text-gray-600 mb-6">
        Chip away at your entertainment backlog
      </p>
      <a
        href="/connect"
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Get Started
      </a>
    </div>
  );
}
