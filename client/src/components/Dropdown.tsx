import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "./icons";

export interface DropdownOption<T extends string> {
  value: T;
  label: string;
}

interface DropdownProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: DropdownOption<T>[];
  id?: string;
}

/**
 * A fully custom single-select dropdown. Native `<select>` popups are drawn
 * by the OS (especially on Windows) and can't be reliably restyled with
 * CSS — this renders its own trigger + listbox so colors, spacing, and
 * hover/selected states all follow the app theme.
 */
export function Dropdown<T extends string>({ value, onChange, options, id }: DropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    setHighlighted(Math.max(0, options.findIndex((o) => o.value === value)));

    function onDocMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function selectHighlighted() {
    const opt = options[highlighted];
    if (opt) onChange(opt.value);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(options.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      selectHighlighted();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div className="dropdown" ref={rootRef}>
      <button
        type="button"
        id={id}
        className="dropdown__trigger"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{selected?.label ?? ""}</span>
        <ChevronDownIcon size={15} />
      </button>

      {open && (
        <ul className="dropdown__menu" role="listbox">
          {options.map((opt, i) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              className={[
                "dropdown__option",
                opt.value === value ? "dropdown__option--selected" : "",
                i === highlighted ? "dropdown__option--highlighted" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onMouseEnter={() => setHighlighted(i)}
              onClick={(e) => {
                // The trigger <button> is a "labelable" element, and this
                // list lives inside the same <label> (so clicking the
                // visible "Type" text also opens the menu). Without
                // stopping propagation here, a click on an option bubbles
                // up to that <label>, which forwards a synthetic click to
                // the button — re-toggling it open right after we close it.
                e.stopPropagation();
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
