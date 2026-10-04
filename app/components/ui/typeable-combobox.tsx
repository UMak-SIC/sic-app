"use client";

import * as React from "react";
import { CaretDown, Check } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label?: string;
  description?: string;
}

export interface TypeableComboboxProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: (string | ComboboxOption)[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  inputClassName?: string;
  "aria-invalid"?: boolean;
  autoComplete?: string;
}

function normalizeOption(item: string | ComboboxOption): ComboboxOption {
  if (typeof item === "string") {
    return { value: item, label: item };
  }
  return {
    value: item.value,
    label: item.label || item.value,
    description: item.description,
  };
}

export const TypeableCombobox = React.forwardRef<HTMLInputElement, TypeableComboboxProps>(
  (
    {
      id,
      value,
      onChange,
      options,
      placeholder,
      disabled = false,
      required = false,
      className,
      inputClassName,
      "aria-invalid": ariaInvalid,
      autoComplete = "off",
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [highlightedIndex, setHighlightedIndex] = React.useState<number>(-1);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const listRef = React.useRef<HTMLUListElement>(null);

    // Merge external ref with internal inputRef
    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    const normalizedOptions = React.useMemo(() => {
      const map = new Map<string, ComboboxOption>();
      options.forEach((opt) => {
        const norm = normalizeOption(opt);
        if (norm.value && !map.has(norm.value.toLowerCase())) {
          map.set(norm.value.toLowerCase(), norm);
        }
      });
      return Array.from(map.values());
    }, [options]);

    // Filter options based on typed query
    const filteredOptions = React.useMemo(() => {
      const query = value.trim().toLowerCase();
      if (!query) return normalizedOptions;

      return normalizedOptions.filter((opt) => {
        const matchVal = opt.value.toLowerCase().includes(query);
        const matchLabel = opt.label?.toLowerCase().includes(query);
        const matchDesc = opt.description?.toLowerCase().includes(query);
        return matchVal || matchLabel || matchDesc;
      });
    }, [normalizedOptions, value]);

    // Click outside handler
    React.useEffect(() => {
      if (!isOpen) return;

      const handleClickOutside = (event: MouseEvent | TouchEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
          setHighlightedIndex(-1);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("touchstart", handleClickOutside);
      };
    }, [isOpen]);

    // Scroll highlighted item into view
    React.useEffect(() => {
      if (
        isOpen &&
        highlightedIndex >= 0 &&
        listRef.current &&
        listRef.current.children[highlightedIndex]
      ) {
        const element = listRef.current.children[highlightedIndex] as HTMLElement;
        element.scrollIntoView({ block: "nearest" });
      }
    }, [highlightedIndex, isOpen]);

    const handleSelectOption = (optionValue: string) => {
      onChange(optionValue);
      setIsOpen(false);
      setHighlightedIndex(-1);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (disabled) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setHighlightedIndex(0);
        } else {
          setHighlightedIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          );
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setHighlightedIndex(filteredOptions.length - 1);
        } else {
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          );
        }
      } else if (e.key === "Enter") {
        if (isOpen && highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          e.preventDefault();
          handleSelectOption(filteredOptions[highlightedIndex].value);
        }
      } else if (e.key === "Escape") {
        if (isOpen) {
          e.preventDefault();
          setIsOpen(false);
          setHighlightedIndex(-1);
        }
      } else if (e.key === "Tab") {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    return (
      <div ref={containerRef} className={cn("relative w-full", className)}>
        <div className="relative flex items-center">
          <input
            ref={inputRef}
            id={id}
            type="text"
            role="combobox"
            aria-expanded={isOpen}
            aria-autocomplete="list"
            aria-controls={id ? `${id}-listbox` : undefined}
            aria-invalid={ariaInvalid}
            autoComplete={autoComplete}
            required={required}
            disabled={disabled}
            placeholder={placeholder}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              if (!isOpen) {
                setIsOpen(true);
              }
              setHighlightedIndex(0);
            }}
            onFocus={() => {
              setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            className={cn(
              "flex h-9 w-full rounded-[6px] border border-line bg-card px-3 pr-8 py-1.5 text-xs font-sans text-ink transition-colors placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-cyan focus:border-cyan disabled:cursor-not-allowed disabled:opacity-50",
              inputClassName
            )}
          />

          <button
            type="button"
            tabIndex={-1}
            aria-label="Toggle options"
            disabled={disabled}
            onClick={() => {
              if (!disabled) {
                setIsOpen((prev) => !prev);
                inputRef.current?.focus();
              }
            }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center size-6 rounded-[4px] text-muted hover:text-ink hover:bg-canvas transition-colors cursor-pointer disabled:pointer-events-none"
          >
            <CaretDown
              size={14}
              weight="bold"
              className={cn(
                "transition-transform duration-200",
                isOpen && "rotate-180 text-cyan"
              )}
            />
          </button>
        </div>

        {isOpen && (
          <div
            id={id ? `${id}-listbox` : undefined}
            role="listbox"
            className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-52 overflow-y-auto rounded-[8px] border border-line bg-card p-1 shadow-lg font-sans text-ink animate-in fade-in-0 zoom-in-95 duration-100"
          >
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-center text-xs text-muted">
                No matching presets. Custom text will be saved.
              </div>
            ) : (
              <ul ref={listRef} className="space-y-0.5">
                {filteredOptions.map((opt, index) => {
                  const isSelected =
                    value.trim().toLowerCase() === opt.value.toLowerCase();
                  const isHighlighted = highlightedIndex === index;

                  return (
                    <li
                      key={opt.value}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelectOption(opt.value)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-[5px] px-2.5 py-1.5 text-xs cursor-pointer select-none transition-colors",
                        isHighlighted && "bg-canvas text-ink",
                        isSelected && "bg-cyan-soft/60 text-cyan font-semibold"
                      )}
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="truncate">{opt.label || opt.value}</span>
                        {opt.description && (
                          <span
                            className={cn(
                              "text-[10px] truncate",
                              isSelected ? "text-cyan/80" : "text-muted"
                            )}
                          >
                            {opt.description}
                          </span>
                        )}
                      </div>

                      {isSelected && (
                        <Check
                          size={14}
                          weight="bold"
                          className="shrink-0 text-cyan"
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  }
);

TypeableCombobox.displayName = "TypeableCombobox";
