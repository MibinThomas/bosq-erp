"use client"

import React, { useCallback, useRef } from "react"
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

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false }) as any

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

function formatKeyValueText(str: string): string {
  const match = str.match(/^([A-Za-z0-9\s\/\-\(\)]+):\s*(.+)$/)
  if (match && match[1].length < 40) {
    return `<strong>${escapeHtml(match[1])}:</strong> ${escapeHtml(match[2])}`
  }
  return escapeHtml(str)
}

export function cleanPastedContent(html?: string | null, plainText?: string | null): string {
  // 1. If HTML content exists (from Word, Excel, Web, Notion, Google Docs)
  if (html && html.trim()) {
    let raw = html

    // Remove Word comments, conditional comments, XML, scripts, styles, meta, head, html, body
    raw = raw.replace(/<!--[\s\S]*?-->/g, "")
    raw = raw.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    raw = raw.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    raw = raw.replace(/<xml[^>]*>[\s\S]*?<\/xml>/gi, "")
    raw = raw.replace(/<meta[^>]*>/gi, "")
    raw = raw.replace(/<link[^>]*>/gi, "")
    raw = raw.replace(/<title[^>]*>[\s\S]*?<\/title>/gi, "")
    raw = raw.replace(/<\/?(html|head|body)[^>]*>/gi, "")

    // Convert Word MsoListParagraph into <li> elements
    raw = raw.replace(/<p[^>]*class=["']?[^"']*MsoListParagraph[^"']*["']?[^>]*>([\s\S]*?)<\/p>/gi, (_, content) => {
      const cleanContent = content
        .replace(/<span[^>]*>[•\*\u2022\u2023\u25E6\u2043\u2219\-\s\u00a0&nbsp;\d\.\)]*<\/span>/gi, "")
        .replace(/^\s*([•\*\u2022\u2023\u25E6\u2043\u2219\-]|(\d+[\.\)]))\s*/, "")
        .trim()
      return `<li>${cleanContent}</li>`
    })

    // Convert Excel/HTML tables into clean line paragraphs
    if (/<table\b/i.test(raw)) {
      raw = raw.replace(/<tr[^>]*>([\s\S]*?)<\/tr>/gi, (_, rowContent) => {
        const cellContents: string[] = []
        rowContent.replace(/<td[^>]*>([\s\S]*?)<\/td>/gi, (__: string, cellText: string) => {
          const trimmed = cellText.replace(/<[^>]+>/g, "").trim()
          if (trimmed) cellContents.push(trimmed)
          return ""
        })
        if (cellContents.length > 0) {
          return `<p>${cellContents.join(" - ")}</p>`
        }
        return ""
      })
      raw = raw.replace(/<\/?(table|tbody|thead|tfoot|tr|td|th)[^>]*>/gi, "")
    }

    // Strip redundant leading bullet symbols (•, -, *, etc.) inside <li> tags
    raw = raw.replace(/<li([^>]*)>([\s\S]*?)<\/li>/gi, (_, attrs, content) => {
      let cleaned = content
        .replace(/<span[^>]*>[•\*\u2022\u2023\u25E6\u2043\u2219\-\s\u00a0&nbsp;\d\.\)]*<\/span>/gi, "")
        .replace(/^\s*([•\*\u2022\u2023\u25E6\u2043\u2219\-]|(\d+[\.\)]))\s*/, "")
        .trim()
      return `<li${attrs}>${cleaned}</li>`
    })

    // Strip dirty inline styles (font-family, font-size, line-height, margin, padding, mso-*)
    raw = raw.replace(/style=["']([^"']+)["']/gi, (full, styleStr) => {
      const keptStyles: string[] = []
      styleStr.split(";").forEach((rule: string) => {
        const [key, val] = rule.split(":").map((s) => s?.trim())
        if (!key || !val) return
        const lKey = key.toLowerCase()
        if (
          lKey === "color" ||
          lKey === "background-color" ||
          lKey === "font-weight" ||
          lKey === "text-decoration"
        ) {
          keptStyles.push(`${lKey}: ${val}`)
        }
      })
      return keptStyles.length > 0 ? `style="${keptStyles.join("; ")}"` : ""
    })
    raw = raw.replace(/\s*style=""/gi, "")

    // Convert loose <div> elements to <p>
    raw = raw.replace(/<div[^>]*>([\s\S]*?)<\/div>/gi, "<p>$1</p>")

    // Wrap orphan <li> tags in <ul> if not enclosed in <ul> or <ol>
    if (/<li\b/i.test(raw) && !/<(ul|ol)\b/i.test(raw)) {
      raw = `<ul>${raw}</ul>`
    }

    // Remove empty paragraphs and collapse whitespace between tags
    raw = raw.replace(/<p>\s*(<br\s*\/?>)?\s*<\/p>/gi, "")
    raw = raw.replace(/>\s*</g, "><")

    if (raw.trim()) {
      return raw.trim()
    }
  }

  // 2. Fallback to Plain Text processing if HTML is empty
  if (plainText && plainText.trim()) {
    const lines = plainText.replace(/\r\n/g, "\n").split("\n")
    let inList: "ul" | "ol" | null = null
    let result = ""

    lines.forEach((line) => {
      const trimmed = line.trim()
      if (!trimmed) {
        if (inList) {
          result += `</${inList}>`
          inList = null
        }
        return
      }

      const bulletMatch = trimmed.match(/^([•\*\u2022\u2023\u25E6\u2043\u2219\-]|(\d+[\.\)]))\s*(.+)/)
      const numMatch = trimmed.match(/^(\d+[\.\)])\s*(.+)/)

      if (bulletMatch) {
        if (inList === "ol") {
          result += "</ol>"
          inList = null
        }
        if (!inList) {
          result += "<ul>"
          inList = "ul"
        }
        result += `<li>${formatKeyValueText(bulletMatch[3] || bulletMatch[2])}</li>`
      } else if (numMatch) {
        if (inList === "ul") {
          result += "</ul>"
          inList = null
        }
        if (!inList) {
          result += "<ol>"
          inList = "ol"
        }
        result += `<li>${formatKeyValueText(numMatch[2])}</li>`
      } else {
        if (inList) {
          result += `</${inList}>`
          inList = null
        }
        result += `<p>${formatKeyValueText(trimmed)}</p>`
      }
    })

    if (inList) {
      result += `</${inList}>`
    }

    return result || `<p>${escapeHtml(plainText.trim())}</p>`
  }

  return ""
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
  const quillRef = useRef<any>(null)

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      if (isReadOnly) return

      const html = e.clipboardData.getData("text/html")
      const plainText = e.clipboardData.getData("text/plain")

      if (!html && !plainText) return

      e.preventDefault()
      e.stopPropagation()

      const sanitizedHtml = cleanPastedContent(html, plainText)
      if (!sanitizedHtml) return

      // Retrieve Quill editor instance reliably from ReactQuill ref or DOM container
      const container = (e.target as HTMLElement).closest(".ql-container") as (HTMLElement & { __quill?: any }) | null
      const quill = quillRef.current?.getEditor
        ? quillRef.current.getEditor()
        : container?.__quill

      if (quill) {
        const range = quill.getSelection(true)
        const index = range ? range.index : quill.getLength()
        if (range && range.length > 0) {
          quill.deleteText(range.index, range.length, "user")
        }
        quill.clipboard.dangerouslyPasteHTML(index, sanitizedHtml, "user")
      } else {
        try {
          document.execCommand("insertHTML", false, sanitizedHtml)
        } catch (err) {
          console.warn("Paste insertion fallback failed:", err)
        }
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
        ref={quillRef}
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
