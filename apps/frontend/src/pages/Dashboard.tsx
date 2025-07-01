export default function Dashboard() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
      <p>✅ Connected: Spotify</p>
      <p>✅ Connected: YouTube</p>
      <div className="mt-6">
        <h3 className="text-xl font-semibold mb-2">Your Queue:</h3>
        <ul className="list-disc list-inside">
          <li>🎧 Lex Fridman: Eliezer Yudkowsky</li>
          <li>📺 Kurzgesagt: The Fermi Paradox</li>
          <li>🎬 Lady Bird</li>
        </ul>
      </div>
    </div>
  );
}