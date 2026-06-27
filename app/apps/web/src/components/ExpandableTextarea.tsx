import { useEffect, useRef } from "react";

interface ExpandableTextareaProps {
  value: string;
  onChange: (value: string) => void;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  collapsedRows?: number;
  className?: string;
}

/** Textarea that expands when expanded is true (focus or explicit toggle). */
export function ExpandableTextarea({
  value,
  onChange,
  expanded,
  onExpandedChange,
  collapsedRows = 4,
  className = "",
}: ExpandableTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!expanded) {
      el.style.height = "";
      return;
    }
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, collapsedRows * 24)}px`;
  }, [value, expanded, collapsedRows]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => onExpandedChange(true)}
      onBlur={() => onExpandedChange(false)}
      rows={expanded ? undefined : collapsedRows}
      className={`textarea-field mt-2 resize-none overflow-hidden transition-[min-height] duration-200 ${
        expanded ? "min-h-[12rem]" : ""
      } ${className}`}
    />
  );
}
