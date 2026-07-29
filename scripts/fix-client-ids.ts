import 'dotenv/config'
import prisma from '../src/lib/prisma'

async function main() {
  console.log('Starting Client ID Migration...')

  const allClients = await prisma.client.findMany()
  console.log(`Found ${allClients.length} total clients.`)

  let updatedCount = 0
  let skipCount = 0

  for (const client of allClients) {
    // Only target clients that have the incorrect C- prefix
    if (!client.clientId.toUpperCase().startsWith('C-')) {
      continue
    }

    const numericPart = client.clientId.substring(2) // Extracts '1433' from 'C-1433'
    
    // Safety check: Ensure the numeric part is actually a number
    if (isNaN(Number(numericPart))) {
      console.log(`Skipping ${client.clientId} - unexpected format.`)
      continue
    }

    let prefix = 'P' // Default for Project/Special/Other
    const clientType = client.clientType?.toLowerCase() || ''
    
    if (clientType === 'interior') {
      prefix = 'I'
    } else if (clientType === 'dealer') {
      prefix = 'D'
    }

    // New ID uses the exact same numeric part but with correct prefix
    // Ensuring it is 4 digits if it was originally 1-3 digits
    const paddedNumeric = String(Number(numericPart)).padStart(4, '0')
    const newClientId = `${prefix}${paddedNumeric}`

    // Check if new ID already exists
    const existing = await prisma.client.findFirst({
      where: { clientId: newClientId }
    })

    if (existing) {
      console.log(`❌ Cannot update ${client.clientId} to ${newClientId}: ID already exists (Company: ${existing.companyName})`)
      skipCount++
      continue
    }

    // Update in database
    await prisma.client.update({
      where: { id: client.id },
      data: { clientId: newClientId }
    })

    console.log(`✅ Updated ${client.clientId} -> ${newClientId} (${client.clientType})`)
    updatedCount++
  }

  console.log('\n--- Migration Summary ---')
  console.log(`Successfully updated: ${updatedCount}`)
  console.log(`Skipped (conflicts): ${skipCount}`)
}

main()
  .catch((e) => {
    console.error('Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
