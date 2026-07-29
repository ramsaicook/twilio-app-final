import { NextResponse } from 'next/server';
import twilio from 'twilio';

const AccessToken = twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;

export async function POST(request: Request) {
  try {
    const { accountSid, apiKey, apiSecret, twimlAppSid } = await request.json();
    
    if (!accountSid || !apiKey || !apiSecret || !twimlAppSid) {
      return NextResponse.json({ error: 'Missing Twilio App credentials in request body' }, { status: 400 });
    }

    const identity = 'web-user';
    const token = new AccessToken(accountSid, apiKey, apiSecret, { identity });
    
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: twimlAppSid,
      incomingAllow: true,
    });
    
    token.addGrant(voiceGrant);
    
    return NextResponse.json({ token: token.toJwt(), identity });
  } catch (error: any) {
    console.error("Token error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
