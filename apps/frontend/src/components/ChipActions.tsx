import type { ReactNode } from "react";
import type { ChipStatus } from "../types";

type Props = {
  status: ChipStatus;
  // Only the statuses given a label get a button, in this order
  labels: Partial<Record<ChipStatus, string>>;
  // Shown instead of the label, which becomes the tooltip
  icons?: Partial<Record<ChipStatus, ReactNode>>;
  onChange: (status: ChipStatus) => void;
};

export default function ChipActions({ status, labels, icons, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {(Object.entries(labels) as [ChipStatus, string][]).map(
        ([target, label]) => {
          const active = status === target;
          const icon = icons?.[target];
          return (
            <ToggleButton
              key={target}
              active={active}
              label={label}
              icon={icon}
              // Clicking the active status puts the item back in the queue
              onClick={() => onChange(active ? "queued" : target)}
            />
          );
        },
      )}
    </div>
  );
}

type ToggleButtonProps = {
  active: boolean;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
};

export function ToggleButton({ active, label, icon, onClick }: ToggleButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={icon ? label : undefined}
      title={icon ? label : undefined}
      className={`text-xs px-2 py-0.5 rounded border ${
        active
          ? "bg-gray-800 text-white border-gray-800 dark:bg-white dark:text-black dark:border-white"
          : "border-gray-400 text-gray-600 hover:border-current dark:text-gray-300"
      }`}
      onClick={onClick}
    >
      {icon ?? label}
    </button>
  );
}
