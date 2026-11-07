import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import YTDashboard from "./pages/YTDashboard";
import SpotifyDashboard from "./pages/SpotifyDashboard";
import QueuePage from "./pages/QueuePage";
import DataPage from "./pages/DataPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard/youtube" element={<YTDashboard />} />
          <Route path="/dashboard/spotify" element={<SpotifyDashboard />} />
          <Route path="/queue" element={<QueuePage />} />
          <Route path="/data" element={<DataPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
