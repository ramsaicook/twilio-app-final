import twilio from 'twilio';
import fs from 'fs';
import path from 'path';

const SETUP_FILE_PATH = path.join(process.cwd(), '.twilio-setup.json');

export function getCredentials() {
  if (fs.existsSync(SETUP_FILE_PATH)) {
    const data = JSON.parse(fs.readFileSync(SETUP_FILE_PATH, 'utf-8'));
    if (data.accountSid && data.authToken) {
      return { accountSid: data.accountSid, authToken: data.authToken };
    }
  }
  return {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN
  };
}

export async function getTwilioSetup(appUrl: string) {
  const { accountSid, authToken } = getCredentials();

  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials missing');
  }

  const client = twilio(accountSid, authToken);
  let setupData: any = {};

  if (fs.existsSync(SETUP_FILE_PATH)) {
    setupData = JSON.parse(fs.readFileSync(SETUP_FILE_PATH, 'utf-8'));
    
    // Update webhook URL if it changed and we have a twimlAppSid
    if (setupData.twimlAppSid && setupData.lastAppUrl !== appUrl) {
      try {
        await client.applications(setupData.twimlAppSid).update({
          voiceUrl: `${appUrl}/api/twilio/voice`,
        });
        setupData.lastAppUrl = appUrl;
        fs.writeFileSync(SETUP_FILE_PATH, JSON.stringify(setupData, null, 2));
      } catch (e) {
        console.error("Failed to update app webhook", e);
      }
    }
    
    if (setupData.twimlAppSid && setupData.apiKey && setupData.apiSecret) {
      return setupData;
    }
  }

  // 1. Create TwiML App
  const twimlApp = await client.applications.create({
    friendlyName: 'Web Phone App',
    voiceUrl: `${appUrl}/api/twilio/voice`,
  });

  // 2. Create API Key
  const apiKey = await client.newKeys.create({ friendlyName: 'Web Phone Key' });

  setupData = {
    ...setupData,
    twimlAppSid: twimlApp.sid,
    apiKey: apiKey.sid,
    apiSecret: apiKey.secret,
    lastAppUrl: appUrl,
  };

  fs.writeFileSync(SETUP_FILE_PATH, JSON.stringify(setupData, null, 2));
  return setupData;
}
