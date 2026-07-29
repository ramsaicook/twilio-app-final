import { NextResponse } from 'next/server';
import twilio from 'twilio';

export async function GET(request: Request) {
  const accountSid = request.headers.get('x-twilio-sid');
  const authToken = request.headers.get('x-twilio-token');
  if (!accountSid || !authToken) return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
  
  const client = twilio(accountSid, authToken);
  
  try {
    const recordings = await client.recordings.list({ limit: 20 });
    
    // Get call details to find To/From
    const recordingsWithDetails = await Promise.all(recordings.map(async (r) => {
      let to = 'Unknown', from = 'Unknown';
      if (r.callSid) {
        try {
          const call = await client.calls(r.callSid).fetch();
          to = call.to;
          from = call.from;
        } catch(e) {}
      }
      return {
        sid: r.sid,
        dateCreated: r.dateCreated,
        duration: r.duration,
        to,
        from,
        url: `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${r.sid}.mp3`
      };
    }));
    
    return NextResponse.json({ recordings: recordingsWithDetails });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
