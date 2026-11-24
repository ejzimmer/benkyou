import { ClipboardIcon } from "../../ui/ClipboardIcon"
import "./PasteImageButton.css"

type Props = {
  onPasteImages: (files: File[]) => void
  onPasteFailed: (message: string) => void
}

async function readImageFilesFromClipboard(): Promise<File[]> {
  const files: File[] = []
  for (const item of await navigator.clipboard.read()) {
    const imageType = item.types.find((type) => type.startsWith("image/"))
    if (!imageType) continue
    const blob = await item.getType(imageType)
    files.push(new File([blob], "clipboard-image", { type: imageType }))
  }
  return files
}

export function PasteImageButton({ onPasteImages, onPasteFailed }: Props) {
  if (typeof navigator.clipboard?.read !== "function") return null

  async function pasteImagesFromClipboard() {
    let files: File[]
    try {
      files = await readImageFilesFromClipboard()
    } catch {
      onPasteFailed("クリップボードを読み取れませんでした。")
      return
    }
    if (files.length === 0) {
      onPasteFailed("クリップボードに画像がありません。")
      return
    }
    onPasteImages(files)
  }

  return (
    <button
      type="button"
      className="image-preview-add paste-image-button"
      onClick={() => void pasteImagesFromClipboard()}
      aria-label="クリップボードから画像を貼り付け"
      title="クリップボードから画像を貼り付け"
    >
      <span
        className="btn secondary icon add-card-btn paste-image-button-icon"
        aria-hidden="true"
      >
        <ClipboardIcon />
      </span>
    </button>
  )
}
