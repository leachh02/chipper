export default function Settings() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">User Preferences</h2>
      <div className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">Preferred time of day:</label>
          <select className="border px-2 py-1 rounded">
            <option>Morning</option>
            <option>Afternoon</option>
            <option>Evening</option>
          </select>
        </div>
        <div>
          <label className="block mb-1 font-medium">Mood preference:</label>
          <select className="border px-2 py-1 rounded">
            <option>Relaxed</option>
            <option>Focused</option>
            <option>Energetic</option>
          </select>
        </div>
        <div>
          <label className="block mb-1 font-medium">Chip order strategy:</label>
          <select className="border px-2 py-1 rounded">
            <option>Oldest first</option>
            <option>Shortest duration</option>
            <option>Most anticipated</option>
          </select>
        </div>
      </div>
    </div>
  );
}