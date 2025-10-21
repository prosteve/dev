import React from 'react'

export default function TenderCard({ tender }: { tender: any }) {
  return (
    <div className="p-4 border rounded-md bg-white">
      <h3 className="font-semibold">{tender?.title || 'Untitled'}</h3>
      <p className="text-sm text-muted-foreground">Ref: {tender?.refNo}</p>
    </div>
  )
}
