import { importRawVideos } from "../db/queries";
import type { RawVideo } from "../types";

type SyncResponse = {
  error?: string;
  data?: { chipper_result?: { rawVideos: RawVideo[] } };
};

const EXTENSION_ID = import.meta.env.VITE_EXTENSIONS_ID;

export default function SyncWatchLaterButton({
  loading,
  setLoading,
}: {
  loading: boolean;
  setLoading: (loading: boolean) => void;
}) {
  async function onClick() {
    if (!window.chrome?.runtime?.sendMessage) {
      alert("Chipper extension not installed");
      return;
    }
    setLoading(true);
    chrome.runtime.sendMessage(
      EXTENSION_ID,
      { type: "START_CHIPPER_SCRIPT" },
      undefined,
      async (response?: SyncResponse) => {
        const rawVideos = response?.data?.chipper_result?.rawVideos;
        if (!rawVideos) {
          alert("Sync failed: " + (response?.error ?? "no data returned"));
          setLoading(false);
          return;
        }
        await importRawVideos(rawVideos);
        setLoading(false);
      },
    );
  }

  return (
    <button onClick={onClick} disabled={loading}>
      {loading ? "Syncing..." : "Sync Watch Later"}
    </button>
  );
}
