// Removed: debug/dev endpoint must not be reachable in deployed builds.
export async function GET() {
  return new Response("Not Found", { status: 404 })
}
