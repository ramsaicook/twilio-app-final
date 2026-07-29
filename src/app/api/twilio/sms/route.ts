import { NextResponse } from 'next/server';
import twilio from 'twilio';

export async function GET(request: Request) {
  const accountSid = request.headers.get('x-twilio-sid');
  const authToken = request.headers.get('x-twilio-token');
  if (!accountSid || !authToken) return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
  
  const client = twilio(accountSid, authToken);
  
  try {
    const messages = await client.messages.list({ limit: 50 });
    return NextResponse.json({ messages: messages.map(m => ({
      sid: m.sid,
      body: m.body,
      from: m.from,
      to: m.to,
      direction: m.direction,
      status: m.status,
      dateSent: m.dateSent
    })) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const accountSid = request.headers.get('x-twilio-sid');
  const authToken = request.headers.get('x-twilio-token');
  if (!accountSid || !authToken) return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
  
  const client = twilio(accountSid, authToken);
  const body = await request.json();
  const { to, from, body: messageBody } = body;
  
  try {
    const msg = await client.messages.create({
      body: messageBody,
      from: from,
      to: to
    });
    return NextResponse.json({ success: true, sid: msg.sid });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
