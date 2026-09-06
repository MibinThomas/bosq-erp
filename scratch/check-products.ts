import prisma from "../src/lib/prisma"

async function main() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      productCode: true,
      productName: true,
      isMaster: true,
      parentProductId: true,
      parentProduct: {
        select: { productName: true }
      },
      variants: {
        select: { id: true, productCode: true, productName: true }
      }
    }
  })
  console.log(`Total products in DB: ${products.length}`)
  console.log(JSON.stringify(products, null, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())
