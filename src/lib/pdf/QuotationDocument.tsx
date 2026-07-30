import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image as PdfImage,
} from "@react-pdf/renderer"

const colors = {
  primary: "#111827", // Very Dark Grey/Black for main text & borders
  secondary: "#4B5563", // Medium Grey for labels
  accent: "#ea580c", // BOSQ Bright Orange (Darker for print)
  text: "#1f2937",
  lightText: "#6b7280",
  lineColor: "#e5e7eb", // Soft Grey
  bgLight: "#f9fafb", // Light Grey for Cards
  highlightBg: "#f17423", // Brand Orange for Grand Total
  white: "#ffffff",
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 35,
    paddingBottom: 70,
    paddingHorizontal: 40,
    fontFamily: "Helvetica",
    fontSize: 8.5,
    color: colors.text,
    lineHeight: 1.5,
  },
  // Typography
  h1: { fontSize: 20, fontWeight: "bold", color: colors.primary, letterSpacing: 1, textTransform: "uppercase" },
  h2: { fontSize: 10, fontWeight: "bold", color: colors.primary, marginBottom: 8, textTransform: "uppercase" },
  h3: { fontSize: 10, fontWeight: "bold", color: colors.primary, marginBottom: 4 },
  
  // Header
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  logoImageLeft: {
    width: 140,
    height: 45,
    objectFit: "contain",
    objectPositionX: "left",
  },
  logoTextFallback: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.primary,
    letterSpacing: 1,
  },
  
  // Top Info Cards (2-col layout)
  infoCardsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  card: {
    backgroundColor: colors.bgLight,
    borderRadius: 6,
    padding: 12,
    width: "48%",
    borderWidth: 1,
    borderColor: colors.lineColor,
  },
  cardRow: {
    flexDirection: "row",
    marginBottom: 6,
    alignItems: "flex-start",
  },
  cardLabel: {
    width: "35%",
    fontSize: 8,
    fontWeight: "bold",
    color: colors.secondary,
  },
  cardValue: {
    width: "65%",
    fontSize: 8,
    color: colors.primary,
    fontWeight: "bold",
  },

  // Table Structure
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.primary,
    color: colors.white,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    borderRadius: 4,
    marginBottom: 4,
  },
  thText: {
    fontSize: 8,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.lineColor,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "flex-start",
  },
  tableRowAlt: {
    backgroundColor: "#FDFDFD",
  },
  
  // Columns (Strict Widths)
  colNo: { width: "5%" },
  colImage: { width: "20%", paddingRight: 10 },
  colDesc: { width: "45%", paddingRight: 12 },
  colQty: { width: "8%", textAlign: "center" },
  colPrice: { width: "11%", textAlign: "right" },
  colAmount: { width: "11%", textAlign: "right" },

  productImage: {
    width: "100%",
    height: 85,
    objectFit: "contain",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.lineColor,
    backgroundColor: colors.white,
  },
  
  itemTitle: {
    fontSize: 9.5,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 4,
    lineHeight: 1.3,
  },
  itemCategory: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.accent,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  itemDescText: {
    fontSize: 7.5,
    color: colors.secondary,
    marginBottom: 8,
    lineHeight: 1.4,
  },

  // Spec Grid (Vertical List to prevent overlap)
  specGrid: {
    marginTop: 6,
    flexDirection: "column",
    backgroundColor: colors.bgLight,
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.lineColor,
  },
  specItem: {
    flexDirection: "row",
    marginBottom: 4,
    alignItems: "flex-start",
  },
  specItemKey: {
    width: "30%",
    fontSize: 7,
    fontWeight: "bold",
    color: colors.secondary,
  },
  specItemValue: {
    width: "70%",
    fontSize: 7,
    color: colors.primary,
    fontWeight: "bold",
  },
  remarksBlock: {
    marginTop: 6,
    fontSize: 7,
    color: colors.secondary,
    fontStyle: "italic",
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.lineColor,
    lineHeight: 1.4,
  },

  sectionHeader: {
    backgroundColor: "#F4F5F7",
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 16,
    marginBottom: 8,
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
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#FFF7ED",
    borderBottomWidth: 1,
    borderBottomColor: "#FED7AA",
    marginBottom: 12,
  },
  sectionSubtotalText: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.accent,
  },

  // Financial Summary Box (Full Width)
  financialBox: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.lineColor,
    borderRadius: 6,
    overflow: "hidden",
  },
  financialHeader: {
    backgroundColor: colors.bgLight,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineColor,
  },
  financialTitle: {
    fontSize: 9.5,
    fontWeight: "bold",
    color: colors.primary,
    textTransform: "uppercase",
  },
  financialRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineColor,
    backgroundColor: colors.white,
  },
  financialLabel: {
    fontSize: 8.5,
    color: colors.secondary,
  },
  financialValue: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.primary,
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.highlightBg,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.white,
  },
  grandTotalValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.white,
  },

  // Terms and Conditions Card
  termsCard: {
    marginTop: 24,
    backgroundColor: colors.white,
    borderRadius: 6,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.lineColor,
  },
  termsTitle: {
    fontSize: 9.5,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 12,
    textTransform: "uppercase",
    borderBottomWidth: 1.5,
    borderBottomColor: colors.highlightBg,
    paddingBottom: 8,
  },
  termItem: {
    flexDirection: "row",
    marginBottom: 8,
    alignItems: "flex-start",
  },
  termNumber: {
    width: 20,
    fontSize: 8,
    fontWeight: "bold",
    color: colors.highlightBg,
  },
  termText: {
    flex: 1,
    fontSize: 8,
    color: colors.secondary,
    lineHeight: 1.5,
  },

  // Signatures
  signatureGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 40,
  },
  signatureBlock: {
    width: "40%",
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: colors.primary,
    paddingTop: 8,
    marginTop: 50,
  },
  signatureName: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 2,
  },
  signatureRole: {
    fontSize: 8,
    color: colors.secondary,
    marginBottom: 2,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 25,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: colors.lineColor,
    paddingTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  footerText: {
    fontSize: 7,
    color: colors.lightText,
    lineHeight: 1.4,
  },
  pageNumber: {
    fontSize: 8,
    color: colors.secondary,
    fontWeight: "bold",
  }
});

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
  salesAgentName?: string | null
  termsConditions: string[]
  companyLogoUrl?: string | null
  aynMuskLogoUrl?: string | null
  barcodeBase64?: string | null
  watermarkUrl?: string | null
  clientId?: string | null
  vatMode?: "EXCLUDING" | "INCLUDING"
  specialDiscountType?: "PERCENTAGE" | "FIXED" | null
  specialDiscountValue?: number | null
  specialDiscountReason?: string | null
  discount?: number | null
  additionalCharges?: AdditionalCharge[] | null
  status?: string | null
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
  salesAgentName,
  termsConditions,
  companyLogoUrl,
  watermarkUrl,
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
  const hasTaxableSubtotal = hasAdditionalCost || hasDiscount

  const subtotalAfterAdditional = subtotal + Number(deliveryCharge)
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
            if (currentSpec) parsedSpecs.push(currentSpec);
            currentSpec = { key, value };
          } else {
            if (currentSpec) currentSpec.value += ", " + trimmed;
            else parsedSpecs.push({ value: trimmed });
          }
        });
        if (currentSpec) parsedSpecs.push(currentSpec);
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
      if (!val || val === "-" || val === "not specified" || val === "none") return false;
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
    const specsList = parsed.filter(s => s.key?.toLowerCase() !== "remarks");
    const remarksFromSpecs = parsed.filter(s => s.key?.toLowerCase() === "remarks").map(s => s.value);
    
    const remarksLines = [...remarksFromSpecs];
    if (productNotes) remarksLines.push(productNotes);

    if (dimensions && dimensions.trim()) specsList.push({ key: "Dimension", value: dimensions.trim() });
    if (warranty && warranty.trim()) specsList.push({ key: "Warranty", value: warranty.trim() });
    
    if (specsList.length === 0 && remarksLines.length === 0) return null;

    return (
      <View style={{ marginTop: 6 }}>
        {specsList.length > 0 && (
          <View style={styles.specGrid}>
            {specsList.map((spec, idx) => {
              const cleanKey = spec.key ? spec.key.trim() : "";
              const cleanVal = spec.value ? spec.value.trim() : "";
              if (!cleanVal) return null;
              return (
                <View key={`spec-${idx}`} style={styles.specItem}>
                  {cleanKey ? (
                    <>
                      <Text style={styles.specItemKey}>{cleanKey}:</Text>
                      <Text style={styles.specItemValue}>{cleanVal}</Text>
                    </>
                  ) : (
                    <Text style={[styles.specItemValue, { width: "100%" }]}>{cleanVal}</Text>
                  )}
                </View>
              );
            })}
          </View>
        )}
        
        {remarksLines.length > 0 && (
          <View style={styles.remarksBlock}>
            {remarksLines.map((r, i) => {
              const cleanRemark = r ? r.trim() : "";
              if (!cleanRemark) return null;
              return <Text key={i}>* {cleanRemark}</Text>;
            })}
          </View>
        )}
      </View>
    );
  }

  const groupedSections: { heading: string | null; items: QuotationPdfItem[] }[] = [];
  items.forEach((item) => {
    const heading = item.batchHeading ? item.batchHeading.trim() : null;
    const existingSection = groupedSections.find(
      (s) => (s.heading === null && heading === null) || (s.heading !== null && heading !== null && s.heading.toLowerCase() === heading.toLowerCase())
    );
    if (existingSection) existingSection.items.push(item);
    else groupedSections.push({ heading: item.batchHeading ? item.batchHeading.trim() : null, items: [item] });
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {watermarkUrl && (
          <View fixed style={{ position: "absolute", bottom: -130, right: -310, zIndex: -1 }}>
            <PdfImage src={watermarkUrl} style={{ width: 338 }} />
          </View>
        )}

        <View style={styles.headerContainer} fixed>
          <View style={{ alignItems: "flex-start" }}>
            {companyLogoUrl ? (
              <PdfImage src={companyLogoUrl} style={styles.logoImageLeft} />
            ) : (
              <Text style={styles.logoTextFallback}>BOSQ</Text>
            )}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.h1}>Quotation</Text>
            {(status === "CLIENT_APPROVED" || status === "CLIENT_CONFIRMED") && (
              <Text style={{ fontSize: 9, fontWeight: "bold", color: "#16a34a", marginTop: 2 }}>Client Approved</Text>
            )}
          </View>
        </View>

        <View style={styles.infoCardsContainer}>
          {/* Client Information Card */}
          <View style={styles.card}>
            <Text style={styles.h2}>Client Information</Text>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Client Name:</Text>
              <Text style={styles.cardValue}>{clientName}</Text>
            </View>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Contact Person:</Text>
              <Text style={styles.cardValue}>{clientContact || "-"}</Text>
            </View>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Mobile Number:</Text>
              <Text style={styles.cardValue}>{clientPhone || "-"}</Text>
            </View>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Email:</Text>
              <Text style={styles.cardValue}>{clientEmail || "-"}</Text>
            </View>
            {projectName && (
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Project Name:</Text>
                <Text style={styles.cardValue}>{projectName}</Text>
              </View>
            )}
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Address:</Text>
              <Text style={styles.cardValue}>{clientAddress || "-"}</Text>
            </View>
          </View>

          {/* Quotation Details Card */}
          <View style={styles.card}>
            <Text style={styles.h2}>Quotation Details</Text>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Quotation No:</Text>
              <Text style={styles.cardValue}>{quotationNumber}</Text>
            </View>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Customer ID:</Text>
              <Text style={styles.cardValue}>{clientId || "-"}</Text>
            </View>
            {salesAgentName && (
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Sales Executive:</Text>
                <Text style={styles.cardValue}>{salesAgentName}</Text>
              </View>
            )}
            {preparedBy && (
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Interior Design Consultant:</Text>
                <Text style={styles.cardValue}>{preparedBy}</Text>
              </View>
            )}
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Date:</Text>
              <Text style={styles.cardValue}>{date}</Text>
            </View>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Valid Until:</Text>
              <Text style={styles.cardValue}>{validityDate}</Text>
            </View>
          </View>
        </View>

        {/* Products Table Header */}
        <View style={styles.tableHeader} fixed>
          <Text style={[styles.thText, styles.colNo]}>No.</Text>
          <Text style={[styles.thText, styles.colImage, { textAlign: "center" }]}>Image</Text>
          <Text style={[styles.thText, styles.colDesc]}>Description</Text>
          <Text style={[styles.thText, styles.colQty]}>QTY</Text>
          <Text style={[styles.thText, styles.colPrice]}>Unit Price</Text>
          <Text style={[styles.thText, styles.colAmount]}>Total Amount</Text>
        </View>

        {/* Grouped Table Sections */}
        {groupedSections.map((group, gIdx) => {
          const sectionSubtotal = group.items.reduce((acc, item) => acc + item.amount, 0);
          return (
            <View key={`group-${gIdx}`}>
              {group.heading && (
                <View style={styles.sectionHeader} wrap={false}>
                  <Text style={styles.sectionHeaderText}>{group.heading}</Text>
                </View>
              )}

              {group.items.map((item, index) => (
                <View key={index} style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]} wrap={false}>
                  
                  <Text style={[styles.colNo, { fontWeight: "bold", fontSize: 7.5, color: colors.secondary }]}>
                    {(gIdx + 1).toString().padStart(2, '0')}.{(index + 1).toString().padStart(2, '0')}
                  </Text>
                  
                  <View style={styles.colImage}>
                    {item.imageUrl ? (
                      <PdfImage src={item.imageUrl} style={styles.productImage} />
                    ) : (
                      <View style={{ width: "100%", height: 85, border: "1px dashed #d1d5db", borderRadius: 4, alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 6.5, color: colors.lightText }}>No Image</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.colDesc}>
                    <Text style={styles.itemTitle}>{item.description}</Text>
                    {item.categoryName && (
                      <Text style={styles.itemCategory}>{item.categoryName}</Text>
                    )}
                    {item.productDescription && (
                      <Text style={styles.itemDescText}>
                        {sanitizeHtmlToText(item.productDescription).replace(/\n+/g, '\n').trim()}
                      </Text>
                    )}
                    {renderSpecifications(item.specifications, item.productNotes, item.dimensions, item.warranty)}
                  </View>

                  <Text style={[styles.colQty, { fontSize: 8, fontWeight: "bold" }]}>{item.quantity}</Text>
                  <Text style={[styles.colPrice, { fontSize: 8 }]}>{formatCurrency(item.unitPrice)}</Text>
                  <Text style={[styles.colAmount, { fontSize: 8, fontWeight: "bold" }]}>{formatCurrency(item.amount)}</Text>
                </View>
              ))}

              {group.heading && (
                <View style={styles.sectionSubtotalRow} wrap={false}>
                  <Text style={styles.sectionSubtotalText}>
                    Section Subtotal: AED {formatCurrency(sectionSubtotal)}
                  </Text>
                </View>
              )}
            </View>
          );
        })}

        <View wrap={false}>
          {/* Financial Summary Box */}
          <View style={styles.financialBox}>
            <View style={styles.financialHeader}>
              <Text style={styles.financialTitle}>Commercial Summary</Text>
            </View>
            <View style={styles.financialRow}>
                <Text style={styles.financialLabel}>Products Subtotal</Text>
                <Text style={styles.financialValue}>AED {formatCurrency(subtotal)}</Text>
              </View>

              {(Array.isArray(additionalCharges) ? additionalCharges : [])
                .filter((c: any) => c.name && Number(c.amount) > 0)
                .map((charge: any, idx: number) => (
                  <View key={`charge-${idx}`} style={styles.financialRow}>
                    <Text style={styles.financialLabel}>{charge.name}</Text>
                    <Text style={styles.financialValue}>AED {formatCurrency(Number(charge.amount))}</Text>
                  </View>
                ))}

              {hasAdditionalCost && (
                <View style={styles.financialRow}>
                  <Text style={[styles.financialLabel, { fontWeight: "bold", color: colors.primary }]}>Subtotal Before Discount</Text>
                  <Text style={styles.financialValue}>AED {formatCurrency(subtotalAfterAdditional)}</Text>
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
              <Text style={styles.grandTotalValue}>AED {formatCurrency(grandTotal)}</Text>
            </View>
          </View>

          {/* Terms and Conditions */}
          {termsConditions && termsConditions.length > 0 && (
            <View style={styles.termsCard}>
              <Text style={styles.termsTitle}>Terms & Conditions</Text>
              {termsConditions.map((term, idx) => (
                <View key={idx} style={styles.termItem}>
                  <Text style={styles.termNumber}>{(idx + 1).toString().padStart(2, '0')}.</Text>
                  <Text style={styles.termText}>{term}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Signatures */}
          <View style={styles.signatureGrid}>
            <View style={styles.signatureBlock}>
              <Text style={styles.h3}>Prepared By</Text>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureName}>{preparedBy}</Text>
              <Text style={styles.signatureRole}>
                {preparedByDesignation || formatRole(preparedByRole) || "Interior Design Consultant"}
              </Text>
              <Text style={[styles.signatureRole, { marginTop: 2 }]}>{preparedByContact || ""}</Text>
            </View>

            <View style={styles.signatureBlock}>
              <Text style={styles.h3}>Customer Approval</Text>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureName}>{clientName}</Text>
              <Text style={styles.signatureRole}>{companyName}</Text>
              <Text style={[styles.signatureRole, { marginTop: 2 }]}>Date: ____________________</Text>
            </View>
          </View>
        </View>

        {/* Fixed Absolute Footer */}
        <View fixed style={styles.footer}>
          <View style={{ width: "40%" }}>
            <Text style={styles.footerText}>{companyName}</Text>
            <Text style={styles.footerText}>{companyAddress}</Text>
          </View>
          <View style={{ width: "20%", alignItems: "center" }}>
            <Text style={styles.footerText}>TRN: {companyTrn}</Text>
          </View>
          <View style={{ width: "40%", alignItems: "flex-end" }}>
            <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
              `Page ${pageNumber} of ${totalPages}`
            )} />
          </View>
        </View>

      </Page>
    </Document>
  )
}
