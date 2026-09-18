"use client"

import React, { useCallback } from "react"
import dynamic from "next/dynamic"
import "react-quill-new/dist/quill.snow.css"

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  readOnly?: boolean
  className?: string
}

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false })

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ color: [] }, { background: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    ["clean"],
  ],
  clipboard: {
    matchVisual: false,
  },
}

const formats = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "color",
  "background",
  "list",
]

const RichTextEditor = ({
  value,
  onChange,
  placeholder,
  disabled,
  readOnly,
  className,
}: RichTextEditorProps) => {
  const isReadOnly = disabled || readOnly

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      if (isReadOnly) return

      const plainText = e.clipboardData.getData("text/plain")
      if (!plainText) return

      e.preventDefault()
      e.stopPropagation()

      // Attempt to retrieve Quill instance directly from the DOM container element
      const targetEl = e.target as HTMLElement
      const containerEl = targetEl.closest?.(".ql-container") as any
      const quill = containerEl?.__quill

      if (quill) {
        const range = quill.getSelection(true)
        if (range) {
          if (range.length > 0) {
            quill.deleteText(range.index, range.length, "user")
          }
          quill.insertText(range.index, plainText, "user")
          // Enforce Normal Text style on inserted plain text lines
          quill.formatLine(range.index, plainText.length, "header", false, "user")
          quill.setSelection(range.index + plainText.length, 0, "user")
          return
        }
      }

      // Fallback native plain text insertion for contenteditable
      try {
        document.execCommand("insertText", false, plainText)
      } catch (err) {
        console.warn("Plain text paste fallback failed:", err)
      }
    },
    [isReadOnly]
  )

  return (
    <div
      onPasteCapture={handlePaste}
      className={`bg-white rounded-md ${isReadOnly ? "opacity-60 pointer-events-none" : ""} ${className || ""}`}
    >
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={isReadOnly ? { toolbar: false } : modules}
        formats={formats}
        placeholder={placeholder}
        readOnly={isReadOnly}
        className="min-h-[150px]"
      />
    </div>
  )
}

export default RichTextEditor


