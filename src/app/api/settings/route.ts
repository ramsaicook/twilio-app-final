import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SETUP_FILE_PATH = path.join(process.cwd(), '.twilio-setup.json');

export async function GET() {
  if (fs.existsSync(SETUP_FILE_PATH)) {
    const data = JSON.parse(fs.readFileSync(SETUP_FILE_PATH, 'utf-8'));
    return NextResponse.json({ 
      hasCredentials: !!(data.accountSid && data.authToken),
      accountSid: data.accountSid || '',
      forwardingNumber: data.forwardingNumber || '',
      recordCalls: data.recordCalls || false,
      doNotDisturb: data.doNotDisturb || false
    });
  }
  return NextResponse.json({ hasCredentials: false });
}

export async function POST(request: Request) {
  const body = await request.json();
  
  let setupData: any = {};
  if (fs.existsSync(SETUP_FILE_PATH)) {
    setupData = JSON.parse(fs.readFileSync(SETUP_FILE_PATH, 'utf-8'));
  }
  
  if (body.accountSid !== undefined) setupData.accountSid = body.accountSid;
  if (body.authToken !== undefined) setupData.authToken = body.authToken;
  if (body.forwardingNumber !== undefined) setupData.forwardingNumber = body.forwardingNumber;
  if (body.recordCalls !== undefined) setupData.recordCalls = body.recordCalls;
  if (body.doNotDisturb !== undefined) setupData.doNotDisturb = body.doNotDisturb;
  
  fs.writeFileSync(SETUP_FILE_PATH, JSON.stringify(setupData, null, 2));
  
  return NextResponse.json({ success: true });
}
