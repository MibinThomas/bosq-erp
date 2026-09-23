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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function sanitizePastedContent(html?: string | null, plainText?: string | null): string {
  // If plainText only or html is empty
  if (!html || !html.trim()) {
    if (!plainText || !plainText.trim()) return ""
    const normalized = plainText.replace(/\r\n/g, "\n").trim()
    const lines = normalized.split("\n")

    let inList: "ul" | "ol" | null = null
    let result = ""

    lines.forEach((line) => {
      const trimmedLine = line.trim()
      if (!trimmedLine) {
        if (inList) {
          result += `</${inList}>`
          inList = null
        }
        return
      }

      // Check for bullet points (•, -, *, etc.)
      const bulletMatch = trimmedLine.match(/^([•\-\*]|[\u2022\u2023\u25E6\u2043\u2219])\s*(.+)/)
      const numMatch = trimmedLine.match(/^(\d+[\.\)])\s*(.+)/)

      if (bulletMatch) {
        if (inList === "ol") {
          result += "</ol>"
          inList = null
        }
        if (!inList) {
          result += "<ul>"
          inList = "ul"
        }
        result += `<li>${escapeHtml(bulletMatch[2])}</li>`
      } else if (numMatch) {
        if (inList === "ul") {
          result += "</ul>"
          inList = null
        }
        if (!inList) {
          result += "<ol>"
          inList = "ol"
        }
        result += `<li>${escapeHtml(numMatch[2])}</li>`
      } else {
        if (inList) {
          result += `</${inList}>`
          inList = null
        }
        result += `<p>${escapeHtml(trimmedLine)}</p>`
      }
    })

    if (inList) {
      result += `</${inList}>`
    }

    return result || `<p>${escapeHtml(normalized)}</p>`
  }

  // HTML content exists (from Word, Excel, Web)
  let clean = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<xml[^>]*>[\s\S]*?<\/xml>/gi, "")
    .replace(/<meta[^>]*>/gi, "")
    .replace(/<link[^>]*>/gi, "")

  // Convert Word MsoListParagraph into <li> elements
  clean = clean.replace(/<p[^>]*class=["']?[^"']*MsoListParagraph[^"']*["']?[^>]*>[\s\S]*?<\/p>/gi, (match) => {
    const text = match.replace(/<[^>]+>/g, "").replace(/^[\s•\-\*\d\.\)]+/, "").trim()
    return `<li>${escapeHtml(text)}</li>`
  })

  // Strip Word mso- inline styles, font-family, font-size while preserving basic formatting
  clean = clean.replace(/style=["']([^"']+)["']/gi, (full, styleStr) => {
    const keptStyles: string[] = []
    const styles = styleStr.split(";")
    styles.forEach((s: string) => {
      const [key, val] = s.split(":").map((part) => part?.trim())
      if (!key || !val) return
      const lKey = key.toLowerCase()
      if (lKey === "color" || lKey === "background-color" || lKey === "font-weight" || lKey === "text-decoration") {
        keptStyles.push(`${lKey}: ${val}`)
      }
    })
    return keptStyles.length > 0 ? `style="${keptStyles.join("; ")}"` : ""
  })

  // Wrap loose <li> items in <ul> if needed
  if (/<li\b/i.test(clean) && !/<(ul|ol)\b/i.test(clean)) {
    clean = `<ul>${clean}</ul>`
  }

  return clean
}

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

      const html = e.clipboardData.getData("text/html")
      const plainText = e.clipboardData.getData("text/plain")

      if (!html && !plainText) return

      e.preventDefault()
      e.stopPropagation()

      const sanitizedHtml = sanitizePastedContent(html, plainText)

      // Attempt to retrieve Quill instance directly from the DOM container element
      const targetEl = e.target as HTMLElement
      const containerEl = targetEl.closest?.(".ql-container") as any
      const quill = containerEl?.__quill

      if (quill && sanitizedHtml) {
        const range = quill.getSelection(true)
        const index = range ? range.index : quill.getLength()
        if (range && range.length > 0) {
          quill.deleteText(range.index, range.length, "user")
        }
        quill.clipboard.dangerouslyPasteHTML(index, sanitizedHtml, "user")
        return
      }

      // Fallback native insertion for contenteditable
      try {
        if (sanitizedHtml) {
          document.execCommand("insertHTML", false, sanitizedHtml)
        } else if (plainText) {
          document.execCommand("insertText", false, plainText)
        }
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


