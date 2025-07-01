export default function Suggest() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Today's Picks</h2>
      <ul className="space-y-4">
        <li className="border p-4 rounded">
          ▶️ Kurzgesagt: The Fermi Paradox{" "}
          <button className="ml-4 text-blue-600 underline">Watch</button>
        </li>
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

// TODO: semantic search, order by relevance, most viewed, shortest, longest, search by title, genre/category, etc.
