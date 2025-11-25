"use client"

import React, { useEffect, useRef, useState } from "react"
import { Upload, X, File as FileIcon } from "lucide-react"

export interface UploadedFile {
  fileName: string
  fileUrl: string
  size: number
  publicId?: string
}

type UploadStatus = "idle" | "uploading" | "done" | "error"

interface LocalFile {
  id: string
  file: File
  name: string
  size: number
  status: UploadStatus
  progress: number // 0-100
  url?: string
  publicId?: string
  error?: string
}

interface Props {
  onChange?: (files: UploadedFile[]) => void
  value?: UploadedFile[] // optional initial uploaded files
}

const ResumeInput: React.FC<Props> = ({ onChange, value = [] }) => {
  const [localFiles, setLocalFiles] = useState<LocalFile[]>(
    () =>
      (value || []).map((v, i) => ({
        id: `init-${i}`,
        // create a placeholder File object (not necessary but keeps shape consistent)
        file: new File([new Blob()], v.fileName),
        name: v.fileName,
        size: v.size ?? 0,
        status: "done",
        progress: 100,
        url: v.fileUrl,
        publicId: v.publicId,
      })) || []
  )
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Support common env patterns: Vite (import.meta.env) and Next.js (process.env)
  const CLOUD_NAME =
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME) ||
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
    process.env.VITE_CLOUDINARY_CLOUD_NAME

  const UPLOAD_PRESET =
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_CLOUDINARY_UPLOAD_PRESET) ||
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ||
    process.env.VITE_CLOUDINARY_UPLOAD_PRESET

  useEffect(() => {
    const uploaded: UploadedFile[] = localFiles
      .filter((f) => f.status === "done" && f.url)
      .map((f) => ({
        fileName: f.name,
        fileUrl: f.url as string,
        size: f.size,
        publicId: f.publicId,
      }))
    onChange?.(uploaded)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localFiles])

  const allowedMime = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true)
    if (e.type === "dragleave") setDragActive(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const dropped = Array.from(e.dataTransfer.files)
    processSelectedFiles(dropped)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    processSelectedFiles(selectedFiles)
    if (inputRef.current) inputRef.current.value = ""
  }

  const processSelectedFiles = (files: File[]) => {
    const valid = files.filter((f) => allowedMime.includes(f.type) || /\.(pdf|docx?|PDF|DOCX?)$/.test(f.name))
    if (valid.length === 0) return

    const newLocal: LocalFile[] = valid.map((f) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      file: f,
      name: f.name,
      size: f.size,
      status: "idle",
      progress: 0,
    }))

    setLocalFiles((prev) => {
      const updated = [...prev, ...newLocal]
      // start uploads for the newly added ones
      newLocal.forEach((lf) => uploadToCloudinary(lf))
      return updated
    })
  }

  const handleClick = () => inputRef.current?.click()

  const removeFile = (id: string) => {
    setLocalFiles((prev) => prev.filter((p) => p.id !== id))
  }

  const uploadToCloudinary = (local: LocalFile) => {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      console.error("Missing Cloudinary config:", { CLOUD_NAME, UPLOAD_PRESET })
      setLocalFiles((prev) =>
        prev.map((p) =>
          p.id === local.id ? { ...p, status: "error", error: "Missing Cloudinary config" } : p
        )
      )
      return
    }

    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`
    const fd = new FormData()
    fd.append("file", local.file)
    fd.append("upload_preset", UPLOAD_PRESET)

    const xhr = new XMLHttpRequest()
    xhr.open("POST", url)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100)
        setLocalFiles((prev) =>
          prev.map((p) =>
            p.id === local.id ? { ...p, progress: percent, status: "uploading" } : p
          )
        )
      }
    }

    xhr.onload = () => {
      try {
        const resp = JSON.parse(xhr.responseText)
        // Cloudinary returns public_id and secure_url (or url)
        if (xhr.status >= 200 && xhr.status < 300 && (resp.secure_url || resp.url)) {
          const secureUrl = resp.secure_url || resp.url
          const publicId = resp.public_id || resp.publicId || resp.publicID // defensive
          setLocalFiles((prev) =>
            prev.map((p) =>
              p.id === local.id
                ? { ...p, status: "done", progress: 100, url: secureUrl, publicId }
                : p
            )
          )
        } else {
          console.error("Cloudinary upload failed:", xhr.status, resp)
          setLocalFiles((prev) =>
            prev.map((p) =>
              p.id === local.id ? { ...p, status: "error", error: `Upload failed (${xhr.status})` } : p
            )
          )
        }
      } catch (err) {
        console.error("Invalid Cloudinary response", err, xhr.responseText)
        setLocalFiles((prev) =>
          prev.map((p) =>
            p.id === local.id ? { ...p, status: "error", error: "Invalid response from Cloudinary" } : p
          )
        )
      }
    }

    xhr.onerror = () => {
      console.error("XHR error while uploading", xhr)
      setLocalFiles((prev) =>
        prev.map((p) =>
          p.id === local.id ? { ...p, status: "error", error: "Network error" } : p
        )
      )
    }

    xhr.send(fd)
  }

  return (
    <div className="flex flex-col w-full gap-3">
      <label className="text-sm font-medium text-[#1C1C1C]">
        Resume/CV
        <span className="text-red-500 ml-1">*</span>
      </label>

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`relative flex flex-col items-center justify-center w-full px-6 py-12 border-fade border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 ${
          dragActive
            ? "border-blue-500 bg-blue-50"
            : "border-[#D9D9D9] bg-[#F9F9F9] hover:border-[#B0B0B0] hover:bg-[#F5F5F5]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleChange}
          className="hidden"
          aria-label="Resume file input"
        />

        <div className="flex flex-col items-center gap-2 pointer-events-none">
          <div className="rounded-full bg-white p-3 shadow-sm">
            <Upload size={24} className={`${dragActive ? "text-blue-500" : "text-[#1C1C1C]"}`} />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-[#1C1C1C]">
              {dragActive ? "Drop your files here" : "Drag & drop your resume here"}
            </p>
            <p className="text-xs text-[#1C1C1CBF] mt-1">or click to browse (PDF, DOC, DOCX)</p>
          </div>
        </div>
      </div>

      {localFiles.length > 0 && (
        <div className="flex flex-col gap-2 mt-2">
          <p className="text-xs font-medium text-[#1C1C1CBF]">
            {localFiles.length} file{localFiles.length !== 1 ? "s" : ""} selected
          </p>

          <div className="flex flex-col gap-2">
            {localFiles.map((f) => (
              <div key={f.id} className="flex items-center justify-between p-3 bg-[#F9F9F9] border border-fade rounded-lg">
                <div className="flex items-center gap-3 min-w-0">
                  <FileIcon size={18} className="text-[#1C1C1C] flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#1C1C1C] truncate">{f.name}</p>
                    <p className="text-xs text-[#1C1C1CBF]">
                      {(f.size / 1024).toFixed(2)} KB •{" "}
                      {f.status === "uploading" && `Uploading (${f.progress}%)`}
                      {f.status === "done" && "Uploaded"}
                      {f.status === "error" && `Error: ${f.error ?? "unknown"}`}
                    </p>
                    {f.status === "done" && f.url && (
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs block cursor-pointer mt-1 underline"
                      >
                        View file
                      </a>
                    )}
                   
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => removeFile(f.id)}
                    className="p-1 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                    aria-label={`Remove ${f.name}`}
                  >
                    <X size={18} className="text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ResumeInput
