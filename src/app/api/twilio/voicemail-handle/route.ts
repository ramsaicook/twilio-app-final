import { NextResponse } from 'next/server';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const dialCallStatus = formData.get('DialCallStatus') as string;
    
    console.log('Voicemail Handle Triggered, DialCallStatus:', dialCallStatus);
    
    const twiml = new VoiceResponse();
    
    if (dialCallStatus === 'completed' || dialCallStatus === 'answered') {
      // Call was answered successfully, nothing to do
      return new NextResponse(twiml.toString(), {
        headers: { 'Content-Type': 'text/xml' }
      });
    }
    
    // If no-answer, busy, canceled, failed, etc.
    twiml.say({ voice: 'alice' }, 'The person you are calling is unavailable. Please leave a message after the tone.');
    twiml.record({
      playBeep: true,
      maxLength: 120,
      action: '/api/twilio/voicemail-done' // Twilio will call this after recording
    });
    // Fallback if recording fails or ends
    twiml.say({ voice: 'alice' }, 'Goodbye.');
    twiml.hangup();
    
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml', 'Cache-Control': 'no-store, max-age=0' }
    });
  } catch (error) {
    console.error('Voicemail Handle Error', error);
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Error</Say></Response>', { status: 500, headers: { 'Content-Type': 'text/xml' } });
  }
}
