import React from 'react'

export default function ExportPage({ params }: { params: { tenderId: string } }) {
  return (
    <div>
      <h3>Export PDF for {params.tenderId}</h3>
      <p>PDF generation placeholder.</p>
    </div>
  )
}
