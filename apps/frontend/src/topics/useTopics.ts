import { useCallback, useEffect, useState } from "react";
import { SERVER } from "../config";
import { getTopics, saveTopics } from "../db/queries";
import { useRemoteChanges } from "../db/useRemoteChanges";
import { server } from "../sync/api";
import { useSync } from "../sync/context";
import type { TopicKind, Topics } from "../types";

// Asked once per visit: whether this server has the clustering service
let canGroup: Promise<boolean> | null = null;
function serverCanGroup() {
  canGroup ??= server
    .status()
    .then((status) => status.clusters)
    .catch(() => {
      canGroup = null;
      return false;
    });
  return canGroup;
}

// A backlog's groups by topic, kept up to date by sync, and a way to ask
// the server to regroup it
export function useTopics(kind: TopicKind) {
  const { session } = useSync();
  const [topics, setTopics] = useState<Topics | undefined>();
  const [serverReady, setServerReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const reload = useCallback(() => {
    getTopics(kind).then(setTopics);
  }, [kind]);
  useEffect(reload, [reload]);
  useRemoteChanges(reload);

  useEffect(() => {
    if (!SERVER.enabled || !session) return;
    let live = true;
    serverCanGroup().then((ok) => live && setServerReady(ok));
    return () => {
      live = false;
    };
  }, [session]);

  async function regroup(groups: number | null) {
    if (!session) return;
    setBusy(true);
    setError("");
    try {
      const result = await server.regroup(session.token, kind, groups);
      await saveTopics(result);
      setTopics(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return { topics, canRegroup: SERVER.enabled && !!session && serverReady, busy, error, regroup };
}

export type TopicsState = ReturnType<typeof useTopics>;
