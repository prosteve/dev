import React from 'react'

export default function ChecklistGauge({ checks }: { checks: any[] }) {
  const pass = checks?.filter((c) => c.status === 'PASS').length || 0
  const total = checks?.length || 0
  const score = total ? Math.round((pass / total) * 100) : 0
  return (
    <div className="p-4 border rounded-md bg-white">
      <div className="text-3xl font-bold">{score}%</div>
      <div className="h-2 bg-gray-200 rounded mt-2">
        <div style={{ width: `${score}%` }} className="h-full bg-green-500 rounded" />
      </div>
      {score < 75 && <p className="text-red-600">No-Go – fix items below</p>}
      {score >= 90 && <p className="text-green-600">Go – ready to submit</p>}
    </div>
  )
}
