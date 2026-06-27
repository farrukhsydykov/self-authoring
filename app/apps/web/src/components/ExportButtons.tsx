import { Button } from "./Button";

interface ExportButtonsProps {
  onExportMd?: () => void;
  onExportTxt?: () => void;
}

/** Pair of .md / .txt export buttons. */
export function ExportButtons({ onExportMd, onExportTxt }: ExportButtonsProps) {
  return (
    <div className="flex gap-2">
      <Button variant="secondary" className="flex-1" onClick={onExportMd}>
        Export .md
      </Button>
      <Button variant="secondary" className="flex-1" onClick={onExportTxt}>
        Export .txt
      </Button>
    </div>
  );
}
