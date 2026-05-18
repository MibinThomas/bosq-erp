import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image as PdfImage,
} from "@react-pdf/renderer"

// Premium color palette
const colors = {
  primary: "#1e293b", // Slate 800
  secondary: "#475569", // Slate 600
  accent: "#d97706", // Amber 600 for BOSQ premium highlight
  text: "#0f172a", // Slate 900
  lightText: "#64748b", // Slate 500
  border: "#cbd5e1", // Slate 300
  bgLight: "#f8fafc", // Slate 50
  white: "#ffffff",
}

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: colors.text,
    lineHeight: 1.4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottom: 1.5,
    borderBottomColor: colors.primary,
    paddingBottom: 15,
    marginBottom: 20,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoIcon: {
    width: 25,
    height: 25,
    backgroundColor: colors.primary,
    borderRadius: 4,
    marginRight: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  logoIconText: {
    color: colors.white,
    fontWeight: "bold",
    fontSize: 12,
  },
  companyName: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.primary,
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
    fontSize: 18,
    fontWeight: "bold",
    color: colors.primary,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  docMeta: {
    fontSize: 8,
    color: colors.secondary,
    textAlign: "right",
  },
  detailsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 15,
  },
  clientBox: {
    flex: 1.2,
    border: 0.5,
    borderColor: colors.border,
    borderRadius: 4,
    padding: 10,
    backgroundColor: colors.bgLight,
  },
  projectBox: {
    flex: 0.8,
    border: 0.5,
    borderColor: colors.border,
    borderRadius: 4,
    padding: 10,
    backgroundColor: colors.bgLight,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.primary,
    borderBottom: 0.5,
    borderBottomColor: colors.border,
    paddingBottom: 3,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  detailLabel: {
    width: 60,
    fontWeight: "bold",
    color: colors.secondary,
    fontSize: 8,
  },
  detailValue: {
    flex: 1,
    fontSize: 8,
  },
  table: {
    width: "auto",
    borderStyle: "solid",
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.primary,
    color: colors.white,
    fontWeight: "bold",
    padding: 6,
    alignItems: "center",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    padding: 6,
    alignItems: "center",
  },
  tableRowEven: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    padding: 6,
    alignItems: "center",
    backgroundColor: colors.bgLight,
  },
  colNo: { width: "5%", textAlign: "center" },
  colDesc: { width: "45%", paddingRight: 5 },
  colQty: { width: "8%", textAlign: "center" },
  colPrice: { width: "14%", textAlign: "right" },
  colDiscount: { width: "14%", textAlign: "right" },
  colAmount: { width: "14%", textAlign: "right" },
  
  colTextBold: { fontWeight: "bold" },
  colTextLight: { color: colors.lightText, fontSize: 7, marginTop: 2 },

  totalsContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 25,
  },
  totalsBox: {
    width: 180,
    border: 0.5,
    borderColor: colors.border,
    borderRadius: 4,
    padding: 8,
    backgroundColor: colors.bgLight,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  totalsLabel: {
    color: colors.secondary,
    fontSize: 8,
  },
  totalsValue: {
    fontWeight: "bold",
    fontSize: 8,
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.primary,
    paddingTop: 4,
    marginTop: 4,
  },
  grandTotalLabel: {
    fontWeight: "bold",
    fontSize: 10,
    color: colors.primary,
  },
  grandTotalValue: {
    fontWeight: "bold",
    fontSize: 10,
    color: colors.accent,
  },

  termsContainer: {
    marginBottom: 30,
  },
  termsTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 5,
  },
  termItem: {
    fontSize: 7.5,
    color: colors.secondary,
    marginBottom: 2.5,
    paddingLeft: 5,
  },

  signatureContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: "auto",
    paddingTop: 30,
    gap: 50,
  },
  signatureBox: {
    flex: 1,
    alignItems: "center",
  },
  signatureLine: {
    width: "100%",
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    marginBottom: 5,
  },
  signatureLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.secondary,
  },
  signatureSub: {
    fontSize: 7,
    color: colors.lightText,
  },
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
  items,
}) => {
  const formatCurrency = (val: number) => {
    return val.toLocaleString("en-AE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <View style={styles.logoContainer}>
              <View style={styles.logoIcon}>
                <Text style={styles.logoIconText}>BQ</Text>
              </View>
              <Text style={styles.companyName}>{companyName}</Text>
            </View>
            <Text style={styles.companyDetails}>{companyAddress}</Text>
            <Text style={styles.companyDetails}>TRN: {companyTrn}</Text>
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.docTitle}>QUOTATION</Text>
            <Text style={styles.docMeta}>Quote No: {quotationNumber}</Text>
            <Text style={styles.docMeta}>Date: {date}</Text>
            <Text style={styles.docMeta}>Validity: {validityDate}</Text>
          </View>
        </View>

        {/* Client & Project Details */}
        <View style={styles.detailsContainer}>
          <View style={styles.clientBox}>
            <Text style={styles.sectionTitle}>Client Details</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Company:</Text>
              <Text style={styles.detailValue}>{clientName}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Contact:</Text>
              <Text style={styles.detailValue}>{clientContact}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Phone/Email:</Text>
              <Text style={styles.detailValue}>
                {clientPhone} / {clientEmail}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Address:</Text>
              <Text style={styles.detailValue}>{clientAddress}</Text>
            </View>
            {clientTrn && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>TRN:</Text>
                <Text style={styles.detailValue}>{clientTrn}</Text>
              </View>
            )}
          </View>

          <View style={styles.projectBox}>
            <Text style={styles.sectionTitle}>Project & Logistics</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Project Name:</Text>
              <Text style={styles.detailValue}>{projectName || "N/A"}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Delivery Date:</Text>
              <Text style={styles.detailValue}>{deliveryDate || "TBD"}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Payment Terms:</Text>
              <Text style={styles.detailValue}>{paymentTerms}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Prepared By:</Text>
              <Text style={styles.detailValue}>{preparedBy}</Text>
            </View>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.colNo, styles.colTextBold]}>#</Text>
            <Text style={[styles.colDesc, styles.colTextBold]}>Description</Text>
            <Text style={[styles.colQty, styles.colTextBold]}>Qty</Text>
            <Text style={[styles.colPrice, styles.colTextBold]}>Price (AED)</Text>
            <Text style={[styles.colDiscount, styles.colTextBold]}>Disc (AED)</Text>
            <Text style={[styles.colAmount, styles.colTextBold]}>Amount (AED)</Text>
          </View>

          {items.map((item, index) => (
            <View
              key={index}
              style={index % 2 === 0 ? styles.tableRow : styles.tableRowEven}
            >
              <Text style={styles.colNo}>{item.itemNo}</Text>
              <View style={styles.colDesc}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  {item.imageUrl && (
                    <PdfImage 
                      src={item.imageUrl} 
                      style={{ width: 32, height: 32, borderRadius: 3, borderWidth: 0.5, borderColor: colors.border, objectFit: "contain", backgroundColor: colors.bgLight, marginRight: 6 }} 
                    />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.colTextBold}>{item.description}</Text>
                    {item.specifications && (
                      <Text style={styles.colTextLight}>{item.specifications}</Text>
                    )}
                  </View>
                </View>
              </View>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>{formatCurrency(item.unitPrice)}</Text>
              <Text style={styles.colDiscount}>{formatCurrency(item.discount)}</Text>
              <Text style={styles.colAmount}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal:</Text>
              <Text style={styles.totalsValue}>AED {formatCurrency(subtotal)}</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>VAT (5%):</Text>
              <Text style={styles.totalsValue}>AED {formatCurrency(vatAmount)}</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Delivery & Install:</Text>
              <Text style={styles.totalsValue}>AED {formatCurrency(deliveryCharge)}</Text>
            </View>
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Grand Total:</Text>
              <Text style={styles.grandTotalValue}>AED {formatCurrency(grandTotal)}</Text>
            </View>
          </View>
        </View>

        {/* Terms and Conditions */}
        {termsConditions && termsConditions.length > 0 && (
          <View style={styles.termsContainer}>
            <Text style={styles.termsTitle}>Terms & Conditions:</Text>
            {termsConditions.map((term, index) => (
              <Text key={index} style={styles.termItem}>
                {index + 1}. {term}
              </Text>
            ))}
          </View>
        )}

        {/* Signatures */}
        <View style={styles.signatureContainer}>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Prepared By</Text>
            <Text style={styles.signatureSub}>BOSQ Sales Representative</Text>
          </View>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Accepted & Approved By</Text>
            <Text style={styles.signatureSub}>Authorized Client Signature</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
