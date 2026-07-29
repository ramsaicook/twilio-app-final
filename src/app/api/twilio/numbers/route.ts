import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { getTwilioSetup, getCredentials } from '@/lib/twilio-setup';

export async function GET(request: Request) {
  const { accountSid, authToken } = getCredentials();
  
  if (!accountSid || !authToken) return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
  
  const client = twilio(accountSid, authToken);
  
  try {
    const incomingNumbers = await client.incomingPhoneNumbers.list({ limit: 20 });
    const numbers = incomingNumbers.map(n => ({
      friendlyName: n.friendlyName,
      phoneNumber: n.phoneNumber,
      sid: n.sid,
      voiceApplicationSid: n.voiceApplicationSid
    }));
    return NextResponse.json({ numbers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { accountSid, authToken } = getCredentials();
  if (!accountSid || !authToken) return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
  
  const client = twilio(accountSid, authToken);
  const { sid } = await request.json();
  
  try {
    const url = new URL(request.url);
    const host = request.headers.get('host') || url.host;
    // Always force HTTPS for e2b.app
    const protocol = host.includes('e2b.app') ? 'https:' : (request.headers.get('x-forwarded-proto') ? `${request.headers.get('x-forwarded-proto')}:` : url.protocol);
    const appUrl = `${protocol}//${host}`;
    
    const setup = await getTwilioSetup(appUrl);
    
    await client.incomingPhoneNumbers(sid).update({
      voiceUrl: `${appUrl}/api/twilio/voice`,
      voiceMethod: 'POST'
    });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
