import { siYoutube } from "simple-icons";

export default function Connect() {
  const handleYouTubeConnect = () => {
    window.location.href = "http://localhost:8080/api/auth/google";
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
      <h1 className="text-4xl font-bold mb-6">Connect Your Services</h1>

      <button
        onClick={handleYouTubeConnect}
        className="flex items-center gap-3 bg-red-600 hover:bg-red-700 text-white text-lg font-semibold px-6 py-3 rounded-xl shadow-lg transition"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="red"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d={siYoutube.path} />
        </svg>
        Connect to YouTube
      </button>
      <button className="bg-green-600 text-white px-4 py-2 rounded">
        Connect Spotify
      </button>
    </div>
  );
}
