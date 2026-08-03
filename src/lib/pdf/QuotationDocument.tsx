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
    paddingTop: 12,
    paddingBottom: 14,
    alignItems: "flex-start", // Align columns to top
  },
  colDesc: { width: "40%", paddingRight: 15 },
  colImage: { width: "33%", overflow: "hidden" },
  colQty: { width: "7%", textAlign: "center" },
  colPrice: { width: "10%", textAlign: "right" },
  colAmount: { width: "10%", textAlign: "right" },

  itemTitle: {
    fontSize: 9.5,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 4,
    lineHeight: 1.2,
    maxLines: 2,
  },
  itemCategory: {
    fontSize: 6,
    fontWeight: "bold",
    color: "#58595B",
    textTransform: "uppercase",
    marginBottom: 1,
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
    height: 120,
    objectFit: "contain",
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
  preparedByDesignation?: string | null
  preparedByRole?: string | null
  preparedBySignatureUrl?: string | null
  salesAgentName?: string | null
  salesAgentTitle?: string | null
  salesAgentEmail?: string | null
  termsConditions: string[]
  companyLogoUrl?: string | null // Base64 logo png
  aynMuskLogoUrl?: string | null
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
    if ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("__") && part.endsWith("__"))) {
      return (
        <Text key={index} style={{ fontWeight: "bold", color: colors.primary }}>
          {part.slice(2, -2)}
        </Text>
      )
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <Text key={index} style={{ fontStyle: "italic" }}>
          {part.slice(1, -1)}
        </Text>
      )
    }
    return <Text key={index}>{part}</Text>
  })
}

function renderFormattedDisclaimer(disclaimerText: string) {
  if (!disclaimerText) return null
  const paragraphs = disclaimerText.split(/\n\s*\n/)

  return paragraphs.map((para, pIdx) => {
    const lines = para.split("\n").map(l => l.trim()).filter(Boolean)

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
  preparedByDesignation,
  preparedByRole,
  preparedBySignatureUrl,
  salesAgentName,
  salesAgentTitle,
  termsConditions,
  companyLogoUrl,
  aynMuskLogoUrl,
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

  const formatRole = (role?: string | null) => {
    if (!role) return ""
    return role
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ")
  }

  const hasAdditionalCost = Number(deliveryCharge) > 0
  const hasDiscount = Number(discount) > 0
  const hasItemLevelDiscount = items.some(item => Number(item.discount) > 0)
  const hasAnyDiscount = hasDiscount || hasItemLevelDiscount
  const hasTaxableSubtotal = hasAdditionalCost || hasAnyDiscount

  const subtotalAfterAdditional = subtotal + Number(deliveryCharge)
  const grossProductsSubtotal = items.reduce((acc, item) => acc + ((Number(item.unitPrice) || 0) * (Number(item.quantity) || 1)), 0)
  const grossSubtotalAfterAdditional = grossProductsSubtotal + Number(deliveryCharge)
  const discountAmount = Number(discount) || 0
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
            const key = trimmed.substring(0, colonIndex).trim();
            const value = trimmed.substring(colonIndex + 1).trim();
            
            if (currentSpec) {
              parsedSpecs.push(currentSpec);
            }
            currentSpec = { key, value };
          } else {
            if (currentSpec) {
              currentSpec.value += ", " + trimmed;
            } else {
              parsedSpecs.push({ value: trimmed });
            }
          }
        });
        if (currentSpec) {
          parsedSpecs.push(currentSpec);
        }
      } else {
        if (line.includes(":")) {
          const colonIndex = line.indexOf(":");
          const key = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim();
          parsedSpecs.push({ key, value });
        } else {
          parsedSpecs.push({ value: line });
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
      <View style={{ marginTop: 2 }}>
        {specsList.length > 0 && (
          <View style={{ marginBottom: 0 }}>
            {specsList.map((spec, idx) => {
              const isProdTime = spec.key?.toLowerCase() === "production time";
              const textColor = isProdTime ? "#1e3a8a" : "#444444";
              const keyColor = isProdTime ? "#1e3a8a" : colors.primary;
              
              const cleanKey = spec.key ? spec.key.trim() : "";
              const cleanVal = spec.value ? spec.value.trim() : "";
              if (!cleanVal) return null;

              return (
                <View key={`spec-${idx}`} style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 1 }}>
                  {cleanKey ? (
                    <>
                      <Text style={{ fontWeight: "bold", color: keyColor, marginRight: 3, flexShrink: 0, fontSize: 4.6, lineHeight: 1.2 }}>{cleanKey}:</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: textColor, fontSize: 4.6, lineHeight: 1.2 }}>{cleanVal}</Text>
                      </View>
                    </>
                  ) : (
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: textColor, fontSize: 4.6, lineHeight: 1.2 }}>{cleanVal}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
        
        {remarksLines.length > 0 && (
          <View style={{ marginTop: 2, flexDirection: "row", alignItems: "flex-start" }}>
            <Text style={{ fontWeight: "bold", fontSize: 4.6, color: colors.accent, marginRight: 4, lineHeight: 1.2 }}>Remarks:</Text>
            <View style={{ flex: 1 }}>
              {remarksLines.map((r, i) => {
                const cleanRemark = r ? r.trim() : "";
                if (!cleanRemark) return null;
                return (
                  <Text key={i} style={{ fontSize: 4.6, color: colors.secondary, marginBottom: 1, lineHeight: 1.2 }}>{cleanRemark}</Text>
                );
              })}
            </View>
          </View>
        )}
      </View>
    );
  }

  // Group items by batchHeading dynamically, preserving relative order of appearance
  const groupedSections: { heading: string | null; items: QuotationPdfItem[] }[] = [];
  items.forEach((item) => {
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
                  <Text style={styles.metaValueRight}>{quotationNumber}</Text>
                </View>

                <View style={styles.metaRowRight}>
                  <Text style={styles.metaKeyRight}>TRN:</Text>
                  <Text style={styles.metaValueRight}>{companyTrn}</Text>
                </View>

                <View style={styles.metaRowRight}>
                  <Text style={styles.metaKeyRight}>Customer ID:</Text>
                  <Text style={styles.metaValueRight}>{clientId || "-"}</Text>
                </View>

                <View style={styles.metaRowRight}>
                  <Text style={styles.metaKeyRight}>Quotation Valid Until:</Text>
                  <Text style={styles.metaValueRight}>{validityDate}</Text>
                </View>

                <View style={styles.metaRowRight}>
                  <Text style={styles.metaKeyRight}>Contact Number:</Text>
                  <Text style={styles.metaValueRight}>{preparedByContact || "-"}</Text>
                </View>

              </View>

              {/* Removed Barcode per user request */}
            </View>

          </View>

          {/* Bottom Row: Sales Executive & Project Name */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", width: "100%", marginTop: 24 }}>
            <View style={{ flexDirection: "row" }}>
              <Text style={{ fontWeight: "bold", color: "#827f82", fontSize: 6.75 }}>{salesAgentTitle || "Sales Executive"}: </Text>
              <Text style={{ color: "#827f82", fontSize: 6.75 }}>{salesAgentName || preparedBy}</Text>
            </View>
            {projectName && (
              <View style={{ flexDirection: "row" }}>
                <Text style={{ fontWeight: "bold", color: "#827f82", fontSize: 6.75 }}>Project: </Text>
                <Text style={{ color: "#827f82", fontSize: 6.75 }}>{projectName}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Table Headers (Rendered only once at the top of the table) */}
        <View style={styles.tableHeader} wrap={false}>
          <Text style={styles.colDesc}>Item Description</Text>
          <Text style={[styles.colImage, { textAlign: "center" }]}>Image</Text>
          <Text style={styles.colQty}>QTY</Text>
          <Text style={styles.colPrice}>Price</Text>
          <Text style={styles.colAmount}>Total</Text>
        </View>

        {/* Grouped Table Sections */}
        {groupedSections.map((group, gIdx) => {
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
                    {group.items.slice(0, 1).map((item, index) => (
                      <View key="first" style={[styles.tableRow, group.items.length === 1 ? { paddingVertical: 10 } : {}]}>
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
                        <View style={[styles.colImage, { alignItems: "center", justifyContent: "center" }]}>
                          {item.imageUrl ? (
                            <PdfImage src={item.imageUrl} style={styles.productImage} />
                          ) : (
                            <View style={{ width: "100%", height: 100, border: "1px dashed #E6E7E8", borderRadius: 4, alignItems: "center", justifyContent: "center" }}>
                              <Text style={{ fontSize: 7, color: colors.lightText }}>No Image Available</Text>
                            </View>
                          )}
                        </View>

                        {/* Qty, Price, Total */}
                        <Text style={styles.colQty}>{item.quantity}</Text>
                        <Text style={styles.colPrice}>{formatCurrency(item.unitPrice)}</Text>
                        <Text style={styles.colAmount}>{formatCurrency(item.amount)}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Render the remaining items individually, each wrapped in wrap={false} */}
                  {group.items.slice(1).map((item, index) => (
                    <View key={index + 1} style={[styles.tableRow, { borderTopWidth: 0 }]} wrap={false}>
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
                      <View style={[styles.colImage, { alignItems: "center", justifyContent: "center" }]}>
                        {item.imageUrl ? (
                          <PdfImage src={item.imageUrl} style={styles.productImage} />
                        ) : (
                          <View style={{ width: "100%", height: 100, border: "1px dashed #E6E7E8", borderRadius: 4, alignItems: "center", justifyContent: "center" }}>
                            <Text style={{ fontSize: 7, color: colors.lightText }}>No Image Available</Text>
                          </View>
                        )}
                      </View>

                      {/* Qty, Price, Total */}
                      <Text style={styles.colQty}>{item.quantity}</Text>
                      <Text style={styles.colPrice}>{formatCurrency(item.unitPrice)}</Text>
                      <Text style={styles.colAmount}>{formatCurrency(item.amount)}</Text>
                    </View>
                  ))}
                </>
              ) : (
                /* No section heading, render all items individually with wrap={false} */
                group.items.map((item, index) => (
                  <View key={index} style={[styles.tableRow, group.items.length === 1 ? { paddingVertical: 10 } : {}]} wrap={false}>
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
                    <View style={[styles.colImage, { alignItems: "center", justifyContent: "center" }]}>
                      {item.imageUrl ? (
                        <PdfImage src={item.imageUrl} style={styles.productImage} />
                      ) : (
                        <View style={{ width: "100%", height: 100, border: "1px dashed #E6E7E8", borderRadius: 4, alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ fontSize: 7, color: colors.lightText }}>No Image Available</Text>
                        </View>
                      )}
                    </View>

                    {/* Qty, Price, Total */}
                    <Text style={styles.colQty}>{item.quantity}</Text>
                    <Text style={styles.colPrice}>{formatCurrency(item.unitPrice)}</Text>
                    <Text style={styles.colAmount}>{formatCurrency(item.amount)}</Text>
                  </View>
                ))
              )}
            </View>
          );
        })}

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

              {hasAnyDiscount && (
                <View style={styles.financialRow}>
                  <Text style={[styles.financialLabel, { fontWeight: "bold", color: colors.primary }]}>Subtotal Before Discount</Text>
                  <Text style={styles.financialValue}>AED {formatCurrency(grossSubtotalAfterAdditional)}</Text>
                </View>
              )}

              {hasDiscount && (
                <View style={styles.financialRow}>
                  <Text style={[styles.financialLabel, { color: "#dc2626" }]}>
                    Discount {specialDiscountType === "PERCENTAGE" && `(${specialDiscountValue}%)`}
                    {specialDiscountReason && <Text style={{ fontSize: 7, color: colors.lightText }}> - {specialDiscountReason}</Text>}
                  </Text>
                  <Text style={[styles.financialValue, { color: "#dc2626" }]}>- AED {formatCurrency(discountAmount)}</Text>
                </View>
              )}

              {hasTaxableSubtotal && (
                <View style={styles.financialRow}>
                  <Text style={[styles.financialLabel, { fontWeight: "bold", color: colors.primary }]}>Net Subtotal</Text>
                  <Text style={styles.financialValue}>AED {formatCurrency(taxableSubtotal)}</Text>
                </View>
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
            {renderFormattedDisclaimer(disclaimer)}
          </View>
        )}

        {termsConditions && termsConditions.length > 0 && (
          <View style={styles.termsCard} wrap={false}>
            <Text style={styles.termsTitle}>Terms & Conditions</Text>
            {termsConditions.map((term, idx) => (
              <View key={idx} style={styles.termItem} wrap={false}>
                <Text style={styles.termNumber}>{(idx + 1).toString().padStart(2, '0')}.</Text>
                <Text style={styles.termText}>{term}</Text>
              </View>
            ))}
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
              {preparedBySignatureUrl ? (
                <PdfImage src={preparedBySignatureUrl} style={{ height: 50, width: 240, objectFit: "contain", marginTop: 4 }} />
              ) : (
                <Text style={[styles.signatureCompany, { marginTop: 1.5, fontWeight: "bold" }]}>
                  Interior Design Consultant
                </Text>
              )}
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
