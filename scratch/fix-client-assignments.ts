import prisma from "../src/lib/prisma"
import { findUserMatch } from "../src/lib/user-matcher"

async function main() {
  const users = await prisma.user.findMany({
    where: { deletedAt: null }
  })

  const clients = await prisma.client.findMany({
    where: { deletedAt: null },
    include: {
      assignments: {
        include: { user: { select: { id: true, name: true, role: true } } }
      }
    }
  })

  console.log(`Scanning ${clients.length} clients for consultant assignment fixes...`)
  let updatedCount = 0

  for (const client of clients) {
    let targetUser: any = null

    // 1. Try matching contactPerson if present
    if (client.contactPerson) {
      targetUser = findUserMatch(users, client.contactPerson)
    }

    // 2. Try matching notes if present and not found yet
    if (!targetUser && client.notes) {
      targetUser = findUserMatch(users, client.notes)
    }

    if (targetUser && targetUser.id) {
      // Check if client is currently assigned to someone else or Admin
      const currentPrimaryUser = client.assignments.find(a => a.isPrimary)?.user?.id || client.salespersonId

      if (currentPrimaryUser !== targetUser.id) {
        console.log(`Re-assigning client "${client.companyName}" (${client.clientId}) to consultant "${targetUser.name}" (${targetUser.role})`)
        
        await prisma.client.update({
          where: { id: client.id },
          data: { salespersonId: targetUser.id }
        })

        // Delete existing primary assignment or all assignments
        await prisma.clientAssignment.deleteMany({
          where: { clientId: client.id }
        })

        // Create new primary assignment
        await prisma.clientAssignment.create({
          data: {
            clientId: client.id,
            userId: targetUser.id,
            isPrimary: true,
            allowAllQuotations: true,
            allowQuotationEdit: true,
            allowRevisionApproval: true,
            allowBoqAccess: true,
            allowPricingVisibility: false
          }
        })

        updatedCount++
      }
    }
  }

  console.log(`Migration complete! Successfully updated ${updatedCount} client assignments.`)
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
