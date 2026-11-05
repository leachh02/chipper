import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import YTDashboard from "./pages/YTDashboard";
import SpotifyDashboard from "./pages/SpotifyDashboard";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard/youtube" element={<YTDashboard />} />
        <Route path="/dashboard/spotify" element={<SpotifyDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
