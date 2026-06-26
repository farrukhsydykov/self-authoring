import { downloadFile, formatOceanExport } from "../lib/export";
import type { OceanScores } from "@self-authoring/shared";
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

/** Export buttons for OCEAN results. */
export function OceanExportButtons({
  scores,
  createdAt,
}: {
  scores: OceanScores;
  createdAt: string;
}) {
  return (
    <ExportButtons
      onExportMd={() =>
        downloadFile(formatOceanExport(scores, createdAt, "md"), "ocean-results.md")
      }
      onExportTxt={() =>
        downloadFile(formatOceanExport(scores, createdAt, "txt"), "ocean-results.txt")
      }
    />
  );
}
