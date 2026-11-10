// Short, customer-facing product descriptions for quotations, derived from a product's specification.
// One sentence: what the item is + its most relevant features; no internal notes or prices.
// Used by the app (product create/import, "Generate descriptions", quotation fallback) and by the
// price-list converters in scripts/ (via scripts/lib/short-descriptions.cjs). No imports: plain TS only.

const lower = (s?: string | null) => (s || "").toLowerCase()
const joinList = (parts: (string | false | null | undefined)[]) => {
  const p = parts.filter(Boolean) as string[]
  if (p.length <= 1) return p.join("")
  return `${p.slice(0, -1).join(", ")} and ${p[p.length - 1]}`
}
const sentence = (s: string) => {
  const t = s.replace(/\s+/g, " ").replace(/\s+([,.])/g, "$1").trim()
  return t ? t[0].toUpperCase() + t.slice(1).replace(/\.?$/, ".") : ""
}
/** Plain text from a specification that may contain HTML (rich-text editor). */
const plain = (s?: string | null) =>
  (s || "")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|div)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ")
    .trim()

// ---------- chairs ----------
function chairFeatures(spec: string): string[] {
  const t = lower(spec)
  const f: string[] = []

  // upholstery
  if (/genuine (napa )?leather|napa leather/.test(t)) f.push("genuine leather upholstery")
  else if (/leatherette|rexin|\bpu leather|premium pu\b|upholstery premium pu|\bpu chair\b/.test(t)) f.push("leatherette upholstery")
  else if (/mesh/.test(t) && /(cushion|foam|fabric|upholst)[^.]{0,30}seat|seat[^.]{0,40}(cushion|foam|fabric)/.test(t)) f.push("breathable mesh back and cushioned seat")
  else if (/mesh/.test(t)) f.push("breathable mesh")
  else if (/fabric/.test(t)) f.push("fabric upholstery")
  else if (/upholstered backrest and cushioned seat/.test(t)) f.push("upholstered back and cushioned seat")
  else if (/padded upholstered seat/.test(t)) f.push("padded upholstered seat")
  else if (/high resilience|moulded foam|molded foam/.test(t)) f.push("high-resilience foam cushioning")

  // mechanism
  if (/synchro|sychro|synchroni[sz]e/.test(t)) f.push(/4 (tilt )?lock|four[- ]level lock|4-position|four-position/.test(t) ? "synchro-tilt mechanism with 4 lock positions" : "synchro-tilt mechanism")
  else if (/knee[- ]tilt/.test(t)) f.push("knee-tilt recline mechanism")
  else if (/multi(-|\s)?(lock|function|mechanism|tilt)|3 locking position|three-position locking|4 lock multi/.test(t)) f.push("multi-lock tilt mechanism")
  else if (/(centre|center|standard)[- ]?(knee[- ])?tilt|tilt mechanism|one postion lock and tilt/.test(t)) f.push("tilt mechanism")
  else if (/360|rotat|swivel/.test(t) && /visitor|bowl|minimalist|multifunction chair/.test(t)) f.push("360° swivel")
  if (/seat depth|sliding seat|seat sliding/.test(t)) f.push("seat-depth adjustment")

  // arms
  if (/4d|4-way|four-way/.test(t)) f.push("4D adjustable arms")
  else if (/3d (adjustable )?arm|3-way adjustable arm|3d default armrest|3d armrest/.test(t)) f.push("3D adjustable arms")
  else if (/2d adjustable arm/.test(t)) f.push("2D adjustable arms")
  else if (/height adjustable armrest/.test(t)) f.push("height-adjustable arms")
  else if (/die-cast aluminium armrest/.test(t)) f.push("die-cast aluminium armrests")
  else if (/fixed (square design )?armrest|armrest fixed/.test(t)) f.push("fixed armrests")
  else if (/padded armrest|armrests?: leatherette|leatherette covered/.test(t)) f.push("padded armrests")

  // support
  if (/headrest|head support|neck support/.test(t)) f.push(/adjustable (headrest|neck)|headrest.*adjust|2d adjustable headrest|3d headrest|3 dimenssion adjustable headrest|lumbar and neck/.test(t) ? "adjustable headrest" : "headrest")
  if (/lumbar/.test(t)) f.push("lumbar support")

  // base / frame
  if (/cantilever/.test(t)) f.push(/chrome/.test(t) ? "chrome cantilever frame" : "tubular cantilever frame")
  else if (/bentwood/.test(t)) f.push("bentwood frame")
  else if (/alumin(i)?um|aliminuam|aluminuam/.test(t) && /base/.test(t)) f.push(/polished/.test(t) ? "polished aluminium five-star base" : "aluminium five-star base")
  else if (/chrome base|chromed base|metal frame in chrome/.test(t)) f.push("chrome base")
  else if (/nylon[^.]{0,20}base|base[^.]{0,20}nylon|nylon (foot)?base/.test(t)) f.push("nylon five-star base")
  else if (/metal base|steel base|powder coated/.test(t)) f.push("powder-coated metal base")
  return f
}

export function chairShortDescription({ chairType, spec }: { chairType?: string | null; spec?: string | null; modelName?: string | null }): string {
  const t = lower(spec)
  const type = lower(chairType)
  let noun: string
  if (/bar stool/.test(type)) noun = "Bar stool"
  else if (/lounge/.test(type)) noun = "Lounge chair"
  else if (/training/.test(type) || /writing tablet/.test(t)) noun = "Training chair with retractable writing tablet"
  else if (/stackable/.test(type) || /stackable/.test(t)) noun = "Stackable collaborative chair"
  else if (/visitor/.test(type)) noun = "Visitor chair"
  else if (/task/.test(type)) noun = "Task chair"
  else {
    const back = /high back/.test(type) ? "High-back" : /mid back/.test(type) ? "Mid-back" : /low back/.test(type) ? "Low-back" : ""
    const kind = /ergonomic|mesh chair/.test(t) && !/leather/.test(t) ? "ergonomic chair" : /executive|leather|napa/.test(t) ? "executive chair" : "office chair"
    noun = back ? `${back} ${kind}` : kind[0].toUpperCase() + kind.slice(1)
  }
  if (/footrest/.test(type)) noun += " with footrest"
  // Keep it to one readable line: the most relevant features first, up to ~150 characters
  const picked: string[] = []
  for (const feat of chairFeatures(spec || "")) {
    if (picked.length >= 5) break
    if (`${noun} with ${joinList([...picked, feat])}`.length > 150 && picked.length >= 3) break
    picked.push(feat)
  }
  if (!picked.length) return sentence(noun)
  // "Training chair with retractable writing tablet" already uses "with" — continue with a comma
  return sentence(/ with /.test(noun) ? `${noun}, ${joinList(picked)}` : `${noun} with ${joinList(picked)}`)
}

// ---------- accessories, pedestals, frames (stock lists) ----------
/** Returns null when the item isn't one of the recognised accessory/pedestal/frame families. */
export function stockItemShortDescription({ name, spec, colour }: { name: string; spec?: string | null; colour?: string | null }): string | null {
  const s = spec || ""
  const t = lower(s)
  const n = lower(name)
  const col = colour ? `, ${colour.toLowerCase()} finish` : ""
  const count = (re: RegExp) => (s.match(re) || [])[1]

  if (/socket flip tray|flip up with socket/.test(n + " " + t)) return sentence("Flip-up desk socket tray, 185 × 80 mm, with 2 universal power, 1 USB-A and 1 USB-C sockets and cable")
  if (/socket|charge station/.test(n)) {
    const parts: string[] = []
    const uni = count(/(\d)\s*[×x*]\s*universal power/i)
    const usb = count(/(\d)\s*[×x*]\s*usb charger/i)
    const cat = count(/(\d)\s*[×x*]\s*cat6/i) || (/1x cat6/i.test(s) ? "1" : null)
    if (/switch/.test(t)) parts.push("a switch")
    if (uni) parts.push(`${uni} universal power sockets`)
    if (usb) parts.push(`${usb} USB chargers${/65 ?w/i.test(s) ? " (65 W)" : /pd20w/i.test(s) ? " (USB-A + USB-C, 20 W PD)" : ""}`)
    if (cat) parts.push(`${cat} CAT6 data port${cat === "1" ? "" : "s"}`)
    if (/hdmi/.test(t)) parts.push("HDMI")
    if (/2\.2 ?m/.test(t)) parts.push("2.2 m UK cable")
    const kind = /charge station/.test(n) ? "Movable charging station" : /sliding/.test(n) ? "Sliding desk power module" : /flip cover/.test(n) ? "Flip-cover desk power module" : "Multi-function desk power module"
    return sentence(parts.length ? `${kind} with ${joinList(parts)}${col}` : `${kind}${col}`)
  }
  if (/hanging pedestal/.test(n)) {
    const d = /2-drawer|two drawers|2 drawer/.test(t + n) ? "2-drawer" : "1-drawer"
    return sentence(`${d} under-desk hanging pedestal in powder-coated cold-rolled steel with integrated key lock${col}`)
  }
  if (/metal pedestal|pedestal|metal cabinet/.test(n)) {
    if (/file drawer|filing/.test(t)) return sentence(`Mobile steel pedestal with 2 drawers and 1 A4/foolscap file drawer, lockable${col}`)
    if (/castor/.test(t)) return sentence(`3-drawer mobile steel pedestal with lock and handle-less design on nylon castors${col}`)
    return sentence(`3-drawer steel pedestal with smooth-glide drawers and central locking${col}`)
  }
  if (/coffee table/.test(t)) return sentence(`Powder-coated X-shape coffee table frame${col}`)
  if (/negotiation table frame/.test(t)) {
    if (/x shape/.test(t)) return sentence(`Powder-coated X-shape negotiation table frame${col}, 725 mm high`)
    const size = (s.match(/frame size:\s*([\d/]+)\s*\*\s*725/i) || [])[1]
    return sentence(`Powder-coated flat round-leg negotiation table frame${size ? ` for ${size.replace("/", " / ")} mm tops` : ""}, 725 mm high${col}`)
  }
  if (/corner table/.test(n)) return sentence(`Minimal office corner table with two horizontal shelves on a single leg${col}`)
  if (/flip/.test(n)) {
    const size = (s.match(/size\s*-?\s*([\dx]+)mm/i) || [])[1]
    if (/double side|soft clos/.test(t)) return sentence(`Double-sided flip-up desk box${size ? `, ${size.replace(/x/g, " × ")} mm` : ""}, with soft-close mechanism${col}`)
    return sentence(`Flip-up desk cable access tray${size ? `, ${size.replace(/x/g, " × ")} mm` : ""}${col}`)
  }
  if (/cable (management )?tray|wire manager/.test(t)) {
    const size = (s.match(/size\s*([\dx]+)mm/i) || [])[1]
    return sentence(`Under-desk cable management tray${size ? `, ${size.replace(/x/g, " × ")} mm` : ""}${col}`)
  }
  if (/snake/.test(t)) {
    const len = (s.match(/(\d{3,4})\s*mm length/i) || [])[1]
    const ha = /height adjustable/.test(t) ? ` for ${/double face/.test(t) ? "face-to-face " : ""}height-adjustable desks` : ""
    return sentence(`Vertical snake cable management spine${len ? `, ${len} mm long` : ""}${ha}${col}`)
  }
  if (/grommet/.test(t)) return sentence(`Round metal desk grommet cover${col}`)
  if (/height ad\w*stable/.test(t) && /frame/.test(t)) {
    if (/face-to-face|f2f/.test(t) || /f2f/.test(n)) return sentence(`Face-to-face electric height-adjustable desk frame for two users with independent sit-stand control${col}`)
    const l = /l shape/.test(t)
    return sentence(`${l ? "L-shape single-user" : "Single-user"} electric height-adjustable desk frame, dual motor, 3-stage${/memory/.test(t) ? ", with memory presets and USB charger" : ""}${col}`)
  }
  return null
}

// ---------- desks, tables, workstations, storage, panels (2026-27 price list) ----------
const MDF18 = "18mm melamine-faced MDF"
const MDF36 = "36mm melamine-faced MDF"

/** Returns null when the product isn't one of the recognised price-list families. */
export function priceListShortDescription({ model, layout, spec, size, round }: {
  model?: string | null
  layout?: string | null
  spec?: string | null
  size?: string | null
  round?: boolean
}): string | null {
  const s = spec || ""
  const t = lower(s)
  const m = lower(model)
  const lay = layout || ""

  if (/^reception/.test(m) || /^reception:/.test(t)) {
    return sentence(`Reception desk in ${MDF18} with PVC edging and under-counter storage with 3 lockable drawers${/led/.test(t) ? ", with LED lighting provision" : ""}`)
  }
  if (/storage cabinet/.test(t) && /^(low|medium|full) height/.test(t)) {
    const height = /^low/.test(t) ? "Low-height" : /^medium/.test(t) ? "Medium-height" : "Full-height"
    return sentence(`${height} storage cabinet${size ? `, ${size} mm,` : ""} in ${MDF18} with lockable swing doors on soft-close hinges`)
  }
  if (/^planted box/.test(t)) return sentence(`Planter box unit${size ? `, ${size} mm,` : ""} in ${MDF18} with a lockable soft-close storage shutter`)
  if (/^fabric partition/.test(t)) return sentence(`12mm fabric-finished desk partition panel${size ? `, ${size} mm` : ""}, clamps included`)
  if (/^modesty panel/.test(t)) return sentence(`${MDF18} modesty panel${size ? `, ${size} mm` : ""}, clamps included`)

  const tableSize = lay.replace(/^Table /, "")
  if (/^executive table – series 1/.test(m)) return sentence(`Executive desk ${tableSize} mm in ${MDF18} with matching side return: 3 drawers and a lockable swing shutter`)
  if (/^executive table – series 2/.test(m)) return sentence(`Executive desk ${tableSize} mm with ${MDF36} top and modesty panel, plus side storage with 3 drawers and a lockable swing shutter`)
  if (/^executive table – series [34]/.test(m)) return sentence(`Executive desk ${tableSize} mm with ${MDF36} top and modesty panel, plus side storage with 3 drawers and a lockable single door`)
  if (/panel leg/.test(m)) return sentence(`Executive table with ${MDF36} top, 36mm panel legs and modesty panel`)

  if (round || /^round table/.test(t)) return sentence(`Round table with ${MDF18} top on a powder-coated metal leg`)
  const meetingTop = "melamine-faced MDF top with 36mm thick edge"
  if (/clove|matrix/.test(m)) return sentence(`${(model || "").replace(/ Meeting Table$/i, "")} meeting table with ${meetingTop} on powder-coated metal legs`)
  if (/meeting table/.test(m) || /^meeting table/.test(t)) {
    let legs = "MDF panel legs"
    if (/loop leg/.test(t)) legs = "powder-coated steel loop legs"
    else if (/box type leg/.test(t)) legs = "box-type MDF legs"
    else if (/36mm thick melamine faced mdf with (2mm|\.5mm) thick edgeband/.test(t) && /leg/.test(t)) legs = "36mm MDF panel legs"
    else if (/18mm thick melamine faced mdf/.test(t)) legs = "18mm MDF panel legs"
    return sentence(`Meeting table with ${meetingTop} on ${legs}${/modesty included/.test(t) ? ", modesty panel included" : ""}`)
  }

  if (/^zen ?x/.test(m)) {
    const ret = s.match(/side return\s*:?\s*(\d{3,4})\s*x\s*(\d{3,4})(?:\s*x\s*(\d{3,4}))?/i) || []
    const returnText = ret[1] ? `${ret[1]} × ${ret[2]}${ret[3] ? ` × ${ret[3]}` : ""} mm side return` : ""
    const frame = "powder-coated steel loop-leg frame"
    const seats = (lay.match(/(\d)/) || [])[1]
    let what: string
    if (/single seater \(recta\)/i.test(lay)) what = "Zen X single-seater workstation"
    else if (/seater linear/i.test(lay) && seats) what = `Zen X ${seats}-seater linear workstation`
    else if (/face to face/i.test(lay)) what = "Zen X 2-seater face-to-face workstation"
    else if (/cluster of (\d)/i.test(lay) && seats) what = `${/ultra/.test(m) ? "Zen X Ultra" : "Zen X"} ${seats}-seater cluster workstation`
    else if (/l shape desk/i.test(lay)) what = "Zen X L-shape desk"
    else if (/l shape/i.test(lay)) what = "Zen X L-shape workstation"
    else if (/single seater/i.test(lay)) what = `${model} single-seater workstation`
    else what = `${model} ${lay.replace(/\s*\(.*\)$/, "").toLowerCase()} workstation`.trim()
    const extras: string[] = []
    const returns = Number((s.match(/-\s*(\d+)\s*nos/i) || [])[1] || 1)
    if (returns > 1 && ret[1]) {
      // e.g. Zen X Ultra cluster of 4 with one side return per seat — keep it compact
      extras.push("18mm MDF top", "steel loop-leg frame", `${returns} side returns (${ret[1]} × ${ret[2]} mm) with drawers`)
    } else {
      extras.push(`${MDF18} top`, frame)
      if (returnText) extras.push(/drawer/.test(t) ? `${returnText} with drawers and open shelves` : returnText)
      else if (/modesty/.test(t)) extras.push("modesty panel")
    }
    const partition = /without fabric partition/.test(t) ? "; fabric partition not included" : ""
    return sentence(`${what} with ${joinList(extras)}${partition}`)
  }
  if (/^proglide/.test(m)) {
    const legs = /aok/i.test(lay) ? "AOK" : "Bosq"
    const people = /2 seater/i.test(lay) ? " for two users" : ""
    const range = s.match(/height range:\s*(\d+)\s*-\s*(\d+)\s*mm/i) || s.match(/frame height\s*(\d+)\s*-\s*(\d+)/i) || []
    const rng = range[1] ? ` (${range[1]}–${range[2]} mm)` : ""
    if (/l shape/i.test(lay)) return sentence(`Electric height-adjustable L-shape desk${rng} with 18mm top, ${legs} leg frame and memory presets`)
    const parts = ["18mm top", `${legs} leg frame`]
    if (/memory|presets/.test(t)) parts.push("memory presets")
    if (/side return/.test(t)) parts.push("side return with 3 drawers and open shelf")
    return sentence(`Electric height-adjustable desk${people}${rng} with ${joinList(parts)}`)
  }
  return null
}

// ---------- any product ----------
export interface DescribableProduct {
  productName: string
  productCode?: string | null
  specifications?: string | null
  description?: string | null
  chairType?: string | null
  dimensions?: string | null
  availableColors?: string | null
  variantAttributes?: unknown
  category?: { name?: string | null } | null
  parentProduct?: { productName?: string | null } | null
}

/** First meaningful line of a specification, as a sentence (generic fallback). */
function specLead(spec: string): string {
  const first = spec.split(/\n|•|■|\*/).map((l) => l.trim()).find((l) => l.length > 3) || ""
  return first.length > 160 ? first.slice(0, 157).replace(/\s+\S*$/, "") + "…" : first
}

/**
 * A suitable short description for any product: chairs, desks/tables/workstations, storage,
 * accessories, or — for anything not recognised — the product name with the lead line of its spec.
 */
export function generateShortDescription(p: DescribableProduct): string {
  const spec = plain(p.specifications)
  const category = lower(p.category?.name)
  const attrs = (p.variantAttributes && typeof p.variantAttributes === "object" ? p.variantAttributes : {}) as Record<string, unknown>
  const layout = typeof attrs.layout === "string" ? attrs.layout : ""
  const model = p.parentProduct?.productName || ""
  const size = (p.dimensions || "").replace(/\s*mm\s*$/i, "").trim()

  if (/chair|seating|stool/.test(category)) return chairShortDescription({ chairType: p.chairType, spec })

  const fromPriceList = priceListShortDescription({
    model: model || p.productName,
    layout: layout || (model ? p.productName.replace(model, "").replace(/^[\s—–-]+/, "") : ""),
    spec,
    size: /^standard$/i.test(size) ? "" : size,
    round: /round table/i.test(`${model} ${p.productName}`),
  })
  if (fromPriceList) return fromPriceList

  const colour = (p.availableColors || "").trim()
  const fromStock = stockItemShortDescription({
    name: p.productName,
    spec,
    colour: colour && !/^standard$/i.test(colour) ? colour : null,
  })
  if (fromStock) return fromStock

  const lead = specLead(spec)
  if (lead && !lead.toLowerCase().startsWith(p.productName.toLowerCase())) return sentence(`${p.productName} — ${lead.replace(/[:;,.]+$/, "")}`)
  return sentence(lead || p.productName)
}

/**
 * The description a quotation line starts with for this product: the product's own description,
 * or a generated one when that is missing or only a placeholder. Users can edit it on the line.
 */
export function defaultQuotationDescription(p: DescribableProduct): string {
  if (!isPlaceholderDescription(p)) return plain(p.description).replace(/\s*\n\s*/g, " ").trim()
  return generateShortDescription(p)
}

/**
 * True when a stored description is missing or only a placeholder (empty, the product name, the
 * first line of its spec, or "Model — Layout"), so it's safe to replace with a generated one.
 */
export function isPlaceholderDescription(p: DescribableProduct): boolean {
  const d = plain(p.description).replace(/["“”]/g, "").trim().toLowerCase()
  if (!d) return true
  const name = lower(p.productName)
  if (d === name || d === `${name}.` || d.length < 12) return true
  const firstLine = lower(plain(p.specifications).split("\n")[0]).replace(/^[\d.)\s*•-]+/, "").trim()
  if (firstLine && (d === firstLine || firstLine.startsWith(d) || d.startsWith(firstLine.slice(0, 40)))) return true
  if (/ — /.test(d) && !/[.]$/.test(d) && d.length < 60) return true
  if (/ (chair|product) model$/.test(d) || /^\S+ category$/.test(d)) return true
  return false
}
