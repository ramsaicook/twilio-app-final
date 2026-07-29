import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { getCredentials } from '@/lib/twilio-setup';

export async function GET(request: Request) {
  const { accountSid, authToken } = getCredentials();
  if (!accountSid || !authToken) return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
  
  const client = twilio(accountSid, authToken);
  
  try {
    const recordings = await client.recordings.list({ limit: 50 });
    return NextResponse.json({ recordings: recordings.map(r => ({
      sid: r.sid,
      duration: r.duration,
      status: r.status,
      dateCreated: r.dateCreated,
      mediaUrl: `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${r.sid}.mp3`
    })) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
