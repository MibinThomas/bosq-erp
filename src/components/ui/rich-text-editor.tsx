"use client"

import React from "react"
import dynamic from "next/dynamic"
import "react-quill-new/dist/quill.snow.css"

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  readOnly?: boolean
}

export const FONT_FAMILIES = [
  "arial",
  "calibri",
  "helvetica",
  "times-new-roman",
  "poppins",
  "roboto",
]

export const FONT_SIZES = [
  "8pt",
  "10pt",
  "12pt",
  "14pt",
  "16pt",
  "18pt",
  "20pt",
  "24pt",
]

const ReactQuill = dynamic(
  async () => {
    const { default: RQ, Quill } = await import("react-quill-new")

    // Use style attributors so Quill outputs inline CSS (e.g. style="font-family: Arial; font-size: 14pt;")
    const FontAttributor = Quill.import("attributors/style/font") as any
    if (FontAttributor) {
      FontAttributor.whitelist = FONT_FAMILIES
      Quill.register(FontAttributor, true)
    }

    const SizeAttributor = Quill.import("attributors/style/size") as any
    if (SizeAttributor) {
      SizeAttributor.whitelist = FONT_SIZES
      Quill.register(SizeAttributor, true)
    }

    return RQ
  },
  { ssr: false }
)

const modules = {
  toolbar: [
    [{ font: FONT_FAMILIES }],
    [{ size: FONT_SIZES }],
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ color: [] }, { background: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    ["clean"],
  ],
}

const formats = [
  "font",
  "size",
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "color",
  "background",
  "list",
]

const RichTextEditor = ({ value, onChange, placeholder, disabled, readOnly }: RichTextEditorProps) => {
  const isReadOnly = disabled || readOnly
  return (
    <div className={`bg-white rounded-md ${isReadOnly ? "opacity-60 pointer-events-none" : ""}`}>
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
