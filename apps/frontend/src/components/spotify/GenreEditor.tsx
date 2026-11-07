import { useState } from "react";

type Props = {
  genres: string[];
  onChange: (genres: string[]) => void;
  onDone: () => void;
};

// Edits an album's genres. Suggestions come from the "album-genres"
// datalist, which AlbumsView fills with every genre in the library.
export default function GenreEditor({ genres, onChange, onDone }: Props) {
  const [text, setText] = useState("");

  function add() {
    const genre = text.trim();
    setText("");
    if (!genre) return;

    // Reuse an existing genre's spelling, so "shoegaze" joins "Shoegaze"
    const options = document.getElementById("album-genres") as HTMLDataListElement | null;
    const existing = [...(options?.options ?? [])]
      .map((o) => o.value)
      .find((g) => g.toLowerCase() === genre.toLowerCase());
    const name = existing ?? genre;

    if (!genres.some((g) => g.toLowerCase() === name.toLowerCase())) {
      onChange([...genres, name]);
    }
  }

  return (
    <div className="flex flex-col gap-1 text-xs">
      <ul className="flex flex-wrap gap-1">
        {genres.map((genre) => (
          <li
            key={genre}
            className="flex items-center gap-1 rounded border border-gray-400 pl-1.5"
          >
            {genre}
            <button
              type="button"
              aria-label={`Remove ${genre}`}
              className="px-1 hover:text-red-600"
              onClick={() => onChange(genres.filter((g) => g !== genre))}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <form
        className="flex gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input
          type="text"
          list="album-genres"
          aria-label="Add a genre"
          placeholder="Add a genre"
          className="border p-1 min-w-0 flex-1"
          value={text}
          autoFocus
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && onDone()}
        />
        <button
          type="button"
          className="border rounded px-2"
          onClick={() => {
            add();
            onDone();
          }}
        >
          Done
        </button>
      </form>
    </div>
  );
}
