import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image as PdfImage,
} from "@react-pdf/renderer"

// Premium Slate & Corporate Warm Grey palette
const colors = {
  primary: "#0f172a", // Very dark slate (almost black)
  secondary: "#475569", // Slate grey
  accent: "#1e3a8a", // Clean primary blue for categories
  text: "#1e293b", // Slate 800
  lightText: "#64748b", // Slate 500
  lineColor: "#e2e8f0", // Slate 200 thin borders
  bgLight: "#f8fafc", // Very light grey for alternate rows
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
    width: 130,
    height: 33,
    objectFit: "contain",
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
    fontSize: 9,
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
    fontSize: 7.5,
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
    fontSize: 7.5,
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
    alignItems: "center",
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
  },

  // Table Styling
  tableHeader: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#94a3b8",
    borderBottomWidth: 1.5,
    borderBottomColor: colors.primary,
    paddingVertical: 8,
    alignItems: "center",
    fontWeight: "bold",
    color: colors.primary,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.lineColor,
    paddingVertical: 12,
    alignItems: "flex-start",
  },
  colDesc: { width: "46%", paddingRight: 15 },
  colImage: { width: "26%", alignItems: "center", justifyContent: "center", paddingRight: 10 },
  colQty: { width: "8%", textAlign: "center" },
  colPrice: { width: "10%", textAlign: "right" },
  colAmount: { width: "10%", textAlign: "right" },

  itemTitle: {
    fontSize: 9.5,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 3,
  },
  itemCategory: {
    fontSize: 7.5,
    fontWeight: "bold",
    color: colors.accent,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  itemDescText: {
    fontSize: 8,
    color: colors.lightText,
    marginBottom: 5,
    lineHeight: 1.3,
  },
  
  // Dynamic attribute specification styles
  specRow: {
    flexDirection: "row",
    fontSize: 7.5,
    color: colors.secondary,
    marginBottom: 1.5,
  },
  specKey: {
    fontWeight: "bold",
    width: 90,
  },
  specValue: {
    flex: 1,
  },

  productImage: {
    width: 110,
    height: 110,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: "#cbd5e1",
    objectFit: "contain",
    backgroundColor: "#ffffff",
  },

  // Totals layout
  totalsSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
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
    borderTopWidth: 1.5,
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
    borderBottomWidth: 0.5,
    borderBottomColor: "#94a3b8",
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
  specifications?: string | null
  quantity: number
  unitPrice: number
  discount: number
  amount: number
  imageUrl?: string | null
  categoryName?: string | null
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
  termsConditions: string[]
  companyLogoUrl?: string | null // Base64 logo png
  aynMuskLogoUrl?: string | null
  barcodeBase64?: string | null
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
  termsConditions,
  companyLogoUrl,
  aynMuskLogoUrl,
  barcodeBase64,
  clientId,
  items,
}) => {
  const formatCurrency = (val: number) => {
    return val.toLocaleString("en-AE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  // Parses attributes in "Key: Value" newline separated strings dynamically
  const renderSpecifications = (specs: string | null | undefined) => {
    if (!specs) return null
    const lines = specs.split("\n").map(l => l.trim()).filter(l => l !== "")
    return (
      <View style={{ marginTop: 4, gap: 1 }}>
        {lines.map((line, idx) => {
          if (line.includes(":")) {
            const colonIndex = line.indexOf(":")
            const key = line.substring(0, colonIndex).trim()
            const val = line.substring(colonIndex + 1).trim()
            return (
              <View key={idx} style={styles.specRow}>
                <Text style={styles.specKey}>{key}:</Text>
                <Text style={styles.specValue}>{val}</Text>
              </View>
            )
          }
          return (
            <Text key={idx} style={styles.itemDescText}>
              {line}
            </Text>
          )
        })}
      </View>
    )
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* Unified Two-Column Header */}
        <View style={styles.headerContainer}>
          
          {/* Left Column: BOSQ Logo, Company Info & Client Info */}
          <View style={styles.leftColumn}>
            
            {/* Left Logo (BOSQ Logo) */}
            <View style={styles.logoWrapperLeft}>
              {companyLogoUrl ? (
                <PdfImage src={companyLogoUrl} style={styles.logoImageLeft} />
              ) : (
                <Text style={styles.logoTextFallback}>BOSQ</Text>
              )}
            </View>

            {/* Company Info */}
            <View style={styles.companyInfoBlock}>
              <Text style={styles.companyNameText}>AYN MUSK FOR FURNITURE CO. L.L.C.</Text>
              
              <View style={styles.infoRowInline}>
                <Text style={styles.infoKeyInline}>Address:</Text>
                <Text style={styles.infoValueInline}>Office No 133, KML Business Center, Al Quoz 1, Meydan Road, Dubai</Text>
              </View>
              
              <View style={styles.infoRowInline}>
                <Text style={styles.infoKeyInline}>Emirate:</Text>
                <Text style={styles.infoValueInline}>Dubai</Text>
              </View>

              <View style={styles.infoRowInline}>
                <Text style={styles.infoKeyInline}>Email:</Text>
                <Text style={styles.infoValueInline}>accounts@bosq.ae</Text>
              </View>

              <View style={styles.infoRowInline}>
                <Text style={styles.infoKeyInline}>Contact:</Text>
                <Text style={styles.infoValueInline}>+9714 529 9697</Text>
              </View>

              <View style={styles.infoRowInline}>
                <Text style={styles.infoKeyInline}>TRNID:</Text>
                <Text style={styles.infoValueInline}>{companyTrn || "-"}</Text>
              </View>
            </View>

            {/* Spacer */}
            <View style={{ height: 12 }} />

            {/* Client Info (Quotation For) */}
            <View style={styles.clientInfoBlock}>
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
                <Text style={styles.infoKeyInline}>PO BOX:</Text>
                <Text style={styles.infoValueInline}>-</Text>
              </View>

              <View style={styles.infoRowInline}>
                <Text style={styles.infoKeyInline}>Phone:</Text>
                <Text style={styles.infoValueInline}>{clientPhone || "-"}</Text>
              </View>
            </View>

          </View>

          {/* Right Column: AYN MUSK Logo & Quotation Meta details */}
          <View style={styles.rightColumn}>
            
            {/* Right Logo (AYN MUSK Logo) */}
            <View style={styles.logoWrapperRight}>
              {aynMuskLogoUrl ? (
                <PdfImage src={aynMuskLogoUrl} style={styles.logoImageRight} />
              ) : (
                <Text style={styles.logoTextFallback}>AYN MUSK</Text>
              )}
            </View>

            {/* Spacer */}
            <View style={{ height: 6 }} />

            {/* Quotation Details */}
            <View style={styles.quotationDetailsBlock}>
              
              <Text style={styles.quotationHeading}>Quotation</Text>
              
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
                <Text style={styles.metaKeyRight}>Purchase Order:</Text>
                <Text style={styles.metaValueRight}>-</Text>
              </View>

              <View style={styles.metaRowRight}>
                <Text style={styles.metaKeyRight}>Sales Executive:</Text>
                <Text style={styles.metaValueRight}>{preparedBy}</Text>
              </View>

              <View style={styles.metaRowRight}>
                <Text style={styles.metaKeyRight}>Contact Number:</Text>
                <Text style={styles.metaValueRight}>+971 50 360 9762</Text>
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

        {/* Table Headers */}
        <View style={styles.tableHeader}>
          <Text style={styles.colDesc}>Item Description</Text>
          <Text style={[styles.colImage, { textAlign: "center" }]}>Image</Text>
          <Text style={styles.colQty}>QTY</Text>
          <Text style={styles.colPrice}>Price</Text>
          <Text style={styles.colAmount}>Total</Text>
        </View>

        {/* Item Rows */}
        {items.map((item, index) => (
          <View key={index} style={styles.tableRow} wrap={false}>
            {/* Description */}
            <View style={styles.colDesc}>
              <Text style={styles.itemTitle}>{item.description}</Text>
              {item.categoryName && (
                <Text style={styles.itemCategory}>{item.categoryName}</Text>
              )}
              {renderSpecifications(item.specifications)}
            </View>

            {/* Product Image */}
            <View style={styles.colImage}>
              {item.imageUrl ? (
                <PdfImage src={item.imageUrl} style={styles.productImage} />
              ) : (
                <View style={[styles.productImage, { alignItems: "center", justifyContent: "center" }]}>
                  <Text style={{ fontSize: 7, color: colors.lightText }}>No Image Available</Text>
                </View>
              )}
            </View>

            {/* Qty */}
            <Text style={styles.colQty}>{item.quantity}</Text>

            {/* Price (AED) */}
            <Text style={styles.colPrice}>{formatCurrency(item.unitPrice)}</Text>

            {/* Total Amount (AED) */}
            <Text style={styles.colAmount}>{formatCurrency(item.amount)}</Text>
          </View>
        ))}

        {/* Financial Totals & Terms */}
        <View style={styles.totalsSection} wrap={false}>
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
        <View style={styles.signatureSection} wrap={false}>
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

        {/* Absolute Bottom Page Footer */}
        <View style={styles.footer} fixed>
          <View style={styles.footerColLeft}>
            {companyLogoUrl ? (
              <PdfImage src={companyLogoUrl} style={{ width: 60, height: 16, objectFit: "contain" }} />
            ) : (
              <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primary }}>BOSQ</Text>
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
