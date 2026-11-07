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
    <div className="flex flex-wrap gap-1">
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
      className={`inline-flex h-7 min-w-7 items-center justify-center rounded-md border px-2 text-xs font-medium transition-colors ${
        active
          ? "border-accent bg-accent text-on-accent"
          : "border-line bg-surface text-muted hover:text-fg hover:bg-surface-2"
      }`}
      onClick={onClick}
    >
      {icon ?? label}
    </button>
  );
}
