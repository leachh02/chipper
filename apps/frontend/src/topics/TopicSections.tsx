import type { ReactNode } from "react";
import type { Topics } from "../types";
import { formatRuntime } from "../utils/format";

type Props<T extends { id: string }> = {
  // Already filtered and sorted; each group keeps that order
  items: T[];
  topics: Topics;
  runtimeMs: (item: T) => number;
  children: (items: T[]) => ReactNode;
};

// The list split under each topic's name. Anything added since the last
// grouping goes under "Not grouped yet".
export default function TopicSections<T extends { id: string }>({
  items,
  topics,
  runtimeMs,
  children,
}: Props<T>) {
  const groupOf = new Map<string, string>();
  for (const group of topics.groups) {
    for (const id of group.ids) groupOf.set(id, group.label);
  }

  const sections = [
    ...topics.groups.map((group) => ({
      label: group.label,
      items: items.filter((item) => groupOf.get(item.id) === group.label),
    })),
    { label: "Not grouped yet", items: items.filter((item) => !groupOf.has(item.id)) },
  ].filter((section) => section.items.length);

  if (!sections.length) return children([]);

  return (
    <div className="flex flex-col gap-2">
      {sections.map(({ label, items }) => (
        <details key={label} className="card group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 sm:p-4">
            <span className="font-semibold">{label}</span>
            <span className="shrink-0 text-sm text-muted">
              {items.length} · {formatRuntime(items.reduce((sum, item) => sum + runtimeMs(item), 0))}
              <span className="ml-2 inline-block transition-transform group-open:rotate-90">›</span>
            </span>
          </summary>
          <div className="px-2 pb-2 sm:px-3 sm:pb-3">{children(items)}</div>
        </details>
      ))}
    </div>
  );
}
