import { NextResponse } from 'next/server';
import twilio from 'twilio';

export async function GET(request: Request) {
  const accountSid = request.headers.get('x-twilio-sid');
  const authToken = request.headers.get('x-twilio-token');
  
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
