export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    ok: true,
    service: "nossocrm",
    timestamp: new Date().toISOString(),
  });
}
