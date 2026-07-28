import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { clients } = await req.json();

    if (!Array.isArray(clients) || clients.length === 0) {
      return NextResponse.json(
        { error: "Invalid data or empty client list." },
        { status: 400 }
      );
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: any[] = [];

    // Track the highest sequences during import to update the tracker later
    let maxDealerSeq = 0;
    let maxProjectSeq = 0;
    let maxInteriorSeq = 0;

    for (const client of clients) {
      try {
        // client object structure from the CSV:
        // { 'Client Name': '...', 'Client Code': 'D-0001', 'Category': 'DEALER', ... }

        const name = client["Client Name"];
        const code = client["Client Code"];
        const category = client["Category"];
        const contactPerson = client["Contact Person"];
        const phone = client["Phone"];
        const email = client["Email"];
        const priceCategory = client["Price Category"];

        if (!name || !code) continue;

        // Parse sequence for sequence tracker
        const numPart = parseInt(code.split('-')[1] || '0', 10);
        if (category === 'DEALER' && numPart > maxDealerSeq) maxDealerSeq = numPart;
        if (category === 'PROJECT' && numPart > maxProjectSeq) maxProjectSeq = numPart;
        if (category === 'INTERIOR' && numPart > maxInteriorSeq) maxInteriorSeq = numPart;

        // Upsert to handle potential re-imports without failing
        await prisma.client.upsert({
          where: { clientId: code },
          update: {
            companyName: name,
            clientType: category,
            contactPerson: contactPerson || null,
            phone: phone || null,
            email: email || null,
            priceCategory: priceCategory || null,
            status: "Approved",
          },
          create: {
            clientId: code,
            companyName: name,
            clientType: category,
            contactPerson: contactPerson || null,
            phone: phone || null,
            email: email || null,
            priceCategory: priceCategory || null,
            status: "Approved",
          },
        });

        successCount++;
      } catch (err: any) {
        errorCount++;
        errors.push({ client: client["Client Code"], error: err.message });
      }
    }

    // Update sequence trackers
    const updateSequence = async (type: string, lastValue: number, prefix: string) => {
      if (lastValue > 0) {
        await prisma.sequenceTracker.upsert({
          where: { type },
          update: { lastValue: Math.max(lastValue) }, // In a real app we'd fetch and compare, but this is a bulk override
          create: { type, lastValue, prefix, description: `Sequence for ${type}` },
        });
      }
    };

    await updateSequence("CLIENT_D", maxDealerSeq, "D-");
    await updateSequence("CLIENT_P", maxProjectSeq, "P-");
    await updateSequence("CLIENT_I", maxInteriorSeq, "I-");

    return NextResponse.json({
      message: `Successfully imported ${successCount} clients.`,
      successCount,
      errorCount,
      errors,
    });
  } catch (error: any) {
    console.error("Bulk import error:", error);
    return NextResponse.json(
      { error: "Internal server error during import." },
      { status: 500 }
    );
  }
}
