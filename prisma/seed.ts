import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  // 1. Create Default Users
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@bosq.ae" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@bosq.ae",
      role: "ADMIN",
    },
  })

  const salesUser = await prisma.user.upsert({
    where: { email: "sales@bosq.ae" },
    update: {},
    create: {
      name: "John Doe",
      email: "sales@bosq.ae",
      role: "SALES_EXECUTIVE",
    },
  })

  console.log("Users seeded successfully.")

  // 2. Create Default Payment Terms
  const paymentTerms = [
    { name: "50% Advance, 50% on Delivery", description: "50% advance payment with purchase order, balance 50% on delivery", isDefault: true },
    { name: "100% Advance", description: "100% advance payment with purchase order", isDefault: false },
    { name: "30 Days PDC", description: "30 Days Post-Dated Cheque from delivery date", isDefault: false },
  ]

  for (const term of paymentTerms) {
    await prisma.paymentTerm.upsert({
      where: { name: term.name },
      update: {},
      create: term,
    })
  }

  console.log("Payment terms seeded successfully.")

  // 3. Create Default Terms & Conditions
  const termsConditions = [
    { title: "Delivery Time", content: "Delivery will be within 4-6 weeks from receipt of advance payment and approved drawing.", isDefault: true },
    { title: "Validity", content: "This quotation is valid for 30 days from the date of issue.", isDefault: true },
    { title: "Warranty", content: "All structural components carry a warranty of 5 years against manufacturing defects.", isDefault: true },
    { title: "Vat Clause", content: "5% VAT will be applicable on all prices as per UAE Federal Law.", isDefault: true },
  ]

  for (const tc of termsConditions) {
    await prisma.termsCondition.upsert({
      where: { title: tc.title },
      update: {},
      create: tc,
    })
  }

  console.log("Terms & Conditions seeded successfully.")

  // 4. Create Default Clients
  const clients = [
    {
      clientId: "C-1001",
      companyName: "Acme Corp",
      contactPerson: "John Smith",
      email: "john@acme.com",
      phone: "+971 50 123 4567",
      clientType: "Corporate",
      address: "Downtown Dubai, UAE",
      trn: "100012345678901",
      salespersonId: salesUser.id,
    },
    {
      clientId: "C-1002",
      companyName: "TechFlow LLC",
      contactPerson: "Sarah Johnson",
      email: "sarah@techflow.ae",
      phone: "+971 55 987 6543",
      clientType: "Government",
      address: "Dubai Internet City, UAE",
      trn: "100012345678902",
      salespersonId: salesUser.id,
    },
    {
      clientId: "C-1003",
      companyName: "Global Trade Inc",
      contactPerson: "Ahmed Ali",
      email: "ahmed@globaltrade.com",
      phone: "+971 52 456 7890",
      clientType: "Corporate",
      address: "Deira, Dubai, UAE",
      trn: "100012345678903",
      salespersonId: salesUser.id,
    },
  ]

  for (const client of clients) {
    await prisma.client.upsert({
      where: { clientId: client.clientId },
      update: {},
      create: client,
    })
  }

  console.log("Clients seeded successfully.")

  // 5. Create Product Categories and Products
  const categories = [
    { name: "Workstations", description: "Office workstations and desks systems" },
    { name: "Executive desks", description: "Premium executive wood and steel desks" },
    { name: "Ergonomic chairs", description: "High back and mid back task seating chairs" },
  ]

  for (const cat of categories) {
    const category = await prisma.productCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    })

    if (cat.name === "Workstations") {
      await prisma.product.upsert({
        where: { productCode: "WS-01" },
        update: {},
        create: {
          productCode: "WS-01",
          productName: "Linear Workstation for 4",
          categoryId: category.id,
          unitPrice: 2450.00,
          costPrice: 1600.00,
          availableColors: "White, Walnut, Oak",
          dimensions: "2400x1200x750 mm",
          warranty: "5 Years",
          description: "4-seater linear workstation with screen dividers and metal legs",
          specifications: "25mm MDF top with PVC edge, aluminum screen divider with fabric pinning board, steel legs with cable management."
        }
      })
    } else if (cat.name === "Executive desks") {
      await prisma.product.upsert({
        where: { productCode: "ED-05" },
        update: {},
        create: {
          productCode: "ED-05",
          productName: "Executive Desk L-Shape",
          categoryId: category.id,
          unitPrice: 4200.00,
          costPrice: 2800.00,
          availableColors: "Mahogany, Charcoal, Walnut",
          dimensions: "2000x1600x750 mm",
          warranty: "5 Years",
          description: "Premium L-shaped executive desk with side return cabinet",
          specifications: "MDF wood veneer finish, high-quality leather pad insert, soft-close side cabinet with drawers and cable access."
        }
      })
    } else if (cat.name === "Ergonomic chairs") {
      await prisma.product.upsert({
        where: { productCode: "EC-12" },
        update: {},
        create: {
          productCode: "EC-12",
          productName: "Ergonomic Mesh Chair",
          categoryId: category.id,
          unitPrice: 850.00,
          costPrice: 500.00,
          availableColors: "Black, Grey, Blue",
          dimensions: "650x650x1200 mm",
          warranty: "3 Years",
          description: "Premium mesh high-back chair with lumbar support",
          specifications: "Breathable Korean mesh, 3D adjustable armrests, multi-lock synchronized mechanism, class-4 gas lift."
        }
      })
    }
  }

  console.log("Products and Categories seeded successfully.")

  // 6. Create a Demo Quotation
  const dbClient = await prisma.client.findFirst({ where: { clientId: "C-1001" } })
  const dbProduct = await prisma.product.findFirst({ where: { productCode: "WS-01" } })

  if (dbClient && dbProduct) {
    const quoteNo = "I1951"
    const existingQuote = await prisma.quotation.findUnique({ where: { quotationNumber: quoteNo } })

    if (!existingQuote) {
      const subtotal = dbProduct.unitPrice * 2
      const vatAmount = subtotal * 0.05
      const grandTotal = subtotal + vatAmount

      await prisma.quotation.create({
        data: {
          quotationNumber: quoteNo,
          clientId: dbClient.id,
          projectName: "HQ Office Fitout",
          validityDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          preparedById: salesUser.id,
          paymentTerms: "50% Advance, 50% on Delivery",
          status: "APPROVED",
          poStatus: "RECEIVED",
          subtotal,
          vatAmount,
          grandTotal,
          sharepointUrl: `https://sharepoint.bosq.ae/Clients/${encodeURIComponent(dbClient.companyName)}/Quotations/${quoteNo}.pdf`,
          items: {
            create: {
              itemNo: 1,
              productId: dbProduct.id,
              description: dbProduct.productName,
              specifications: dbProduct.specifications,
              quantity: 2,
              unitPrice: dbProduct.unitPrice,
              amount: subtotal,
            }
          }
        }
      })
      console.log("Demo Quotation seeded successfully.")
    }
  }

  console.log("Seeding complete.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
