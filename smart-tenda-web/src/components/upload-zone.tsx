import React from 'react'
import { useDropzone } from 'react-dropzone'
import axios from 'axios'

export default function UploadZone({ type, onSuccess }: { type: string; onSuccess?: () => void }) {
  const { getRootProps, getInputProps } = useDropzone({
    maxFiles: 1,
    onDrop: async (files: File[]) => {
      try {
        // prototype: call presign endpoint (requires backend) - stubbed here
        const form = new FormData()
        form.append('file', files[0])
        await axios.post('/api/upload-proto', form)
        onSuccess?.()
      } catch (e) {
        console.error(e)
      }
    },
  })
  return (
    <div {...getRootProps()} className="border-dashed border-2 p-8 text-center cursor-pointer">
      <input {...getInputProps()} />
      <p>Drag {type} PDF here</p>
    </div>
  )
}
