import { FaYoutube, FaSpotify, FaHourglassHalf } from "react-icons/fa";
import { Link } from "react-router-dom";
import { SPOTIFY } from "../config";

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-8">
      <h1 className="text-4xl font-bold mb-4">Welcome to Chipper</h1>
      <p className="text-lg text-gray-600 mb-6">
        Chip away at your entertainment backlog
      </p>
      <Link
        to="/queue"
        className="flex items-center gap-2 mb-4 px-5 py-2 rounded border-2 border-current font-semibold hover:opacity-80"
      >
        <FaHourglassHalf />
        Start a chip session
      </Link>
      <div className="flex gap-4">
        <Link
          to="/dashboard/youtube"
          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          <FaYoutube />
          Watch Later
        </Link>
        {SPOTIFY.enabled && (
        <Link
          to="/dashboard/spotify"
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          <FaSpotify />
          Podcasts & Albums
        </Link>
        )}
      </div>
      <Link to="/data" className="mt-6 text-sm underline text-gray-500">
        Your data and backups
      </Link>
    </div>
  );
}
