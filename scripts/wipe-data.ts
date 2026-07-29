import * as dotenv from 'dotenv'
dotenv.config({ path: '.env' })

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

// Use unpooled direct URL for massive delete operations
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
const pool = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('⚠️  WARNING: Starting data wipe operation...')
  console.log('Connecting to database:', process.env.DATABASE_URL?.split('@')[1] || 'Unknown DB')

  try {
    // 1. Delete all Quotation-related data
    console.log('Deleting Quotation Items...')
    const qItems = await prisma.quotationItem.deleteMany()
    console.log(`Deleted ${qItems.count} Quotation Items.`)

    console.log('Deleting Quotation Revisions...')
    const qRevisions = await prisma.quotationRevision.deleteMany()
    console.log(`Deleted ${qRevisions.count} Quotation Revisions.`)

    console.log('Deleting Quotation Assignments...')
    const qAssignments = await prisma.quotationAssignment.deleteMany()
    console.log(`Deleted ${qAssignments.count} Quotation Assignments.`)

    console.log('Deleting Quotations...')
    const quotations = await prisma.quotation.deleteMany()
    console.log(`Deleted ${quotations.count} Quotations.`)

    // 2. Delete BOQ-related data (since BOQs are tied to Clients)
    console.log('Deleting BOQ Items...')
    const boqItems = await prisma.boqItem.deleteMany()
    console.log(`Deleted ${boqItems.count} BOQ Items.`)

    console.log('Deleting BOQs...')
    const boqs = await prisma.boq.deleteMany()
    console.log(`Deleted ${boqs.count} BOQs.`)

    // 3. Delete all Client-related data
    console.log('Deleting Client Documents...')
    const cDocs = await prisma.clientDocument.deleteMany()
    console.log(`Deleted ${cDocs.count} Client Documents.`)

    console.log('Deleting Client Assignments...')
    const cAssignments = await prisma.clientAssignment.deleteMany()
    console.log(`Deleted ${cAssignments.count} Client Assignments.`)

    console.log('Deleting Client Access Requests...')
    const cAccess = await prisma.clientAccessRequest.deleteMany()
    console.log(`Deleted ${cAccess.count} Client Access Requests.`)

    console.log('Deleting Clients...')
    const clients = await prisma.client.deleteMany()
    console.log(`Deleted ${clients.count} Clients.`)

    // 4. Clean up linked logs & trackers
    console.log('Deleting Activity Logs (Client/Quotation/BOQ)...')
    const logs = await prisma.activityLog.deleteMany({
      where: {
        entityType: { in: ['CLIENT', 'QUOTATION', 'BOQ'] }
      }
    })
    console.log(`Deleted ${logs.count} Activity Logs.`)

    console.log('Deleting SharePoint File Links (Client/Quotation/BOQ)...')
    const spFiles = await prisma.sharePointFile.deleteMany({
      where: {
        entityType: { in: ['CLIENT', 'QUOTATION', 'BOQ'] }
      }
    })
    console.log(`Deleted ${spFiles.count} SharePoint Links.`)

    console.log('Resetting Sequence Trackers...')
    const trackers = await prisma.sequenceTracker.deleteMany({
      where: {
        type: { in: ['QUOTATION_BASE', 'CLIENT_BASE'] }
      }
    })
    console.log(`Deleted ${trackers.count} Sequence Trackers.`)

    console.log('\n✅ Data wipe completed successfully!')
  } catch (error) {
    console.error('❌ Failed to wipe data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
