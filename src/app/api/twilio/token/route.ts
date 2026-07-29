import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { getTwilioSetup, getCredentials } from '@/lib/twilio-setup';

const AccessToken = twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const host = request.headers.get('host') || url.host;
    // Always force HTTPS for e2b.app
    const protocol = host.includes('e2b.app') ? 'https:' : (request.headers.get('x-forwarded-proto') ? `${request.headers.get('x-forwarded-proto')}:` : url.protocol);
    const appUrl = `${protocol}//${host}`;
    
    const { accountSid } = getCredentials();
    if (!accountSid) throw new Error('Missing credentials');

    const setup = await getTwilioSetup(appUrl);
    
    const identity = 'web-user';
    
    const token = new AccessToken(
      accountSid,
      setup.apiKey,
      setup.apiSecret,
      { identity }
    );
    
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: setup.twimlAppSid,
      incomingAllow: true,
    });
    
    token.addGrant(voiceGrant);
    
    return NextResponse.json({
      token: token.toJwt(),
      identity
    });
  } catch (error: any) {
    console.error("Token error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
