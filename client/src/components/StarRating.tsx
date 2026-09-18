interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "lg";
}

/** Renders 1-5 stars. Read-only when `onChange` is omitted. */
export function StarRating({ value, onChange, size = "sm" }: StarRatingProps) {
  const readOnly = !onChange;
  return (
    <div
      className={`star-rating star-rating--${size}`}
      role={readOnly ? "img" : "radiogroup"}
      aria-label={`${value} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          className={`star ${n <= value ? "star--filled" : ""}`}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          aria-pressed={n === value}
          onClick={() => onChange?.(n)}
        >
          ★
        </button>
      ))}
    </div>
  );
}
