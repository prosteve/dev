import React from 'react'

export default function PdfMergeButton({ onDone }: { onDone?: () => void }) {
  return (
    <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={() => onDone?.()}>
      Export PDF
    </button>
  )
}
