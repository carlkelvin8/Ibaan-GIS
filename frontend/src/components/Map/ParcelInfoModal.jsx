// frontend/src/components/Map/ParcelInfoModal.jsx
import React, { useEffect } from "react";

export default function ParcelInfoModal({ open, onClose, data, onOpenTax }) {
  if (!open) return null;
  const p = data || {};

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const Row = ({ label, value }) =>
    value != null && String(value).trim() !== "" ? (
      <div className="grid grid-cols-2 gap-1 text-[13px]">
        <div className="font-semibold text-slate-600">{label}:</div>
        <div className="text-slate-800 break-words">{value}</div>
      </div>
    ) : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[2000] flex items-center justify-center"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Card */}
      <div className="relative w-[560px] max-w-[92vw] rounded-2xl bg-white shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="text-[15px] font-bold text-sky-800">
            {p.BarangayNa || "Parcel Information"}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-slate-300 hover:bg-slate-50 active:scale-95"
            aria-label="Close"
            title="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Row label="Parcel ID" value={p.ParcelId} />
            <Row label="Lot" value={p.LotNumber} />
            <Row label="Block" value={p.BlockNumber} />
            <Row label="Area" value={p.Area} />
            <Row label="Claimant" value={p.Claimant} />
            <Row label="Tie Point" value={p.TiePointNa} />
            <Row label="Survey Plan" value={p.SurvayPlan} />
            <Row label="Survey ID" value={p.SurveyId} />
          </div>

          {(p.Tax_Amount || p.Due_Date || p.AmountPaid || p.Date_paid) && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              <div className="font-semibold text-sky-800 mb-2">Tax Information</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[13px]">
                <Row label="Tax Amount" value={p.Tax_Amount && `₱${parseFloat(p.Tax_Amount).toLocaleString()}`} />
                <Row label="Due Date" value={p.Due_Date && new Date(p.Due_Date).toLocaleDateString()} />
                <Row label="Amount Paid" value={p.AmountPaid && `₱${parseFloat(p.AmountPaid).toLocaleString()}`} />
                <Row label="Date Paid" value={p.Date_paid && new Date(p.Date_paid).toLocaleDateString()} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-200 flex flex-col sm:flex-row gap-2 sm:gap-3 justify-end">
          <button
            onClick={onOpenTax}
            className="px-4 py-2 rounded-lg font-semibold text-white bg-sky-700 hover:bg-sky-800 active:scale-[.98]"
          >
            View Tax Form
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg font-semibold border border-slate-300 hover:bg-slate-50 active:scale-[.98]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


