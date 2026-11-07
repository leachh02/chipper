import * as Slider from "@radix-ui/react-slider";

type Props = {
  label: string;
  // In minutes. The top of the slider means "and longer".
  value: [number, number];
  max: number;
  onChange: (value: [number, number]) => void;
};

export default function DurationRange({ label, value, max, onChange }: Props) {
  const [low, high] = value;
  const range = high >= max ? `${low} min or longer` : `${low}–${high} min`;

  return (
    <div className="my-2">
      <p className="text-sm font-medium">
        {label}: {low === 0 && high >= max ? "any length" : range}
      </p>
      <Slider.Root
        className="relative flex items-center select-none touch-none w-full max-w-[300px] h-[40px]"
        value={value}
        min={0}
        max={max}
        step={1}
        minStepsBetweenThumbs={1}
        onValueChange={(v) => onChange(v as [number, number])}
      >
        <Slider.Track className="relative h-[6px] grow rounded-full bg-surface-2">
          <Slider.Range className="absolute h-full rounded-full bg-accent" />
        </Slider.Track>
        {["Shortest", "Longest"].map((name) => (
          <Slider.Thumb
            key={name}
            aria-label={name}
            className="block w-[20px] h-[20px] rounded-full border border-line bg-surface shadow"
          />
        ))}
      </Slider.Root>
    </div>
  );
}
