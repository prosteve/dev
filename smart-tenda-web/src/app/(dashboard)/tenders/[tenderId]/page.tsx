import React from 'react'

export default function TenderDetail({ params }: { params: { tenderId: string } }) {
  return (
    <div>
      <h2 className="text-xl font-semibold">Tender {params.tenderId}</h2>
      <p className="mt-4">Checklist and details will be here.</p>
    </div>
  )
}
