import { NextResponse } from 'next/server';
import twilio from 'twilio';
import fs from 'fs';
import path from 'path';

const VoiceResponse = twilio.twiml.VoiceResponse;
const SETUP_FILE_PATH = path.join(process.cwd(), '.twilio-setup.json');

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    
    const to = formData.get('To') as string;
    const from = formData.get('From') as string;
    const callerId = formData.get('CallerId') as string;

    console.log('Incoming Twilio Webhook', { to, from, callerId });

    let settings: any = {};
    if (fs.existsSync(SETUP_FILE_PATH)) {
      settings = JSON.parse(fs.readFileSync(SETUP_FILE_PATH, 'utf-8'));
    }

    const twiml = new VoiceResponse();
    
    // An outbound call from the Web Client passing the CallerId param
    if (callerId) {
      const dialParams: any = { callerId };
      if (settings.recordCalls) {
        dialParams.record = 'record-from-answer';
      }
      const dial = twiml.dial(dialParams);
      dial.number(to);
    } 
    // An incoming call to the Twilio Number
    else if (to && !to.startsWith('client:')) {
      if (settings.doNotDisturb) {
        // Send directly to Voicemail
        twiml.say({ voice: 'alice' }, 'The person you are calling is unavailable. Please leave a message after the tone.');
        twiml.record({
          playBeep: true,
          maxLength: 120,
          action: '/api/twilio/voicemail-done'
        });
        twiml.say({ voice: 'alice' }, 'Goodbye.');
        twiml.hangup();
      } else {
        const dialParams: any = {
          timeout: 20, // Wait 20 seconds before going to voicemail action
          action: '/api/twilio/voicemail-handle'
        };
        if (settings.recordCalls) {
          dialParams.record = 'record-from-answer';
        }

        const dial = twiml.dial(dialParams);
        dial.client('web-user');
        
        // If a forwarding number is set, ring it at the same time
        if (settings.forwardingNumber) {
          dial.number(settings.forwardingNumber);
        }
      }
    }
    // An outbound call from Web Client to another Web Client (fallback)
    else {
      const dial = twiml.dial();
      dial.client('web-user');
    }
    
    const twimlString = twiml.toString();
    console.log('Generated TwiML:', twimlString);
    
    return new NextResponse(twimlString, {
      headers: { 
        'Content-Type': 'text/xml',
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (error) {
    console.error('Twilio Webhook Error', error);
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response><Say>An internal server error occurred.</Say></Response>', {
      status: 500,
      headers: { 'Content-Type': 'text/xml' }
    });
  }
}
