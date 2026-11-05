import type { ChipStatus } from "../types";

type Props = {
  status: ChipStatus;
  // Only the statuses given a label get a button, in this order
  labels: Partial<Record<ChipStatus, string>>;
  onChange: (status: ChipStatus) => void;
};

export default function ChipActions({ status, labels, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {(Object.entries(labels) as [ChipStatus, string][]).map(
        ([target, label]) => {
          const active = status === target;
          return (
            <button
              key={target}
              type="button"
              aria-pressed={active}
              className={`text-xs px-2 py-0.5 rounded border ${
                active
                  ? "bg-gray-800 text-white border-gray-800 dark:bg-white dark:text-black dark:border-white"
                  : "border-gray-400 text-gray-600 hover:border-current dark:text-gray-300"
              }`}
              // Clicking the active status puts the item back in the queue
              onClick={() => onChange(active ? "queued" : target)}
            >
              {label}
            </button>
          );
        },
      )}
    </div>
  );
}
