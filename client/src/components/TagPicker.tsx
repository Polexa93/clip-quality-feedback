import type { Tag } from "@cqf/shared";

interface TagPickerProps {
  tags: Tag[];
  selectedIds: Set<number>;
  onToggle: (tagId: number) => void;
}

/** Toggleable pills for the "what was good / bad" tags, grouped by sentiment. */
export function TagPicker({ tags, selectedIds, onToggle }: TagPickerProps) {
  const positive = tags.filter((t) => t.sentiment === "positive");
  const negative = tags.filter((t) => t.sentiment === "negative");

  return (
    <div className="tag-picker">
      <TagGroup label="What worked" tags={positive} selectedIds={selectedIds} onToggle={onToggle} sentiment="positive" />
      <TagGroup label="What needs work" tags={negative} selectedIds={selectedIds} onToggle={onToggle} sentiment="negative" />
    </div>
  );
}

function TagGroup({
  label,
  tags,
  selectedIds,
  onToggle,
  sentiment,
}: TagPickerProps & { label: string; sentiment: "positive" | "negative" }) {
  return (
    <fieldset className="tag-group">
      <legend>{label}</legend>
      <div className="tag-pills">
        {tags.map((tag) => {
          const selected = selectedIds.has(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              className={`tag-pill tag-pill--${sentiment} ${selected ? "tag-pill--selected" : ""}`}
              aria-pressed={selected}
              onClick={() => onToggle(tag.id)}
            >
              {selected ? (sentiment === "positive" ? "✓ " : "✗ ") : ""}
              {tag.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
