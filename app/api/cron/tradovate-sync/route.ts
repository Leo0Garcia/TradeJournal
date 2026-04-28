import { NextRequest, NextResponse } from 'next/server';
import { syncAllConnections } from '@/lib/tradovate-sync';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Verify this is a legitimate Vercel cron request
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await syncAllConnections();
  return NextResponse.json({ ok: true, ts: new Date().toISOString() });
}
