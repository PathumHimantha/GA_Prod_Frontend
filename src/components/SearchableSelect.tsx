import { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, X } from "lucide-react";

export interface SelectOption {
  bcode: string;
  label: string; // displayed text
  value: string; // the value stored (e.g. bname)
  sub?: string; // optional subtitle (e.g. bcode)
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string, option: SelectOption) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const SearchableSelect = ({
  options,
  value,
  onChange,
  placeholder = "Select...",
  disabled = false,
  className = "",
}: SearchableSelectProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = options.filter(
    (o) =>
      o.label.toLowerCase().includes(search.toLowerCase()) ||
      o.sub?.toLowerCase().includes(search.toLowerCase()),
  );

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const handleSelect = (option: SelectOption) => {
    onChange(option.value, option);
    setOpen(false);
    setSearch("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("", { label: "", value: "" });
    setSearch("");
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={`
          w-full h-12 px-3 flex items-center gap-2 rounded-md border text-sm
          bg-white border-gray-200 text-left transition-all
          ${disabled ? "opacity-50 cursor-not-allowed bg-gray-50" : "cursor-pointer hover:border-gray-300"}
          ${open ? "border-primary ring-2 ring-primary/20" : ""}
        `}
      >
        {/* Icon slot — parent can pass icon via label prefix if needed */}
        <span className="flex-1 truncate text-gray-700">
          {selected ? (
            <span className="flex items-center gap-2">
              {selected.label}
              {selected.sub && (
                <span className="text-xs text-gray-400 font-mono">
                  ({selected.sub})
                </span>
              )}
            </span>
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </span>

        <span className="flex items-center gap-1 ml-auto shrink-0">
          {selected && (
            <span
              onClick={handleClear}
              className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="flex-1 text-sm outline-none bg-transparent placeholder:text-gray-400"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Options list */}
          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-sm text-gray-400 text-center">
                No results found
              </li>
            ) : (
              filtered.map((option) => (
                <li
                  key={option.value}
                  onClick={() => handleSelect(option)}
                  className={`
                    flex items-center justify-between px-3 py-2 text-sm cursor-pointer
                    hover:bg-primary/5 transition-colors
                    ${value === option.value ? "bg-primary/10 text-primary font-medium" : "text-gray-700"}
                  `}
                >
                  <span>{option.label}</span>
                  {option.sub && (
                    <span className="text-xs text-gray-400 font-mono ml-2">
                      {option.sub}
                    </span>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
