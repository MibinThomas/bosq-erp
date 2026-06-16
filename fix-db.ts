import "dotenv/config"
import prisma from "./src/lib/prisma"

async function main() {
  const allRevised = await prisma.quotation.findMany({
    where: { status: "REVISED" }
  })
  
  console.log(`Found ${allRevised.length} quotations marked as REVISED.`)
  
  for (const q of allRevised) {
    const rootId = q.parentId || q.id
    const newerRevisions = await prisma.quotation.count({
      where: {
        OR: [
          { id: rootId },
          { parentId: rootId }
        ],
        revisionNumber: { gt: q.revisionNumber }
      }
    })
    
    if (newerRevisions === 0) {
      console.log(`Quotation ${q.quotationNumber} is the latest revision but marked as REVISED. Fixing it to DRAFT.`)
      await prisma.quotation.update({
        where: { id: q.id },
        data: { status: "DRAFT" }
      })
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => process.exit(0))
