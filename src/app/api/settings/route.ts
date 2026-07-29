import { NextResponse } from 'next/server';
import twilio from 'twilio';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { accountSid, authToken, forwardingNumber, doNotDisturb, recordCalls } = body;
    let { apiKey, apiSecret, twimlAppSid } = body;
    
    if (!accountSid || !authToken) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    const client = twilio(accountSid, authToken);
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    
    const voiceUrl = new URL(`${protocol}://${host}/api/twilio/voice`);
    if (forwardingNumber) voiceUrl.searchParams.set('fwd', forwardingNumber);
    if (doNotDisturb) voiceUrl.searchParams.set('dnd', '1');
    if (recordCalls) voiceUrl.searchParams.set('rec', '1');

    // Setup TwiML App
    if (!twimlAppSid) {
      const apps = await client.applications.list({ friendlyName: 'Web Phone App' });
      if (apps.length > 0) {
        twimlAppSid = apps[0].sid;
        await client.applications(twimlAppSid).update({ voiceUrl: voiceUrl.toString() });
      } else {
        const app = await client.applications.create({ friendlyName: 'Web Phone App', voiceUrl: voiceUrl.toString() });
        twimlAppSid = app.sid;
      }
    } else {
      await client.applications(twimlAppSid).update({ voiceUrl: voiceUrl.toString() });
    }

    // Setup API Key
    if (!apiKey || !apiSecret) {
      const key = await client.newKeys.create({ friendlyName: 'Web Phone Key' });
      apiKey = key.sid;
      apiSecret = key.secret;
    }

    // Update incoming numbers
    const numbers = await client.incomingPhoneNumbers.list();
    for (const num of numbers) {
      await client.incomingPhoneNumbers(num.sid).update({
        voiceUrl: voiceUrl.toString(),
        voiceMethod: 'POST'
      });
    }

    return NextResponse.json({ 
      success: true, 
      apiKey, 
      apiSecret, 
      twimlAppSid 
    });
  } catch (error: any) {
    console.error('Settings save error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
