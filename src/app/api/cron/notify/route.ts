import { NextRequest, NextResponse } from "next/server";
import { sendDailyReminderIfDue } from "@/lib/services/push.service";

// Triggered by Vercel Cron (see vercel.json) every few minutes. Vercel
// automatically sends "Authorization: Bearer <CRON_SECRET>" on cron-invoked
// requests when that env var is set — checking it stops anyone else on the
// internet from hitting this URL and spamming every worker's phone.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendDailyReminderIfDue();
  return NextResponse.json(result);
}
