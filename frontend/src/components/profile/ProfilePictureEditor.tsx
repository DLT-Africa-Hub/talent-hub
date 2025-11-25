import React, { useCallback, useEffect, useRef, useState } from "react"
import Cropper from "react-easy-crop"
import { Dialog } from "@headlessui/react"
import { Edit3, X } from "lucide-react"

type Props = {
  imageUrl?: string | null
  size?: number
  onUpload?: (file: Blob) => Promise<void> | void
}

export default function ProfilePictureEditor({ imageUrl, size = 150, onUpload }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [fileSrc, setFileSrc] = useState<string | null>(imageUrl || null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setFileSrc(imageUrl || null)
  }, [imageUrl])

  return (
    <div className="relative inline-block">
      <div
        className="rounded-[10px] overflow-hidden bg-gray-200 cursor-pointer relative group"
        style={{ width: size, height: size }}
      >
        <img
          src={fileSrc || "/placeholder-avatar.png"}
          className="w-full h-full object-cover"
        />

        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition"
        >
          <div className="opacity-0 group-hover:opacity-100 transition">
            <div className="bg-white rounded-full p-2 shadow">
              <Edit3 size={18} className="text-gray-700" />
            </div>
          </div>
        </button>
      </div>

      <ImageCropModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        initialImage={fileSrc}
        onImageSaved={(url) => setFileSrc(url)}
        onUpload={onUpload}
        inputRef={inputRef}
        previewSize={size}
      />
    </div>
  )
}

/* ------------ MODAL ------------ */

function ImageCropModal({
  isOpen,
  onClose,
  initialImage,
  onImageSaved,
  onUpload,
  inputRef,
  previewSize = 150,
}: any) {
  const [imageSrc, setImageSrc] = useState<string | null>(initialImage)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setImageSrc(initialImage)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
    }
  }, [initialImage, isOpen])

  const handleClose = () => {
    setImageSrc(initialImage)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    onClose()
  }

  const onCropComplete = useCallback((_: any, areaPixels: any) => {
    setCroppedAreaPixels(areaPixels)
  }, [])

  const onSelectFile = async (e: any) => {
    if (e.target.files?.length) {
      const file = e.target.files[0]
      const url = await readFile(file)
      setImageSrc(url as string)

      setCrop({ x: 0, y: 0 })
      setZoom(1)
    }
  }

  const doUpload = async () => {
    if (!imageSrc || !croppedAreaPixels) return
    setIsUploading(true)

    const blob = await getCroppedImg(imageSrc, croppedAreaPixels)
    await onUpload?.(blob)

    const preview = URL.createObjectURL(blob)

    // ✅ ONLY update main profile AFTER saving
    onImageSaved?.(preview)

    setIsUploading(false)
    onClose()
  }

  return (
    <Dialog open={isOpen} onClose={handleClose} className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" />

      <div className="relative w-[95%] max-w-3xl bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold">Edit Profile Picture</h3>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-4">
          <div className="relative w-full h-[420px] bg-gray-100 rounded-md overflow-hidden">
            {imageSrc ? (
              <>
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />

                <div
                  className="pointer-events-none absolute rounded-full border-[3px] border-white shadow"
                  style={{
                    width: previewSize,
                    height: previewSize,
                    left: "50%",
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                  }}
                />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm">
                No image selected
                <button className="mt-3 border px-3 py-1 rounded" onClick={() => inputRef.current?.click()}>
                  Choose File
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <p className="text-sm text-gray-600">Preview</p>
              <div
                className="rounded-full overflow-hidden border mx-auto"
                style={{ width: previewSize, height: previewSize }}
              >
                {imageSrc ? (
                  <PreviewCanvas imageSrc={imageSrc} cropPixels={croppedAreaPixels} size={previewSize} />
                ) : (
                  <div className="flex items-center justify-center text-xs text-gray-400 h-full">
                    No preview
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-600">Zoom</label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onSelectFile} />

            <div className="flex gap-2 mt-auto">
              <button className="border px-4 py-2 rounded" onClick={() => inputRef.current?.click()}>
                Choose File
              </button>

              <button
                className="ml-auto bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60"
                disabled={!imageSrc || isUploading}
                onClick={doUpload}
              >
                {isUploading ? "Uploading..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  )
}

/* ------------ PREVIEW CANVAS ------------- */

function PreviewCanvas({ imageSrc, cropPixels, size }: any) {
  const ref = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!cropPixels) return
    ;(async () => {
      const img = await createImage(imageSrc)
      const canvas = ref.current
      const ctx = canvas?.getContext("2d")
      if (!canvas || !ctx) return

      canvas.width = size
      canvas.height = size

      ctx.clearRect(0, 0, size, size)
      ctx.drawImage(
        img,
        cropPixels.x,
        cropPixels.y,
        cropPixels.width,
        cropPixels.height,
        0,
        0,
        size,
        size
      )
    })()
  }, [cropPixels, imageSrc])

  return <canvas ref={ref} className="w-full h-full" />
}

/* ------------ HELPERS ------------- */

function readFile(file: File) {
  return new Promise((res) => {
    const reader = new FileReader()
    reader.onload = () => res(reader.result)
    reader.readAsDataURL(file)
  })
}

function createImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

async function getCroppedImg(src: string, crop: any): Promise<Blob> {
  const img = await createImage(src)
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")!

  canvas.width = crop.width
  canvas.height = crop.height

  ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height)

  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.9)
  )
}
