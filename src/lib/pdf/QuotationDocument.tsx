import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image as PdfImage,
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
  white: "#ffffff",
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 45,
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
    marginBottom: 22,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineColor,
    paddingBottom: 15,
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
    width: 176,
    height: 56,
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
    alignItems: "flex-end",
  },
  barcodeImage: {
    width: 140,
    height: 25,
    objectFit: "contain",
    objectPositionX: "right",
  },
  barcodeText: {
    fontSize: 7,
    color: colors.secondary,
    marginTop: 2,
    letterSpacing: 0.5,
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
  colDesc: { width: "45%", paddingRight: 20 },
  colImage: { width: "25%", alignItems: "flex-start", justifyContent: "flex-start", paddingRight: 10 },
  colRight: { width: "30%", flexDirection: "row", alignItems: "flex-start" },
  colQty: { width: "20%", textAlign: "center" },
  colPrice: { width: "40%", textAlign: "right" },
  colAmount: { width: "40%", textAlign: "right" },

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
    color: "#0f4c81",
    textTransform: "uppercase",
    marginBottom: 3,
    letterSpacing: 0.8,
  },
  itemDescText: {
    fontSize: 6.5,
    color: "#444444",
    marginBottom: 4,
    lineHeight: 1.35,
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
    width: 145,
    height: 145,
    objectFit: "contain",
  },

  // Totals layout
  totalsSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    gap: 40,
  },
  termsBox: {
    flex: 1.2,
  },
  termsTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 5,
    textTransform: "uppercase",
  },
  termRow: {
    fontSize: 7.5,
    color: colors.secondary,
    marginBottom: 3,
  },
  
  totalsBox: {
    flex: 0.8,
    borderTopWidth: 1,
    borderTopColor: colors.primary,
    paddingTop: 8,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  totalsLabel: {
    color: colors.secondary,
    fontSize: 8.5,
  },
  totalsValue: {
    fontWeight: "bold",
    fontSize: 8.5,
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.primary,
    paddingTop: 6,
    marginTop: 6,
  },
  grandTotalLabel: {
    fontWeight: "bold",
    fontSize: 10.5,
    color: colors.primary,
  },
  grandTotalValue: {
    fontWeight: "bold",
    fontSize: 10.5,
    color: colors.primary,
  },

  // Signatures
  signatureSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 35,
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
  footerPageNum: {
    fontSize: 8.5,
    color: colors.secondary,
    fontWeight: "bold",
  }
})

export interface QuotationPdfItem {
  itemNo: number
  description: string
  shortDescription?: string | null
  specifications?: string | null
  productNotes?: string | null
  quantity: number
  unitPrice: number
  discount: number
  amount: number
  imageUrl?: string | null
  categoryName?: string | null
  chairType?: string | null
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
  salesAgentName?: string | null
  termsConditions: string[]
  companyLogoUrl?: string | null // Base64 logo png
  aynMuskLogoUrl?: string | null
  barcodeBase64?: string | null
  watermarkUrl?: string | null
  clientId?: string | null
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
  salesAgentName,
  termsConditions,
  companyLogoUrl,
  aynMuskLogoUrl,
  barcodeBase64,
  watermarkUrl,
  clientId,
  items,
}) => {
  const formatCurrency = (val: number) => {
    return val.toLocaleString("en-AE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  const sanitizeHtmlToText = (html: string) => {
    if (!html) return "";
    let text = html;
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
    return text.trim();
  }

  const renderSpecifications = (specs: string | null | undefined, productNotes?: string | null) => {
    if (!specs && !productNotes) return null;

    const rawText = sanitizeHtmlToText(specs || "");
    const lines = rawText.split("\n").map((l) => l.trim()).filter((l) => l !== "");

    let normalSpecs: React.ReactNode[] = [];
    let productionTime: string | null = null;
    let remarksLines: string[] = [];
    let warranty: string | null = null;
    
    let currentContext = "normal";

    lines.forEach((line, idx) => {
      let isKeyLine = false;
      let key = "";
      let val = "";
      
      if (line.includes(":")) {
        const colonIndex = line.indexOf(":");
        key = line.substring(0, colonIndex).trim();
        val = line.substring(colonIndex + 1).trim();
        isKeyLine = true;
      }
      
      if (isKeyLine && key.toLowerCase().includes("production time")) {
        currentContext = "productionTime";
        productionTime = val;
      } else if (isKeyLine && key.toLowerCase().includes("remarks")) {
        currentContext = "remarks";
        if (val) remarksLines.push(val);
      } else if (isKeyLine && key.toLowerCase().includes("warranty")) {
        currentContext = "normal";
        warranty = val;
      } else if (isKeyLine) {
        currentContext = "normal";
        normalSpecs.push(
          <View key={`spec-${idx}`} style={styles.specRow}>
            <Text style={styles.specKey}>{key}:</Text>
            <Text style={styles.specValue}>{val}</Text>
          </View>
        );
      } else {
        if (currentContext === "remarks") {
          remarksLines.push(line);
        } else {
          normalSpecs.push(
            <Text key={`text-${idx}`} style={[styles.specValue, { marginBottom: 2.5, lineHeight: 1.3 }]}>
              {line}
            </Text>
          );
        }
      }
    });

    if (productNotes) {
      remarksLines.push(productNotes);
    }

    return (
      <View style={{ marginTop: 2 }}>
        {normalSpecs.length > 0 && <View style={{ marginBottom: 2 }}>{normalSpecs}</View>}
        
        {productionTime && (
          <View style={{ marginBottom: 2 }}>
            <Text style={[styles.specKey, { color: "#1e3a8a", width: "100%" }]}>
              Production Time: <Text style={[styles.specValue, { color: "#1e3a8a" }]}>{productionTime}</Text>
            </Text>
          </View>
        )}

        {warranty && (
          <View style={[styles.specRow, { marginBottom: 2 }]}>
            <Text style={styles.specKey}>Warranty:</Text>
            <Text style={styles.specValue}>{warranty}</Text>
          </View>
        )}
        
        {remarksLines.length > 0 && (
          <View style={{ marginTop: 2, flexDirection: "row", paddingLeft: 0, marginLeft: 0 }}>
            <Text style={{ fontWeight: "bold", fontSize: 6.5, color: colors.accent, marginRight: 4, paddingLeft: 0, marginLeft: 0 }}>Remarks:</Text>
            <View style={{ flex: 1 }}>
              {remarksLines.map((r, i) => (
                <Text key={i} style={{ fontSize: 6.5, color: colors.secondary, marginBottom: 1 }}>{r}</Text>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  }

  return (
    <Document>
      <Page size="A4" style={[styles.page, items.length === 1 ? { paddingBottom: 55 } : {}]}>
        
        {/* Bottom Right Watermark Logo (Repeats on every page) */}
        {watermarkUrl && (
          <View fixed style={{ position: "absolute", bottom: -130, right: -310, zIndex: -1 }}>
            <PdfImage src={watermarkUrl} style={{ width: 338 }} />
          </View>
        )}

        {/* Unified Two-Row Header for Perfect Horizontal Alignment */}
        <View style={[styles.headerContainer, { flexDirection: "column" }, items.length === 1 ? { marginBottom: 12, paddingBottom: 8 } : {}]}>
          
          {/* Top Row: Logo & Quotation Title */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", width: "100%", marginBottom: 16 }}>
            {/* Left Logo (BOSQ Logo) */}
            <View style={{ alignItems: "flex-start" }}>
              {companyLogoUrl ? (
                <PdfImage src={companyLogoUrl} style={styles.logoImageLeft} />
              ) : (
                <Text style={styles.logoTextFallback}>BOSQ</Text>
              )}
            </View>
            
            {/* Quotation Title */}
            <Text style={[styles.quotationHeading, { marginBottom: 0, marginTop: 30 }]}>Quotation</Text>
          </View>

          {/* Bottom Row: Client Info & Meta Details */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
            
            {/* Left Column: Client Info */}
            <View style={styles.leftColumn}>
              <View style={styles.clientInfoBlock}>
                <Text style={[styles.companyNameText, { marginBottom: 6 }]}>CLIENT INFORMATION</Text>
                
                <View style={styles.infoRowInline}>
                  <Text style={styles.infoKeyInline}>Quotation for:</Text>
                  <Text style={styles.infoValueInline}>{clientContact}</Text>
                </View>

                <View style={styles.infoRowInline}>
                  <Text style={styles.infoKeyInline}>Company Name:</Text>
                  <Text style={styles.infoValueInline}>{clientName}</Text>
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
                  <Text style={styles.metaKeyRight}>TRNID:</Text>
                  <Text style={styles.metaValueRight}>{clientTrn || "-"}</Text>
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

              {/* Barcode & Barcode Text underneath */}
              {barcodeBase64 && (
                <View style={styles.barcodeWrapper}>
                  <PdfImage src={barcodeBase64} style={styles.barcodeImage} />
                  <Text style={styles.barcodeText}>{quotationNumber}</Text>
                </View>
              )}
            </View>

          </View>

          {/* Bottom Row: Sales Executive & Project Name */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", width: "100%", marginTop: 16 }}>
            <View style={{ flexDirection: "row" }}>
              <Text style={{ fontWeight: "bold", color: "#827f82", fontSize: 6.75 }}>Sales Executive: </Text>
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

        {/* Table Headers */}
        <View style={[styles.tableHeader, items.length === 1 ? { paddingVertical: 6 } : {}]}>
          <Text style={styles.colDesc}>Item Description</Text>
          <Text style={[styles.colImage, { textAlign: "center" }]}>Image</Text>
          <View style={styles.colRight}>
            <Text style={styles.colQty}>QTY</Text>
            <Text style={styles.colPrice}>Price</Text>
            <Text style={styles.colAmount}>Total</Text>
          </View>
        </View>

        {/* Item Rows */}
        {items.map((item, index) => (
          <View key={index} style={[styles.tableRow, items.length === 1 ? { paddingVertical: 10 } : {}]} wrap={false}>
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
                <View style={{ flexDirection: "row", marginTop: -2, marginBottom: 4, fontSize: 6.5 }}>
                  <Text style={{ fontWeight: "bold", color: colors.primary }}>Chair Type: </Text>
                  <Text style={{ color: "#444444", marginLeft: 3 }}>{item.chairType}</Text>
                </View>
              )}

              {/* 3. Short Description */}
              {item.shortDescription && (
                <Text style={styles.itemDescText}>{item.shortDescription}</Text>
              )}

              {/* 4, 5, 6. Specs, Prod Time, Remarks */}
              {renderSpecifications(item.specifications, item.productNotes)}
            </View>

            {/* Product Image */}
            <View style={styles.colImage}>
              {item.imageUrl ? (
                <PdfImage src={item.imageUrl} style={styles.productImage} />
              ) : (
                <View style={[styles.productImage, { alignItems: "center", justifyContent: "center", border: "1px solid #E6E7E8" }]}>
                  <Text style={{ fontSize: 8.5, color: colors.lightText }}>No Image Available</Text>
                </View>
              )}
            </View>

            {/* Qty, Price, Total Grouped into 30% Column */}
            <View style={styles.colRight}>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>{formatCurrency(item.unitPrice)}</Text>
              <Text style={styles.colAmount}>{formatCurrency(item.amount)}</Text>
            </View>
          </View>
        ))}

        {/* Group Totals and Signatures to prevent orphaned signature page */}
        <View wrap={false}>
          {/* Financial Totals & Terms */}
          <View style={[styles.totalsSection, { marginTop: items.length === 1 ? 24 : 32 }]}>
            {/* Left Terms & Conditions */}
            <View style={styles.termsBox}>
              {termsConditions && termsConditions.length > 0 && (
                <>
                  <Text style={styles.termsTitle}>Terms & Conditions</Text>
                  {termsConditions.map((term, idx) => (
                    <Text key={idx} style={styles.termRow}>
                      {idx + 1}. {term}
                    </Text>
                  ))}
                </>
              )}
            </View>

            {/* Right Sum Box */}
            <View style={styles.totalsBox}>
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Subtotal</Text>
                <Text style={styles.totalsValue}>{formatCurrency(subtotal)}</Text>
              </View>
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>VAT (5%)</Text>
                <Text style={styles.totalsValue}>{formatCurrency(vatAmount)}</Text>
              </View>
              {deliveryCharge > 0 && (
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>Delivery & Install</Text>
                  <Text style={styles.totalsValue}>{formatCurrency(deliveryCharge)}</Text>
                </View>
              )}
              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>Grand Total</Text>
                <Text style={styles.grandTotalValue}>AED {formatCurrency(grandTotal)}</Text>
              </View>
            </View>
          </View>

          {/* Signatures */}
          <View style={[styles.signatureSection, items.length === 1 ? { marginTop: 20 } : {}]}>
            <View style={styles.signatureBox}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Prepared By</Text>
              <Text style={styles.signatureCompany}>{preparedBy} | {companyName}</Text>
            </View>
            <View style={styles.signatureBox}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Accepted & Approved By</Text>
              <Text style={styles.signatureCompany}>Authorized Customer Signature</Text>
            </View>
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
            <Text style={styles.footerText}>TRN: {companyTrn}</Text>
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
