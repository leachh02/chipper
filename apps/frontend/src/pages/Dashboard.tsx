// App.tsx
import videosData from "../../../../watchlater.json";
import type { Video } from "../types";
import YTWatchList from "../components/YTWatchList";

// Assert type
const videos: Video[] = videosData;

export default function Dashboard() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold p-4">YT Watch Later</h1>
      <YTWatchList videos={videos} />
      <ul className="space-y-4">
        <li className="border p-4 rounded">
          🎧 Lex Fridman: Eliezer Yudkowsky{" "}
          <button className="ml-4 text-blue-600 underline">Listen</button>
        </li>
        <li className="border p-4 rounded">
          🎬 Lady Bird{" "}
          <button className="ml-4 text-blue-600 underline">Watch</button>
        </li>
      </ul>
    </div>
  );
}
