import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image as PdfImage,
  Link,
} from "@react-pdf/renderer"
import Html from "react-pdf-html"

// Premium BOSQ Palette
const colors = {
  primary: "#231F20", // Deep Black
  secondary: "#383E42", // Dark Grey
  accent: "#F17423", // BOSQ Bright Orange
  text: "#231F20", // Deep Black
  lightText: "#383E42", // Dark Grey
  lineColor: "#E6E7E8", // Soft Grey
  bgLight: "#FFF0D7", // Champagne Cream
  highlightBg: "#F17423",
  mutedForeground: "#737373", // oklch(0.556 0 0) roughly
  white: "#ffffff",
}

const styles = StyleSheet.create({
  page: {
    paddingBottom: 75, // Room for fixed absolute footer
    paddingHorizontal: 45,
    fontFamily: "Helvetica",
    fontSize: 8.5,
    color: colors.text,
    lineHeight: 1.4,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  leftColumn: {
    width: "53%",
  },
  rightColumn: {
    width: "44%",
    alignItems: "flex-end",
  },
  logoWrapperLeft: {
    alignItems: "flex-start",
    marginBottom: 8,
  },
  logoImageLeft: {
    width: 152,
    height: 48.8,
    objectFit: "contain",
    objectPositionX: "left",
  },
  logoTextFallback: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.primary,
    letterSpacing: 1,
  },
  logoWrapperRight: {
    alignItems: "flex-end",
    marginBottom: 8,
  },
  logoImageRight: {
    width: 130,
    height: 33,
    objectFit: "contain",
  },
  companyNameText: {
    fontSize: 8.1,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 5,
  },
  companyInfoBlock: {
    gap: 2,
  },
  clientInfoBlock: {
    gap: 2,
  },
  infoRowInline: {
    flexDirection: "row",
    alignItems: "flex-start",
    fontSize: 6.75,
    lineHeight: 1.25,
  },
  infoKeyInline: {
    fontWeight: "bold",
    color: colors.primary,
    width: 75,
  },
  infoValueInline: {
    color: colors.secondary,
    flex: 1,
  },
  quotationDetailsBlock: {
    alignItems: "flex-end",
    gap: 2,
    width: "100%",
  },
  quotationHeading: {
    fontSize: 15,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  metaRowRight: {
    flexDirection: "row",
    justifyContent: "flex-end",
    fontSize: 6.75,
    lineHeight: 1.25,
    width: "100%",
  },
  metaKeyRight: {
    fontWeight: "bold",
    color: colors.primary,
    textAlign: "right",
  },
  metaValueRight: {
    color: colors.secondary,
    textAlign: "right",
    marginLeft: 3,
  },
  barcodeWrapper: {
    marginTop: 10,
    width: 140,
    alignItems: "center",
    alignSelf: "flex-end",
  },
  barcodeImage: {
    width: 140,
    height: 25,
    objectFit: "contain",
  },
  barcodeText: {
    fontSize: 7,
    color: colors.secondary,
    marginTop: 2,
    letterSpacing: 0.5,
    textAlign: "center",
  },

  // Table Styling
  tableHeader: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.primary, // Deep Black Top border
    borderBottomWidth: 1,
    borderBottomColor: colors.primary, // Deep Black bottom border
    paddingVertical: 10,
    alignItems: "center",
    fontWeight: "bold",
    color: colors.primary,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#fab48a", // Custom orange separator
    paddingTop: 10,
    paddingBottom: 12,
    alignItems: "flex-start", // All columns start from top position
  },
  colSlNo: { width: "4.5%", textAlign: "center", justifyContent: "flex-start" },
  colDesc: { width: "33.5%", paddingRight: 8, justifyContent: "flex-start" },
  colImage: { width: "38%", paddingHorizontal: 2, alignItems: "center", justifyContent: "flex-start" },
  colQty: { width: "6%", textAlign: "center" },
  colPrice: { width: "9%", textAlign: "right" },
  colAmount: { width: "9%", textAlign: "right" },

  itemTitle: {
    fontSize: 9.5,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 3,
    lineHeight: 1.2,
    maxLines: 2,
  },
  itemCategory: {
    fontSize: 6.5,
    fontWeight: "bold",
    color: "#1e3a8a", // Refined blue like catalog
    textTransform: "uppercase",
    marginBottom: 3,
    letterSpacing: 0.8,
  },
  itemDescText: {
    fontSize: 6.5,
    color: "#444444",
    marginBottom: 3,
    lineHeight: 1.25,
    width: "100%",
  },
  
  // Dynamic attribute specification styles
  specRow: {
    flexDirection: "row",
    fontSize: 6.5,
    color: colors.primary,
    marginBottom: 2.5,
    lineHeight: 1.35,
  },
  specKey: {
    fontWeight: "bold",
    width: 90,
    fontSize: 6.5,
  },
  specValue: {
    flex: 1,
    color: "#444444",
    fontSize: 6.5,
  },

  productImage: {
    width: "100%",
    height: 175,
    maxHeight: 185,
    objectFit: "cover",
    objectPosition: "center",
    borderRadius: 2,
  },

  // Financial Summary Box (Full Width)
  financialBox: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.lineColor,
    borderRadius: 6,
    overflow: "hidden",
    width: "50%",
    alignSelf: "flex-end",
  },
  financialHeader: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineColor,
  },
  financialTitle: {
    fontSize: 10.5,
    fontWeight: "bold",
    color: colors.primary,
    textTransform: "uppercase",
    textAlign: "center",
  },
  financialRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  financialLabel: {
    fontSize: 9.5,
    color: colors.primary,
    fontWeight: "medium",
  },
  financialValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.primary,
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.mutedForeground,
  },
  grandTotalLabel: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.white,
  },
  grandTotalValue: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.white,
  },

  // Terms and Conditions Card
  termsCard: {
    marginTop: 8,
    backgroundColor: colors.white,
    borderRadius: 6,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.lineColor,
  },
  termsTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 12,
    textTransform: "uppercase",
    borderBottomWidth: 1.5,
    borderBottomColor: colors.highlightBg,
    paddingBottom: 8,
    textAlign: "center",
  },
  termItem: {
    flexDirection: "row",
    marginBottom: 4,
    alignItems: "flex-start",
  },
  termNumber: {
    width: 20,
    fontSize: 8,
    fontWeight: "bold",
    color: colors.secondary,
  },
  termText: {
    flex: 1,
    fontSize: 8,
    color: colors.secondary,
    lineHeight: 1.5,
  },

  // Signatures
  signatureSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
    gap: 50,
  },
  signatureBox: {
    flex: 1,
    alignItems: "center",
  },
  signatureLine: {
    width: "100%",
    borderBottomWidth: 1,
    borderBottomColor: "#fab48a",
    marginBottom: 4,
  },
  signatureLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.secondary,
  },
  signatureCompany: {
    fontSize: 7.5,
    color: colors.lightText,
  },

  // Fixed Absolute Footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 45,
    right: 45,
    borderTopWidth: 1,
    borderTopColor: colors.lineColor,
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerColLeft: {
    alignItems: "flex-start",
  },
  footerColMiddle: {
    alignItems: "center",
  },
  footerColRight: {
    alignItems: "flex-end",
  },
  footerText: {
    fontSize: 7.5,
    color: colors.lightText,
  },
  footerLink: {
    fontSize: 7.5,
    color: colors.primary,
    textDecoration: "none",
  },
  footerPageNum: {
    fontSize: 8.5,
    color: colors.secondary,
    fontWeight: "bold",
  },
  sectionHeader: {
    backgroundColor: "#F5F5F5",
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginTop: 15,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  sectionHeaderText: {
    fontSize: 9.5,
    fontWeight: "bold",
    color: colors.primary,
    textTransform: "uppercase",
  },
  sectionSubtotalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineColor,
    borderStyle: "dashed",
    marginBottom: 10,
  },
  sectionSubtotalText: {
    fontSize: 8.5,
    fontWeight: "bold",
    color: colors.primary,
  }
})

export interface QuotationPdfItem {
  itemNo: number
  description: string
  productDescription?: string | null
  specifications?: string | null
  productNotes?: string | null
  quantity: number
  unitPrice: number
  discount: number
  amount: number
  imageUrl?: string | null
  categoryName?: string | null
  chairType?: string | null
  dimensions?: string | null
  warranty?: string | null
  batchHeading?: string | null
}

export interface AdditionalCharge {
  name: string
  amount: number
}

export interface QuotationPdfProps {
  quotationNumber: string
  date: string
  validityDate: string
  companyName: string
  companyAddress: string
  companyTrn: string
  clientName: string
  clientContact: string
  clientPhone: string
  clientEmail: string
  clientAddress: string
  clientTrn?: string | null
  projectName?: string | null
  paymentTerms: string
  deliveryDate?: string | null
  subtotal: number
  vatAmount: number
  deliveryCharge: number
  grandTotal: number
  preparedBy: string
  preparedByContact?: string | null
  preparedByEmail?: string | null
  preparedByDesignation?: string | null
  preparedByRole?: string | null
  preparedBySignatureUrl?: string | null
  includeSalesAgent?: boolean
  includeCompanySeal?: boolean
  includeMaterialsFinishes?: boolean
  selectedMaterials?: any[]
  salesAgentName?: string | null
  salesAgentTitle?: string | null
  salesAgentEmail?: string | null
  salesAgentContactNumber?: string | null
  termsConditions: string[]
  companyLogoUrl?: string | null // Base64 logo png
  aynMuskLogoUrl?: string | null
  companySealUrl?: string | null
  barcodeBase64?: string | null
  watermarkUrl?: string | null
  promotionalImageUrl?: string | null
  bankDetails?: string | null
  disclaimerTitle?: string | null
  disclaimer?: string | null
  clientId?: string | null
  vatMode?: "EXCLUDING" | "INCLUDING"
  specialDiscountType?: "PERCENTAGE" | "FIXED" | null
  specialDiscountValue?: number | null
  specialDiscountReason?: string | null
  discount?: number | null
  additionalCharges?: AdditionalCharge[] | null
  status?: string | null
}

function parseFormattedInlineText(text: string) {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|__.*?__)/g)
  return parts.map((part, index) => {
    const isBold = part.startsWith("**") && part.endsWith("**")
    const isItalic = (part.startsWith("*") && part.endsWith("*")) || (part.startsWith("__") && part.endsWith("__"))
    const cleanText = part.replace(/^[\*\_\s]+|[\*\_\s]+$/g, "")

    return (
      <Text
        key={index}
        style={[
          isBold ? { fontWeight: "bold", color: colors.primary } : {},
          isItalic ? { fontStyle: "italic" } : {},
        ]}
      >
        {cleanText}
      </Text>
    )
  })
}

function renderFormattedMarkdownBlock(rawText: string) {
  if (!rawText) return null
  const paragraphs = rawText.split(/\n\s*\n/)

  return paragraphs.map((pText, pIdx) => {
    const lines = pText.split("\n").map(l => l.trim()).filter(Boolean)

    return (
      <View key={`para-${pIdx}`} style={{ marginBottom: pIdx === paragraphs.length - 1 ? 0 : 8 }}>
        {lines.map((line, lIdx) => {
          const isHeading = line.startsWith("#") || line.startsWith("##") || line.startsWith("###") ||
            (line.startsWith("**") && line.endsWith("**") && line.length < 80)

          if (isHeading) {
            const cleanHeading = line.replace(/^[#\*\_\s]+|[#\*\_\s]+$/g, "")
            return (
              <Text key={`line-${lIdx}`} style={{ fontSize: 8.5, fontWeight: "bold", color: colors.primary, marginTop: lIdx > 0 ? 6 : 0, marginBottom: 4 }}>
                {cleanHeading}
              </Text>
            )
          }

          const isBullet = line.startsWith("•") || line.startsWith("- ") || line.startsWith("* ") || /^\d+\.\s/.test(line)
          if (isBullet) {
            const bulletChar = line.startsWith("•") ? "•" : line.startsWith("- ") ? "•" : line.startsWith("* ") ? "•" : line.match(/^\d+\./)?.[0] || "•"
            const content = line.replace(/^([•\-\*]|\d+\.)\s*/, "")
            return (
              <View key={`line-${lIdx}`} style={{ flexDirection: "row", marginTop: 2, paddingLeft: 4 }}>
                <Text style={{ fontSize: 7.5, fontWeight: "bold", color: colors.primary, width: 12 }}>{bulletChar}</Text>
                <Text style={{ fontSize: 7.5, color: colors.secondary, lineHeight: 1.45, flex: 1 }}>
                  {parseFormattedInlineText(content)}
                </Text>
              </View>
            )
          }

          return (
            <Text key={`line-${lIdx}`} style={{ fontSize: 7.5, color: colors.secondary, lineHeight: 1.45, marginBottom: lIdx === lines.length - 1 ? 0 : 3 }}>
              {parseFormattedInlineText(line)}
            </Text>
          )
        })}
      </View>
    )
  })
}

export const QuotationDocument: React.FC<QuotationPdfProps & { items: QuotationPdfItem[] }> = ({
  quotationNumber,
  date,
  validityDate,
  companyName,
  companyAddress,
  companyTrn,
  clientName,
  clientContact,
  clientPhone,
  clientEmail,
  clientAddress,
  clientTrn,
  projectName,
  paymentTerms,
  deliveryDate,
  subtotal,
  vatAmount,
  deliveryCharge,
  grandTotal,
  preparedBy,
  preparedByContact,
  preparedByEmail,
  preparedByDesignation,
  preparedByRole,
  preparedBySignatureUrl,
  includeSalesAgent = false,
  includeCompanySeal = true,
  includeMaterialsFinishes = false,
  selectedMaterials = [],
  salesAgentName,
  salesAgentTitle,
  salesAgentEmail,
  salesAgentContactNumber,
  termsConditions,
  companyLogoUrl,
  aynMuskLogoUrl,
  companySealUrl,
  barcodeBase64,
  watermarkUrl,
  promotionalImageUrl,
  bankDetails,
  disclaimerTitle,
  disclaimer,
  clientId,
  items,
  vatMode = "EXCLUDING",
  specialDiscountType = null,
  specialDiscountValue = 0,
  specialDiscountReason = null,
  discount = 0,
  additionalCharges = [],
  status = null,
}) => {
  const formatCurrency = (val: number) => {
    return val.toLocaleString("en-AE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  const formatItemPrice = (val: number, hasDiscount: boolean) => {
    if (hasDiscount) {
      return Math.round(val).toLocaleString("en-AE", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
    }
    return val.toLocaleString("en-AE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  const formatRole = (role?: string | null) => {
    if (!role) return ""
    return role
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ")
  }

  const hasAdditionalCost = Number(deliveryCharge) > 0
  const hasDiscount = Number(discount) > 0
  const discountAmount = Number(discount) || 0
  const subtotalAfterAdditional = subtotal + Number(deliveryCharge)
  const taxableSubtotal = Math.max(0, subtotalAfterAdditional - discountAmount)

  const sanitizeHtmlToText = (html: string) => {
    if (!html) return "";
    let text = html;
    text = text.replace(/style="[^"]*"/gi, '');
    text = text.replace(/style='[^']*'/gi, '');
    text = text.replace(/size="[^"]*"/gi, '');
    text = text.replace(/color="[^"]*"/gi, '');
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/p>/gi, '\n');
    text = text.replace(/<\/div>/gi, '\n');
    text = text.replace(/<li>/gi, '\n• ');
    text = text.replace(/<[^>]+>/g, '');
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#39;/g, "'");
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line !== "")
      .join('\n')
      .trim();
  }

  const parseSpecifications = (specs: string | null | undefined) => {
    if (!specs) return [];
    const rawText = sanitizeHtmlToText(specs);
    const lines = rawText.split('\n').map(line => line.trim()).filter(line => line !== "");
    const parsedSpecs: { key?: string; value: string }[] = [];

    lines.forEach((line) => {
      if (/^product\s+specifications$/i.test(line)) {
        return;
      }

      if (line.includes(",") && line.includes(":")) {
        const parts = line.split(',');
        let currentSpec: { key?: string; value: string } | null = null;
        
        parts.forEach((part) => {
          const trimmed = part.trim();
          if (trimmed.includes(":")) {
            const colonIndex = trimmed.indexOf(":");
            const rawKey = trimmed.substring(0, colonIndex).replace(/^([•\-\*\s]|\d+\.)\s*/, "").trim();
            const rawVal = trimmed.substring(colonIndex + 1).replace(/^([•\-\*\s]|\d+\.)\s*/, "").trim();
            
            if (currentSpec) {
              parsedSpecs.push(currentSpec);
            }
            currentSpec = { key: rawKey, value: rawVal };
          } else {
            if (currentSpec) {
              currentSpec.value += ", " + trimmed;
            } else {
              const cleanVal = trimmed.replace(/^([•\-\*\s]|\d+\.)\s*/, "").trim();
              if (cleanVal) parsedSpecs.push({ value: cleanVal });
            }
          }
        });
        if (currentSpec) {
          parsedSpecs.push(currentSpec);
        }
      } else {
        if (line.includes(":")) {
          const colonIndex = line.indexOf(":");
          const rawKey = line.substring(0, colonIndex).replace(/^([•\-\*\s]|\d+\.)\s*/, "").trim();
          const rawVal = line.substring(colonIndex + 1).replace(/^([•\-\*\s]|\d+\.)\s*/, "").trim();
          parsedSpecs.push({ key: rawKey, value: rawVal });
        } else {
          const cleanVal = line.replace(/^([•\-\*\s]|\d+\.)\s*/, "").trim();
          if (cleanVal) parsedSpecs.push({ value: cleanVal });
        }
      }
    });

    return parsedSpecs.filter(spec => {
      const val = spec.value.trim().toLowerCase();
      if (!val || val === "-" || val === "not specified" || val === "none") {
        return false;
      }
      return true;
    });
  }

  const renderSpecifications = (
    specs: string | null | undefined,
    productNotes?: string | null,
    dimensions?: string | null,
    warranty?: string | null
  ) => {
    const parsed = parseSpecifications(specs);
    
    // Filter out remarks from specifications list
    const specsList = parsed.filter(s => s.key?.toLowerCase() !== "remarks");
    const remarksFromSpecs = parsed.filter(s => s.key?.toLowerCase() === "remarks").map(s => s.value);
    
    const remarksLines = [...remarksFromSpecs];
    if (productNotes) {
      remarksLines.push(productNotes);
    }

    // Inject dimension and warranty dynamically if present
    if (dimensions && dimensions.trim()) {
      specsList.push({ key: "Dimension", value: dimensions.trim() });
    }
    if (warranty && warranty.trim()) {
      specsList.push({ key: "Warranty", value: warranty.trim() });
    }
    
    if (specsList.length === 0 && remarksLines.length === 0) return null;

    return (
      <View style={{ marginTop: 3 }}>
        {specsList.length > 0 && (
          <View style={{ marginBottom: 0 }}>
            {specsList.map((spec, idx) => {
              const isProdTime = spec.key?.toLowerCase() === "production time";
              const textColor = isProdTime ? "#1e3a8a" : "#444444";
              const keyColor = isProdTime ? "#1e3a8a" : colors.primary;
              
              const cleanKey = spec.key ? spec.key.replace(/^([•\-\*\s]|\d+\.)\s*/, "").trim() : "";
              const cleanVal = spec.value ? spec.value.replace(/^([•\-\*\s]|\d+\.)\s*/, "").trim() : "";
              if (!cleanVal) return null;

              return (
                <View key={`spec-${idx}`} style={{ marginBottom: 1.5 }}>
                  <Text style={{ fontSize: 6.0, lineHeight: 1.35, color: textColor }}>
                    {cleanKey ? (
                      <Text style={{ fontWeight: "bold", color: keyColor }}>{cleanKey}: </Text>
                    ) : null}
                    <Text style={{ color: textColor }}>{cleanVal}</Text>
                  </Text>
                </View>
              );
            })}
          </View>
        )}
        
        {remarksLines.length > 0 && (
          <View style={{ marginTop: 2 }}>
            {remarksLines.map((r, i) => {
              const cleanRemark = r ? r.replace(/^([•\-\*\s]|\d+\.)\s*/, "").trim() : "";
              if (!cleanRemark) return null;
              return (
                <View key={`remark-${i}`} style={{ marginBottom: 1.5 }}>
                  <Text style={{ fontSize: 6.0, lineHeight: 1.35, color: colors.secondary }}>
                    <Text style={{ fontWeight: "bold", color: colors.accent }}>Remarks: </Text>
                    <Text>{cleanRemark}</Text>
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  }

  // Deduplicate / merge identical items in items array to prevent duplicate product cards on PDF
  const uniquePdfItems: QuotationPdfItem[] = []
  items.forEach((item) => {
    const itemKey = `${(item.batchHeading || "").trim().toLowerCase()}|${(item.description || "").trim().toLowerCase()}|${(item.categoryName || "").trim().toLowerCase()}|${item.unitPrice}|${(item.specifications || "").trim()}`
    const existingIndex = uniquePdfItems.findIndex((u) => {
      const uKey = `${(u.batchHeading || "").trim().toLowerCase()}|${(u.description || "").trim().toLowerCase()}|${(u.categoryName || "").trim().toLowerCase()}|${u.unitPrice}|${(u.specifications || "").trim()}`
      return uKey === itemKey
    })

    if (existingIndex > -1) {
      const existing = uniquePdfItems[existingIndex]
      const mergedQty = existing.quantity + item.quantity
      const mergedAmount = existing.amount + item.amount
      uniquePdfItems[existingIndex] = {
        ...existing,
        quantity: mergedQty,
        amount: mergedAmount,
      }
    } else {
      uniquePdfItems.push({ ...item })
    }
  })

  // Group items by batchHeading dynamically, preserving relative order of appearance
  const groupedSections: { heading: string | null; items: QuotationPdfItem[] }[] = [];
  uniquePdfItems.forEach((item) => {
    const heading = item.batchHeading ? item.batchHeading.trim() : null;
    const existingSection = groupedSections.find(
      (s) => (s.heading === null && heading === null) || (s.heading !== null && heading !== null && s.heading.toLowerCase() === heading.toLowerCase())
    );
    if (existingSection) {
      existingSection.items.push(item);
    } else {
      groupedSections.push({ heading: item.batchHeading ? item.batchHeading.trim() : null, items: [item] });
    }
  });

  return (
    <Document>
      <Page size="A4" style={[styles.page, items.length === 1 ? { paddingBottom: 55 } : {}]}>
        
        {/* Dynamic Top Margin & Padding (Replaces page paddingTop) */}
        <View fixed render={({ pageNumber }) => (
          <View style={{ paddingTop: 36, paddingBottom: pageNumber > 1 ? 4 : 0, width: "100%" }}>
            {pageNumber > 1 && <View style={{ borderTopWidth: 1, borderTopColor: colors.lineColor }} />}
          </View>
        )} />

        {/* Bottom Right Watermark Logo (Repeats on every page) */}
        {watermarkUrl && (
          <View fixed style={{ position: "absolute", bottom: -130, right: -310, zIndex: -1 }}>
            <PdfImage src={watermarkUrl} style={{ width: 338 }} />
          </View>
        )}

        {/* Unified Two-Row Header for Perfect Horizontal Alignment */}
        <View style={[styles.headerContainer, { flexDirection: "column" }]}>
          
          {/* Top Row: Logo & Quotation Title */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", width: "100%", marginBottom: 16 }}>
            {/* Left Logo (BOSQ Logo) */}
            <View style={{ alignItems: "flex-start" }}>
              <Link src="https://bosq.ae/" style={{ textDecoration: "none" }}>
                {companyLogoUrl ? (
                  <PdfImage src={companyLogoUrl} style={styles.logoImageLeft} />
                ) : (
                  <Text style={styles.logoTextFallback}>BOSQ</Text>
                )}
              </Link>
            </View>
            
            {/* Quotation Title */}
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[styles.quotationHeading, { marginBottom: 0, marginTop: 30 }]}>Quotation</Text>
              {(status === "CLIENT_APPROVED" || status === "CLIENT_CONFIRMED") && (
                <Text style={{ fontSize: 9, fontWeight: "bold", color: "#16a34a", marginTop: 2 }}>Client Approved</Text>
              )}
            </View>
          </View>

          {/* Bottom Row: Client Info & Meta Details */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
            
            {/* Left Column: Client Info */}
            <View style={styles.leftColumn}>
              <View style={styles.clientInfoBlock}>
                <Text style={[styles.companyNameText, { marginBottom: 6 }]}>CLIENT INFORMATION</Text>
                
                <View style={styles.infoRowInline}>
                  <Text style={styles.infoKeyInline}>Quotation for:</Text>
                  <Text style={styles.infoValueInline}>{clientName}</Text>
                </View>

                <View style={styles.infoRowInline}>
                  <Text style={styles.infoKeyInline}>Contact Person:</Text>
                  <Text style={styles.infoValueInline}>{clientContact || "-"}</Text>
                </View>

                <View style={styles.infoRowInline}>
                  <Text style={styles.infoKeyInline}>Address:</Text>
                  <Text style={styles.infoValueInline}>{clientAddress || "-"}</Text>
                </View>

                <View style={styles.infoRowInline}>
                  <Text style={styles.infoKeyInline}>Phone:</Text>
                  <Text style={styles.infoValueInline}>{clientPhone || "-"}</Text>
                </View>
                <View style={styles.infoRowInline}>
                  <Text style={styles.infoKeyInline}>Email:</Text>
                  <Text style={styles.infoValueInline}>{clientEmail || "-"}</Text>
                </View>
                <View style={styles.infoRowInline}>
                  <Text style={styles.infoKeyInline}>TRN:</Text>
                  <Text style={styles.infoValueInline}>{clientTrn || "-"}</Text>
                </View>
              </View>
            </View>

            {/* Right Column: Quotation Meta details */}
            <View style={styles.rightColumn}>
                <View style={styles.quotationDetailsBlock}>
                  
                  <View style={styles.metaRowRight}>
                    <Text style={styles.metaKeyRight}>Date:</Text>
                    <Text style={styles.metaValueRight}>{date}</Text>
                  </View>

                  <View style={styles.metaRowRight}>
                    <Text style={styles.metaKeyRight}>Quotation #:</Text>
                    <Text style={styles.metaValueRight}>{(quotationNumber || "").replace(/\s+Copy.*$/gi, "").trim()}</Text>
                  </View>

                  <View style={styles.metaRowRight}>
                    <Text style={styles.metaKeyRight}>TRN:</Text>
                    <Text style={styles.metaValueRight}>{companyTrn}</Text>
                  </View>

                  <View style={styles.metaRowRight}>
                    <Text style={styles.metaKeyRight}>Client ID:</Text>
                    <Text style={styles.metaValueRight}>{clientId || "-"}</Text>
                  </View>

                  <View style={styles.metaRowRight}>
                    <Text style={styles.metaKeyRight}>Quotation Valid Until:</Text>
                    <Text style={styles.metaValueRight}>{validityDate}</Text>
                  </View>

                  {/* Sales Agent Details (Conditional - appears ONLY when includeSalesAgent is true and at least one detail is provided) */}
                  {includeSalesAgent && (salesAgentName || salesAgentContactNumber || salesAgentEmail) && (
                    <View style={{ marginTop: 6, width: "100%", alignItems: "flex-end" }}>
                      {salesAgentName && (
                        <View style={styles.metaRowRight}>
                          <Text style={styles.metaKeyRight}>{salesAgentTitle || "Sales Representative"}:</Text>
                          <Text style={styles.metaValueRight}>{salesAgentName}</Text>
                        </View>
                      )}

                      {(() => {
                        const salesAgentContacts = salesAgentContactNumber
                          ? salesAgentContactNumber.split(/[,/\n]+/).map(s => s.trim()).filter(Boolean)
                          : [];
                        if (salesAgentContacts.length === 0) return null;
                        return salesAgentContacts.map((contact, idx) => (
                          <View key={`sales-contact-${idx}`} style={styles.metaRowRight}>
                            {idx === 0 && <Text style={styles.metaKeyRight}>Contact Number:</Text>}
                            <Text style={styles.metaValueRight}>{contact}</Text>
                          </View>
                        ));
                      })()}

                      {(() => {
                        const salesAgentEmails = salesAgentEmail
                          ? salesAgentEmail.split(/[,/\n]+/).map(s => s.trim()).filter(Boolean)
                          : [];
                        if (salesAgentEmails.length === 0) return null;
                        return salesAgentEmails.map((email, idx) => (
                          <View key={`sales-email-${idx}`} style={styles.metaRowRight}>
                            {idx === 0 && <Text style={styles.metaKeyRight}>Email Address:</Text>}
                            <Text style={styles.metaValueRight}>{email}</Text>
                          </View>
                        ));
                      })()}
                    </View>
                  )}

                </View>
              </View>

          </View>

          {/* Bottom Row: Design Consultant (Left) & Project Name (Right) */}
          {(preparedBy || preparedByContact || preparedByEmail || projectName) && (
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", width: "100%", marginTop: 8 }}>
              {/* Left Side: Interior Design Consultant */}
              {(preparedBy || preparedByContact || preparedByEmail) ? (
                <View style={{ alignItems: "flex-start" }}>
                  {preparedBy && (
                    <View style={{ flexDirection: "row", marginTop: 1.5 }}>
                      <Text style={{ fontWeight: "bold", color: "#827f82", fontSize: 6.75 }}>Design Consultant: </Text>
                      <Text style={{ color: "#827f82", fontSize: 6.75 }}>{preparedBy}</Text>
                    </View>
                  )}

                  {preparedByContact && (
                    <View style={{ flexDirection: "row", marginTop: 1.5 }}>
                      <Text style={{ fontWeight: "bold", color: "#827f82", fontSize: 6.75 }}>Contact Number: </Text>
                      <Text style={{ color: "#827f82", fontSize: 6.75 }}>{preparedByContact}</Text>
                    </View>
                  )}

                  {preparedByEmail && (
                    <View style={{ flexDirection: "row", marginTop: 1.5 }}>
                      <Text style={{ fontWeight: "bold", color: "#827f82", fontSize: 6.75 }}>Email: </Text>
                      <Text style={{ color: "#827f82", fontSize: 6.75 }}>{preparedByEmail}</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View />
              )}

              {/* Right Side: Project Name */}
              {projectName && (
                <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "flex-end" }}>
                  <Text style={{ fontWeight: "bold", color: "#827f82", fontSize: 6.75 }}>Project: </Text>
                  <Text style={{ color: "#827f82", fontSize: 6.75 }}>{projectName}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Table Headers (Rendered only once at the top of the table) */}
        <View style={styles.tableHeader} wrap={false}>
          <Text style={styles.colSlNo}>S.No</Text>
          <Text style={styles.colDesc}>Item Description</Text>
          <Text style={[styles.colImage, { textAlign: "center" }]}>Image</Text>
          <Text style={styles.colQty}>QTY</Text>
          <Text style={styles.colPrice}>Price</Text>
          <Text style={styles.colAmount}>Total</Text>
        </View>

        {/* Grouped Table Sections */}
        {(() => {
          let itemCounter = 0;
          return groupedSections.map((group, gIdx) => {
            const sectionSubtotal = group.items.reduce((acc, item) => acc + item.amount, 0);
            return (
              <View key={`group-${gIdx}`} style={{ marginTop: gIdx > 0 ? 8 : 4 }}>
                {group.heading ? (
                  <>
                    {/* Keep the section heading and the first product row together on the same page */}
                    <View wrap={false}>
                      <View style={styles.sectionHeader}>
                        <Text style={styles.sectionHeaderText}>{group.heading}</Text>
                      </View>
                      {group.items.slice(0, 1).map((item, index) => {
                        itemCounter++;
                        const hasItemDiscount = Number(item.discount || 0) > 0 || (item.quantity > 0 && Math.abs((item.unitPrice * item.quantity) - item.amount) > 0.01);
                        const effectiveUnitPrice = item.quantity > 0 ? item.amount / item.quantity : item.unitPrice;
                        return (
                          <View key="first" style={[styles.tableRow, group.items.length === 1 ? { paddingVertical: 10 } : {}]}>
                            {/* S.No */}
                            <Text style={[styles.colSlNo, { fontSize: 8, fontWeight: "bold", color: colors.primary }]}>
                              {itemCounter}
                            </Text>

                            {/* Description */}
                            <View style={styles.colDesc}>
                              {/* 1. Product Name */}
                              <Text style={styles.itemTitle}>{item.description}</Text>
                              
                              {/* 2. Product Type / Category */}
                              {item.categoryName && (
                                <Text style={styles.itemCategory}>{item.categoryName}</Text>
                              )}

                              {/* 2.5 Chair Type (if applicable) */}
                              {(item.categoryName?.toLowerCase() === "chair" || item.categoryName?.toLowerCase() === "chairs") && item.chairType && (
                                <View style={{ flexDirection: "row", marginTop: 0, marginBottom: 2, fontSize: 6.5 }}>
                                  <Text style={{ fontWeight: "bold", color: colors.primary }}>Chair Type: </Text>
                                  <Text style={{ color: "#444444", marginLeft: 3 }}>{item.chairType}</Text>
                                </View>
                              )}

                              {/* 3. Product Description */}
                              {item.productDescription && (
                                <Text style={styles.itemDescText}>
                                  {sanitizeHtmlToText(item.productDescription).replace(/\n+/g, '\n').trim()}
                                </Text>
                              )}

                              {/* 4, 5, 6. Specs, Prod Time, Remarks, Dimension, Warranty */}
                              {renderSpecifications(item.specifications, item.productNotes, item.dimensions, item.warranty)}
                            </View>

                            {/* Product Image */}
                            <View style={styles.colImage}>
                              {item.imageUrl ? (
                                <PdfImage src={item.imageUrl} style={styles.productImage} />
                              ) : (
                                <View style={{ width: "100%", height: 140, border: "1px dashed #E6E7E8", borderRadius: 4, alignItems: "center", justifyContent: "center" }}>
                                  <Text style={{ fontSize: 7, color: colors.lightText }}>No Image Available</Text>
                                </View>
                              )}
                            </View>

                            {/* Qty, Price, Total */}
                            <Text style={styles.colQty}>{item.quantity}</Text>
                            <Text style={styles.colPrice}>
                              {formatItemPrice(effectiveUnitPrice, hasItemDiscount)}
                            </Text>
                            <Text style={styles.colAmount}>{formatItemPrice(item.amount, hasItemDiscount)}</Text>
                          </View>
                        );
                      })}
                    </View>

                    {/* Render the remaining items individually, each wrapped in wrap={false} */}
                    {group.items.slice(1).map((item, index) => {
                      itemCounter++;
                      const hasItemDiscount = Number(item.discount || 0) > 0 || (item.quantity > 0 && Math.abs((item.unitPrice * item.quantity) - item.amount) > 0.01);
                      const effectiveUnitPrice = item.quantity > 0 ? item.amount / item.quantity : item.unitPrice;
                      return (
                        <View key={index + 1} style={[styles.tableRow, { borderTopWidth: 0 }]} wrap={false}>
                          {/* S.No */}
                          <Text style={[styles.colSlNo, { fontSize: 8, fontWeight: "bold", color: colors.primary }]}>
                            {itemCounter}
                          </Text>

                          {/* Description */}
                          <View style={styles.colDesc}>
                            {/* 1. Product Name */}
                            <Text style={styles.itemTitle}>{item.description}</Text>
                            
                            {/* 2. Product Type / Category */}
                            {item.categoryName && (
                              <Text style={styles.itemCategory}>{item.categoryName}</Text>
                            )}

                            {/* 2.5 Chair Type (if applicable) */}
                            {(item.categoryName?.toLowerCase() === "chair" || item.categoryName?.toLowerCase() === "chairs") && item.chairType && (
                              <View style={{ flexDirection: "row", marginTop: 0, marginBottom: 2, fontSize: 6.5 }}>
                                <Text style={{ fontWeight: "bold", color: colors.primary }}>Chair Type: </Text>
                                <Text style={{ color: "#444444", marginLeft: 3 }}>{item.chairType}</Text>
                              </View>
                            )}

                            {/* 3. Product Description */}
                            {item.productDescription && (
                              <Text style={styles.itemDescText}>
                                {sanitizeHtmlToText(item.productDescription).replace(/\n+/g, '\n').trim()}
                              </Text>
                            )}

                            {/* 4, 5, 6. Specs, Prod Time, Remarks, Dimension, Warranty */}
                            {renderSpecifications(item.specifications, item.productNotes, item.dimensions, item.warranty)}
                          </View>

                          {/* Product Image */}
                          <View style={styles.colImage}>
                            {item.imageUrl ? (
                              <PdfImage src={item.imageUrl} style={styles.productImage} />
                            ) : (
                              <View style={{ width: "100%", height: 140, border: "1px dashed #E6E7E8", borderRadius: 4, alignItems: "center", justifyContent: "center" }}>
                                <Text style={{ fontSize: 7, color: colors.lightText }}>No Image Available</Text>
                              </View>
                            )}
                          </View>

                          {/* Qty, Price, Total */}
                          <Text style={styles.colQty}>{item.quantity}</Text>
                          <Text style={styles.colPrice}>
                            {formatItemPrice(effectiveUnitPrice, hasItemDiscount)}
                          </Text>
                          <Text style={styles.colAmount}>{formatItemPrice(item.amount, hasItemDiscount)}</Text>
                        </View>
                      );
                    })}
                  </>
                ) : (
                  /* No section heading, render all items individually with wrap={false} */
                  group.items.map((item, index) => {
                    itemCounter++;
                    const hasItemDiscount = Number(item.discount || 0) > 0 || (item.quantity > 0 && Math.abs((item.unitPrice * item.quantity) - item.amount) > 0.01);
                    const effectiveUnitPrice = item.quantity > 0 ? item.amount / item.quantity : item.unitPrice;
                    return (
                      <View key={index} style={[styles.tableRow, group.items.length === 1 ? { paddingVertical: 10 } : {}]} wrap={false}>
                        {/* S.No */}
                        <Text style={[styles.colSlNo, { fontSize: 8, fontWeight: "bold", color: colors.primary }]}>
                          {itemCounter}
                        </Text>

                        {/* Description */}
                        <View style={styles.colDesc}>
                          {/* 1. Product Name */}
                          <Text style={styles.itemTitle}>{item.description}</Text>
                          
                          {/* 2. Product Type / Category */}
                          {item.categoryName && (
                            <Text style={styles.itemCategory}>{item.categoryName}</Text>
                          )}

                          {/* 2.5 Chair Type (if applicable) */}
                          {(item.categoryName?.toLowerCase() === "chair" || item.categoryName?.toLowerCase() === "chairs") && item.chairType && (
                            <View style={{ flexDirection: "row", marginTop: 0, marginBottom: 2, fontSize: 6.5 }}>
                              <Text style={{ fontWeight: "bold", color: colors.primary }}>Chair Type: </Text>
                              <Text style={{ color: "#444444", marginLeft: 3 }}>{item.chairType}</Text>
                            </View>
                          )}

                          {/* 3. Product Description */}
                          {item.productDescription && (
                            <Text style={styles.itemDescText}>
                              {sanitizeHtmlToText(item.productDescription).replace(/\n+/g, '\n').trim()}
                            </Text>
                          )}

                          {/* 4, 5, 6. Specs, Prod Time, Remarks, Dimension, Warranty */}
                          {renderSpecifications(item.specifications, item.productNotes, item.dimensions, item.warranty)}
                        </View>

                        {/* Product Image */}
                        <View style={styles.colImage}>
                          {item.imageUrl ? (
                            <PdfImage src={item.imageUrl} style={styles.productImage} />
                          ) : (
                            <View style={{ width: "100%", height: 140, border: "1px dashed #E6E7E8", borderRadius: 4, alignItems: "center", justifyContent: "center" }}>
                              <Text style={{ fontSize: 7, color: colors.lightText }}>No Image Available</Text>
                            </View>
                          )}
                        </View>

                        {/* Qty, Price, Total */}
                        <Text style={styles.colQty}>{item.quantity}</Text>
                        <Text style={styles.colPrice}>
                          {formatItemPrice(effectiveUnitPrice, hasItemDiscount)}
                        </Text>
                        <Text style={styles.colAmount}>{formatItemPrice(item.amount, hasItemDiscount)}</Text>
                      </View>
                    );
                  })
                )}
              </View>
            );
          });
        })()}

        {/* Materials & Finishes Schedule (Compact Swatch-Board Layout - Above Bank & Cost Breakdown) */}
        {includeMaterialsFinishes && Array.isArray(selectedMaterials) && selectedMaterials.length > 0 && (
          <View style={[styles.termsCard, { marginTop: 8, marginBottom: 4, paddingHorizontal: 10, paddingVertical: 6 }]} wrap={false}>
            <Text style={[styles.termsTitle, { fontSize: 8.5, marginBottom: 4 }]}>Materials & Finishes Schedule</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5 }}>
              {selectedMaterials.map((mat: any, idx: number) => (
                <View 
                  key={mat.id || mat.code || idx}
                  style={{
                    width: "11.75%",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    padding: 3,
                    borderWidth: 1,
                    borderColor: colors.lineColor,
                    borderRadius: 3,
                    backgroundColor: "#FAF8F5"
                  }}
                  wrap={false}
                >
                  {mat.swatchUrl ? (
                    <PdfImage 
                      src={mat.swatchUrl} 
                      style={{ width: 22, height: 22, borderRadius: 2, objectFit: "cover", borderWidth: 0.5, borderColor: colors.lineColor }} 
                    />
                  ) : (
                    <View style={{ width: 22, height: 22, borderRadius: 2, backgroundColor: "#E6E7E8", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 5, color: colors.secondary }}>MAT</Text>
                    </View>
                  )}

                  <View style={{ flex: 1, minWidth: 0, justifyContent: "center" }}>
                    <Text style={{ fontSize: 6.5, fontWeight: "bold", color: colors.primary, lineHeight: 1.1 }}>
                      {mat.code || `MAT-${idx + 1}`}
                    </Text>
                    {mat.name && (
                      <Text style={{ fontSize: 5.5, color: colors.secondary, marginTop: 1, lineHeight: 1.0 }}>
                        {mat.name}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Financial Summary Box & Company Bank Details */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "stretch", marginTop: 6 }} wrap={false}>
          <View style={[styles.financialBox, { marginTop: 0, width: "48%", alignSelf: "stretch", display: "flex", flexDirection: "column" }]}>
            <View style={styles.financialHeader}>
              <Text style={styles.financialTitle}>Company Bank Details</Text>
            </View>
            <View style={{ paddingVertical: 10, paddingHorizontal: 14, flex: 1, justifyContent: "center", backgroundColor: colors.white }}>
              <Text style={{ fontSize: 8, color: colors.primary, lineHeight: 1.55 }}>
                {bankDetails || "Bank Name: Emirates NBD\nAccount Name: BOSQ OFFICE FURNITURE TRADING LLC\nAccount No: 10158492048201\nIBAN: AE28020000010158492048201\nSWIFT / BIC: EBILAEADXXX\nBranch: Dubai Main Branch, UAE"}
              </Text>
            </View>
          </View>

          <View style={[styles.financialBox, { marginTop: 0, width: "49%", alignSelf: "stretch", display: "flex", flexDirection: "column" }]}>
            <View style={styles.financialHeader}>
              <Text style={styles.financialTitle}>Cost Breakdown</Text>
            </View>
            <View style={styles.financialRow}>
              <Text style={styles.financialLabel}>Products Subtotal</Text>
              <Text style={styles.financialValue}>AED {formatCurrency(subtotal)}</Text>
            </View>

              {(() => {
                const charges = Array.isArray(additionalCharges) ? additionalCharges : [];
                // Check if delivery charge already exists
                const hasDelivery = charges.some((c: any) => c.name && c.name.toLowerCase().includes("delivery"));
                
                // Create a processed list of charges
                let processedCharges = charges.filter((c: any) => c.name && (Number(c.amount) > 0 || c.name.toLowerCase().includes("delivery")));
                
                // If no delivery charge exists, add a default one with 0.00
                if (!hasDelivery) {
                  processedCharges = [
                    { name: "Delivery & Installation Charge", amount: 0 },
                    ...processedCharges
                  ];
                }

                return processedCharges.map((charge: any, idx: number) => (
                  <View key={`charge-${idx}`} style={styles.financialRow}>
                    <Text style={styles.financialLabel}>{charge.name}</Text>
                    <Text style={styles.financialValue}>AED {formatCurrency(Number(charge.amount))}</Text>
                  </View>
                ));
              })()}

              {hasDiscount && (
                <>
                  <View style={styles.financialRow}>
                    <Text style={[styles.financialLabel, { fontWeight: "bold", color: colors.primary }]}>Subtotal Before Discount</Text>
                    <Text style={styles.financialValue}>AED {formatCurrency(subtotalAfterAdditional)}</Text>
                  </View>
                  <View style={styles.financialRow}>
                    <Text style={[styles.financialLabel, { color: "#dc2626" }]}>
                      Discount {specialDiscountType === "PERCENTAGE" && `(${specialDiscountValue}%)`}
                      {specialDiscountReason && <Text style={{ fontSize: 7, color: colors.lightText }}> - {specialDiscountReason}</Text>}
                    </Text>
                    <Text style={[styles.financialValue, { color: "#dc2626" }]}>- AED {formatCurrency(discountAmount)}</Text>
                  </View>
                  <View style={styles.financialRow}>
                    <Text style={[styles.financialLabel, { fontWeight: "bold", color: colors.primary }]}>Net Subtotal</Text>
                    <Text style={styles.financialValue}>AED {formatCurrency(taxableSubtotal)}</Text>
                  </View>
                </>
              )}

              {vatMode === "EXCLUDING" && (
                <View style={[styles.financialRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.financialLabel}>VAT (5%)</Text>
                  <Text style={styles.financialValue}>AED {formatCurrency(vatAmount)}</Text>
                </View>
              )}
              {vatMode === "INCLUDING" && (
                <View style={[styles.financialRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.financialLabel}>VAT (5%) Included in Price</Text>
                  <Text style={styles.financialValue}>AED {formatCurrency(vatAmount)}</Text>
                </View>
              )}
            
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>GRAND TOTAL</Text>
              <Text style={styles.grandTotalValue}>AED {grandTotal.toLocaleString("en-AE", { maximumFractionDigits: 0 })}</Text>
            </View>
          </View>
        </View>

        {/* Disclaimers Section */}
        {disclaimer && disclaimer.trim().length > 0 && (
          <View style={[styles.termsCard, { marginTop: 8, backgroundColor: "#FAFBFD", borderColor: "#CBD5E1", padding: 12 }]} wrap={false}>
            <Text style={styles.termsTitle}>{disclaimerTitle || "Disclaimers"}</Text>
            {renderFormattedMarkdownBlock(disclaimer)}
          </View>
        )}

        {termsConditions && termsConditions.length > 0 && (
          <View style={[styles.termsCard, { marginTop: 8 }]} wrap={false}>
            <Text style={styles.termsTitle}>Terms & Conditions</Text>
            {termsConditions.map((termRaw, idx) => {
              const isHighlighted = typeof termRaw === "string" && termRaw.includes("[HIGHLIGHT]")
              const cleanTermText = typeof termRaw === "string" ? termRaw.replace(/\[HIGHLIGHT\]\s*/g, "") : termRaw

              if (isHighlighted) {
                return (
                  <View 
                    key={idx} 
                    style={[
                      styles.termItem, 
                      { 
                        backgroundColor: "#FEF3C7", 
                        borderLeftWidth: 3.5, 
                        borderLeftColor: "#F59E0B",
                        paddingVertical: 5, 
                        paddingHorizontal: 8, 
                        borderRadius: 4, 
                        marginBottom: 4 
                      }
                    ]} 
                    wrap={false}
                  >
                    <Text style={styles.termNumber}>
                      {(idx + 1).toString().padStart(2, '0')}.
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.termText}>
                        {cleanTermText}
                      </Text>
                    </View>
                  </View>
                )
              }

              return (
                <View key={idx} style={styles.termItem} wrap={false}>
                  <Text style={styles.termNumber}>{(idx + 1).toString().padStart(2, '0')}.</Text>
                  <Text style={styles.termText}>{cleanTermText}</Text>
                </View>
              )
            })}
          </View>
        )}

        {/* Signatures */}
        <View wrap={false} style={[styles.signatureSection, items.length === 1 ? { marginTop: 10 } : {}]}>
            <View style={styles.signatureBox}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Prepared By</Text>
              <Text style={styles.signatureCompany}>
                {preparedBy}
                {preparedByDesignation || formatRole(preparedByRole) ? ` | ${(preparedByDesignation || formatRole(preparedByRole))?.replace(/Interior Design Consultants/gi, "Interior Design Consultant")}` : ""}
              </Text>
              
              <View style={{ position: "relative", width: 260, height: 85, alignItems: "center", justifyContent: "center", marginTop: 4 }}>
                {/* Company Seal - Placed Slightly Bottom Left */}
                {includeCompanySeal && companySealUrl && (
                  <PdfImage 
                    src={companySealUrl} 
                    style={{ 
                      position: "absolute", 
                      left: 100, 
                      bottom: -100, 
                      width: 207, 
                      height: 207, 
                      objectFit: "contain"
                    }} 
                  />
                )}
                {/* Signature Image - Placed on top */}
                {preparedBySignatureUrl ? (
                  <PdfImage 
                    src={preparedBySignatureUrl} 
                    style={{ 
                      height: 80, 
                      width: 260, 
                      objectFit: "contain"
                    }} 
                  />
                ) : (
                  <Text style={[styles.signatureCompany, { marginTop: 1.5, fontWeight: "bold" }]}>
                    Interior Design Consultant
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.signatureBox}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Accepted & Approved By</Text>
              <Text style={styles.signatureCompany}>Authorized Customer Signature</Text>
            </View>
          </View>

        {/* Absolute Bottom Page Footer */}
        <View style={styles.footer} fixed>
          <View style={styles.footerColLeft}>
            {aynMuskLogoUrl ? (
              <PdfImage src={aynMuskLogoUrl} style={{ width: 80, height: 20, objectFit: "contain", objectPositionX: "left" }} />
            ) : (
              <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primary }}>AYN MUSK</Text>
            )}
          </View>
          <View style={styles.footerColMiddle}>
            <Text style={styles.footerText}>{companyName} | {companyAddress}</Text>
          </View>
          <View style={styles.footerColRight}>
            <Link src="https://bosq.ae/" style={styles.footerLink}>WWW.BOSQ.AE</Link>
          </View>
          <Text 
            style={[styles.footerPageNum, { position: "absolute", right: 0, bottom: -12 }]} 
            render={({ pageNumber, totalPages }) => `${pageNumber}`} 
          />
        </View>

      </Page>
    </Document>
  )
}
