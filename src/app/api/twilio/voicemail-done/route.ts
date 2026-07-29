import { NextResponse } from 'next/server';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

export async function POST(request: Request) {
  const twiml = new VoiceResponse();
  twiml.say({ voice: 'alice' }, 'Your message has been recorded. Goodbye!');
  twiml.hangup();
  
  return new NextResponse(twiml.toString(), {
    headers: { 'Content-Type': 'text/xml', 'Cache-Control': 'no-store, max-age=0' }
  });
}
