"use client";

/**
 * Print / Save-as-PDF trigger for the Progress Report.
 *
 * Plain client button: invokes the browser's native print dialog (which on all
 * major platforms offers "Save as PDF"). Hidden from the printed output itself
 * via the `.no-print` utility so it never appears on the page/PDF.
 */
export default function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="btn no-print"
      onClick={() => window.print()}
      style={{ padding: "10px 18px", whiteSpace: "nowrap" }}
    >
      🖨️ {label}
    </button>
  );
}
