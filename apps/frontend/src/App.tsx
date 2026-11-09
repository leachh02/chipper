import { lazy, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import { SyncProvider } from "./sync/SyncProvider";

// Each page beyond the home page is its own download, so the app opens
// sooner. They're all fetched shortly after it opens anyway, which caches
// them for offline use (see public/sw.js) and keeps switching pages instant.
const pages = {
  youtube: () => import("./pages/YTDashboard"),
  spotify: () => import("./pages/SpotifyDashboard"),
  queue: () => import("./pages/QueuePage"),
  data: () => import("./pages/DataPage"),
};
const YTDashboard = lazy(pages.youtube);
const SpotifyDashboard = lazy(pages.spotify);
const QueuePage = lazy(pages.queue);
const DataPage = lazy(pages.data);

function App() {
  useEffect(() => {
    const timer = setTimeout(() => Object.values(pages).forEach((load) => load()), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SyncProvider>
      <Router basename={import.meta.env.BASE_URL.replace(/\/$/, "") || "/"}>
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
    </SyncProvider>
  );
}

export default App;
