import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ImageIcon,
  ExternalLink,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

export interface PreviewInfo {
  label: string;
  url: string;
  // Optional — any of these will be shown in the header if provided
  docKey?: string;
  nic?: string;
  customerCode?: string;
  bankName?: string;
  bankAccountNo?: string;
  bankAccountType?: string;
  category?: string; // ← NEW (for expenses)
  amount?: number; // ← NEW (for expenses)
}

interface PreviewDialogProps {
  preview: PreviewInfo | null;
  onClose: () => void;
  rotation: number;
  setRotation: (fn: (r: number) => number) => void;
  zoom: number;
  setZoom: (fn: (z: number) => number) => void;
}

const PreviewDialog = ({
  preview,
  onClose,
  rotation,
  setRotation,
  zoom,
  setZoom,
}: PreviewDialogProps) => {
  return (
    <Dialog open={!!preview} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl p-0 overflow-hidden">
        <DialogHeader className="px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="flex items-center gap-2 text-sm font-bold">
              <ImageIcon className="w-4 h-4 text-primary" />
              <span className="truncate">
                {preview?.label}

                {/* NIC */}
                {preview?.docKey === "customer_id_copy" && preview?.nic && (
                  <span className="font-mono text-gray-500 ml-2">
                    — {preview.nic}
                  </span>
                )}

                {/* Loan docs */}
                {[
                  "loan_agreement",
                  "loan_agreement_2",
                  "application_form",
                  "application_form_2",
                ].includes(preview?.docKey || "") &&
                  preview?.customerCode && (
                    <span className="font-mono text-gray-500 ml-2">
                      — {preview.customerCode}
                    </span>
                  )}

                {/* Bank passbook */}
                {preview?.docKey === "bank_passbook" && preview?.bankName && (
                  <span className="font-semibold text-gray-900 ml-2 text-base">
                    — {preview.bankName}
                    {preview.bankAccountNo && (
                      <span className="font-bold text-gray-900 ml-2 text-base">
                        (
                        {preview.bankAccountType
                          ? preview.bankAccountType + " "
                          : ""}
                        {preview.bankAccountNo})
                      </span>
                    )}
                  </span>
                )}

                {/* ── NEW: Expense category + amount ── */}
                {preview?.category && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                    {preview.category}
                  </span>
                )}
                {typeof preview?.amount === "number" && (
                  <span className="ml-2 text-sm font-bold text-gray-900">
                    Rs.{" "}
                    {Number(preview.amount).toLocaleString("en-LK", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                )}
              </span>
            </DialogTitle>

            {preview?.url && (
              <div className="flex items-center gap-1.5 mt-1 mr-8">
                <a
                  href={preview.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors ml-5"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open
                </a>
              </div>
            )}
          </div>
        </DialogHeader>

        {preview && (
          <div className="relative">
            {/* Rotate/zoom controls — images only */}
            {!preview.url.toLowerCase().endsWith(".pdf") && (
              <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setRotation((r) => r - 90)}
                  className="inline-flex items-center gap-1 rounded-md bg-white/95 backdrop-blur border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-white transition-colors"
                  title="Rotate left 90°"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Left
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((r) => r + 90)}
                  className="inline-flex items-center gap-1 rounded-md bg-white/95 backdrop-blur border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-white transition-colors"
                  title="Rotate right 90°"
                >
                  <RotateCw className="w-3.5 h-3.5" /> Right
                </button>
                {rotation !== 0 && (
                  <button
                    type="button"
                    onClick={() => setRotation(() => 0)}
                    className="inline-flex items-center gap-1 rounded-md bg-white/95 backdrop-blur border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-500 shadow-sm hover:bg-white transition-colors"
                  >
                    Reset
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(1, z - 0.25))}
                  disabled={zoom <= 1}
                  className="inline-flex items-center gap-1 rounded-md bg-white/95 backdrop-blur border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-white transition-colors disabled:opacity-50"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
                  disabled={zoom >= 4}
                  className="inline-flex items-center gap-1 rounded-md bg-white/95 backdrop-blur border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-white transition-colors disabled:opacity-50"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                {zoom !== 1 && (
                  <span className="text-[10px] text-white/80 bg-black/40 rounded px-1.5 py-0.5">
                    {Math.round(zoom * 100)}%
                  </span>
                )}
                {rotation !== 0 && (
                  <span className="text-[10px] text-white/80 bg-black/40 rounded px-1.5 py-0.5">
                    {rotation}°
                  </span>
                )}
              </div>
            )}

            {/* Preview area */}
            <div className="max-h-[75vh] overflow-auto bg-gray-900 flex">
              {preview.url.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={preview.url}
                  className="w-full h-[75vh] bg-white"
                  title={preview.label}
                />
              ) : (
                <img
                  src={preview.url}
                  alt={preview.label}
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    ...(zoom !== 1 && {
                      width: `${zoom * 100}%`,
                      maxWidth: "none",
                      maxHeight: "none",
                    }),
                  }}
                  className="m-auto max-w-full max-h-[75vh] object-contain transition-transform duration-200"
                />
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PreviewDialog;
