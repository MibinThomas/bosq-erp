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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1.5,
    borderBottomColor: colors.primary,
    paddingBottom: 15,
    marginBottom: 20,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoImage: {
    width: 175,
    height: 44,
    objectFit: "contain",
  },
  logoTextFallback: {
    fontSize: 22,
    fontWeight: "bold",
    color: colors.primary,
    letterSpacing: 2,
  },
  companyDetails: {
    color: colors.lightText,
    fontSize: 8,
    marginTop: 2,
  },
  titleContainer: {
    alignItems: "flex-end",
  },
  docTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: colors.primary,
    letterSpacing: 1,
    marginBottom: 5,
  },
  
  // Client & Metadata Spacing
  metaContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
    gap: 20,
  },
  clientBox: {
    flex: 1.3,
  },
  clientTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 5,
  },
  clientDetailText: {
    fontSize: 8.5,
    color: colors.secondary,
    marginBottom: 2,
  },
  
  metaBox: {
    flex: 0.7,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 35,
  },
  metaColumn: {
    alignItems: "flex-start",
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 3,
  },
  metaVal: {
    fontSize: 9,
    color: colors.secondary,
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
        
        {/* Corporate Header */}
        <View style={styles.header}>
          <View style={{ marginLeft: -12 }}>
            <View style={styles.logoContainer}>
              {companyLogoUrl ? (
                <PdfImage src={companyLogoUrl} style={styles.logoImage} />
              ) : (
                <Text style={styles.logoTextFallback}>BOSQ</Text>
              )}
            </View>
            <Text style={styles.companyDetails}>{companyAddress}</Text>
            <Text style={styles.companyDetails}>TRN: {companyTrn}</Text>
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.docTitle}>Quotation</Text>
          </View>
        </View>

        {/* Client & Reference Metadata */}
        <View style={styles.metaContainer}>
          <View style={styles.clientBox}>
            <Text style={styles.clientTitle}>{clientName}</Text>
            <Text style={styles.clientDetailText}>{clientContact}</Text>
            <Text style={styles.clientDetailText}>{clientEmail} | {clientPhone}</Text>
            <Text style={styles.clientDetailText}>{clientAddress}</Text>
            {clientTrn && (
              <Text style={styles.clientDetailText}>TRN: {clientTrn}</Text>
            )}
          </View>
          <View style={styles.metaBox}>
            <View style={styles.metaColumn}>
              <Text style={styles.metaLabel}>Date</Text>
              <Text style={styles.metaVal}>{date}</Text>
            </View>
            <View style={styles.metaColumn}>
              <Text style={styles.metaLabel}>Reference</Text>
              <Text style={styles.metaVal}>{quotationNumber}</Text>
            </View>
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
