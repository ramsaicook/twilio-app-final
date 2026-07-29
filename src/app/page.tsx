"use client";

import { useEffect, useState } from "react";
import { Device, Call } from "@twilio/voice-sdk";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Phone, PhoneOff, Send, PhoneIncoming, LogOut, Play, Download } from "lucide-react";

export default function TwilioSoftphone() {
  const [device, setDevice] = useState<Device | null>(null);
  const [connection, setConnection] = useState<Call | null>(null);
  const [token, setToken] = useState<string>("");
  const [numbers, setNumbers] = useState<any[]>([]);
  const [selectedNumber, setSelectedNumber] = useState<string>("");
  const [authError, setAuthError] = useState<string>("");
  
  // Call State
  const [destNumber, setDestNumber] = useState("");
  const [callStatus, setCallStatus] = useState("Offline");
  
  // SMS State
  const [smsDest, setSmsDest] = useState("");
  const [smsMessage, setSmsMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [smsLoading, setSmsLoading] = useState(false);

  // Recordings State
  const [recordings, setRecordings] = useState<any[]>([]);
  
  // Settings State
  const [hasCredentials, setHasCredentials] = useState(false);
  const [inputSid, setInputSid] = useState("");
  const [inputToken, setInputToken] = useState("");
  const [settingsLoading, setSettingsLoading] = useState(false);

  // App Features State
  const [forwardingNumber, setForwardingNumber] = useState("");
  const [recordCalls, setRecordCalls] = useState(false);
  const [doNotDisturb, setDoNotDisturb] = useState(false);
  const [appSettingsLoading, setAppSettingsLoading] = useState(false);

  useEffect(() => {
    checkSettings();
  }, []);

  const checkSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      
      if (data.hasCredentials) {
        const numRes = await fetch("/api/twilio/numbers");
        const numData = await numRes.json();
        
        if (numData.error) {
          setHasCredentials(false);
          setAuthError(`Authentication failed: ${numData.error}. Please check your credentials.`);
          return;
        }
        
        setHasCredentials(true);
        setAuthError("");
        setForwardingNumber(data.forwardingNumber || "");
        setRecordCalls(data.recordCalls || false);
        setDoNotDisturb(data.doNotDisturb || false);

        setNumbers(numData.numbers || []);
        if (numData.numbers?.length > 0) setSelectedNumber(numData.numbers[0].phoneNumber);
        
        fetchToken();
        fetchMessages();
        fetchRecordings();
      } else {
        setHasCredentials(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveCredentials = async () => {
    if (!inputSid || !inputToken) return;
    setSettingsLoading(true);
    setAuthError("");
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountSid: inputSid, authToken: inputToken })
      });
      setInputSid("");
      setInputToken("");
      await checkSettings();
    } catch (e) {
      console.error(e);
    }
    setSettingsLoading(false);
  };

  const saveAppSettings = async () => {
    setAppSettingsLoading(true);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          forwardingNumber,
          recordCalls,
          doNotDisturb
        })
      });
      alert("Application settings saved successfully!");
    } catch (e) {
      console.error(e);
    }
    setAppSettingsLoading(false);
  };

  const logout = async () => {
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountSid: "", authToken: "" }) // Clear them
    });
    setHasCredentials(false);
    setNumbers([]);
    setMessages([]);
    if (device) {
      device.destroy();
      setDevice(null);
    }
  };

  const fetchToken = async () => {
    try {
      const res = await fetch("/api/twilio/token");
      const data = await res.json();
      if (data.token) {
        setToken(data.token);
        setupDevice(data.token);
      }
    } catch (e) {
      console.error(e);
      setCallStatus("Failed to get token");
    }
  };
  
  const setupDevice = (token: string) => {
    const newDevice = new Device(token, {
      codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
    });

    newDevice.on("ready", () => setCallStatus("Ready"));
    newDevice.on("error", (error: any) => {
      console.error("Device error:", error);
      setCallStatus("Error: " + error.message);
    });
    
    newDevice.on("incoming", (call: Call) => {
      setConnection(call);
      setCallStatus("Incoming Call...");
      
      call.on("accept", () => setCallStatus("In Call"));
      call.on("disconnect", () => {
        setConnection(null);
        setCallStatus("Ready");
      });
      call.on("cancel", () => {
        setConnection(null);
        setCallStatus("Ready");
      });
      call.on("reject", () => {
        setConnection(null);
        setCallStatus("Ready");
      });
    });

    newDevice.register();
    setDevice(newDevice);
  };

  const makeCall = async () => {
    if (!device || !destNumber || !selectedNumber) return;
    try {
      setCallStatus("Calling...");
      const params = { To: destNumber, CallerId: selectedNumber };
      const call = await device.connect({ params });
      
      setConnection(call);
      call.on("accept", () => setCallStatus("In Call"));
      call.on("disconnect", () => {
        setConnection(null);
        setCallStatus("Ready");
      });
      call.on("error", (error: any) => {
        console.error("Call error", error);
        setCallStatus("Call Error");
        setConnection(null);
      });
    } catch (e) {
      console.error("Connect error", e);
      setCallStatus("Connect Error");
    }
  };

  const hangUp = () => {
    if (connection) {
      connection.disconnect();
    }
  };

  const acceptCall = () => {
    if (connection) {
      connection.accept();
    }
  };
  
  const rejectCall = () => {
    if (connection) {
      connection.reject();
    }
  };

  const fetchMessages = async () => {
    const res = await fetch("/api/twilio/sms");
    const data = await res.json();
    if (data.messages) {
      setMessages(data.messages);
    }
  };
  
  const fetchRecordings = async () => {
    const res = await fetch("/api/twilio/recordings");
    const data = await res.json();
    if (data.recordings) {
      setRecordings(data.recordings);
    }
  };

  const sendSms = async () => {
    if (!smsDest || !smsMessage || !selectedNumber) return;
    setSmsLoading(true);
    try {
      await fetch("/api/twilio/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: smsDest,
          from: selectedNumber,
          message: smsMessage
        })
      });
      setSmsMessage("");
      fetchMessages();
    } catch (e) {
      console.error(e);
    }
    setSmsLoading(false);
  };

  const configureNumber = async (sid: string) => {
    await fetch("/api/twilio/numbers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sid })
    });
    alert("Number configured to route calls to this Web Phone.");
    checkSettings();
  };

  if (!hasCredentials) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Twilio Setup</CardTitle>
            <CardDescription>Enter your Twilio Account SID and Auth Token to get started.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {authError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                {authError}
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-1 block">Account SID</label>
              <Input 
                placeholder="AC..." 
                value={inputSid} 
                onChange={(e) => setInputSid(e.target.value)} 
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Auth Token</label>
              <Input 
                type="password"
                placeholder="Your Auth Token" 
                value={inputToken} 
                onChange={(e) => setInputToken(e.target.value)} 
              />
            </div>
            <Button onClick={saveCredentials} disabled={settingsLoading} className="w-full">
              {settingsLoading ? "Saving..." : "Save Credentials"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl shadow-sm">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">Twilio Web Phone</CardTitle>
              <CardDescription>Make and receive calls & SMS from your browser.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={logout} title="Log Out" className="text-slate-500 hover:text-slate-800">
              <LogOut className="h-4 w-4 mr-2" />
              Disconnect
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Your Active Twilio Number</label>
              <Select value={selectedNumber} onValueChange={setSelectedNumber}>
                <SelectTrigger className="w-full max-w-sm">
                  <SelectValue placeholder="Select a number" />
                </SelectTrigger>
                <SelectContent>
                  {numbers.length === 0 && <SelectItem value="none" disabled>No numbers found</SelectItem>}
                  {numbers.map((n) => (
                    <SelectItem key={n.sid} value={n.phoneNumber}>
                      {n.friendlyName} ({n.phoneNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {numbers.find(n => n.phoneNumber === selectedNumber) && (
              <Button variant="outline" onClick={() => configureNumber(numbers.find(n => n.phoneNumber === selectedNumber)!.sid)}>
                Sync Number Webhook
              </Button>
            )}
          </div>

          <Tabs defaultValue="phone">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="phone">Phone</TabsTrigger>
              <TabsTrigger value="sms">SMS</TabsTrigger>
              <TabsTrigger value="voicemail">Recordings</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            
            <TabsContent value="phone" className="p-4 border rounded-md mt-4 flex flex-col items-center bg-white">
              <div className="text-sm font-semibold mb-4 text-slate-500">
                Status: {doNotDisturb ? <span className="text-amber-600">Do Not Disturb (Voicemail Only)</span> : callStatus}
              </div>
              
              {!connection || callStatus === "Ready" || callStatus.includes("Error") ? (
                <div className="flex flex-col gap-4 w-full max-w-sm">
                  <Input 
                    type="tel" 
                    placeholder="Enter number (e.g. +1234567890)" 
                    value={destNumber} 
                    onChange={(e) => setDestNumber(e.target.value)}
                    className="text-center text-lg h-12"
                  />
                  <Button onClick={makeCall} size="lg" className="w-full bg-green-600 hover:bg-green-700" disabled={!device || !selectedNumber || selectedNumber === 'none'}>
                    <Phone className="mr-2 h-5 w-5" /> Call
                  </Button>
                </div>
              ) : callStatus === "Incoming Call..." ? (
                <div className="flex gap-4">
                  <Button onClick={acceptCall} size="lg" className="bg-green-600 hover:bg-green-700">
                    <PhoneIncoming className="mr-2 h-5 w-5" /> Accept
                  </Button>
                  <Button onClick={rejectCall} size="lg" variant="destructive">
                    <PhoneOff className="mr-2 h-5 w-5" /> Reject
                  </Button>
                </div>
              ) : (
                <div className="flex gap-4 flex-col items-center">
                  <div className="text-2xl font-mono mb-4 text-green-600 animate-pulse">In Call...</div>
                  {recordCalls && <div className="text-xs font-semibold text-red-500 mb-2 flex items-center"><span className="w-2 h-2 rounded-full bg-red-500 mr-2 animate-pulse"></span>Recording Active</div>}
                  <Button onClick={hangUp} size="lg" variant="destructive" className="rounded-full w-20 h-20 shadow-lg">
                    <PhoneOff className="h-8 w-8" />
                  </Button>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="sms" className="p-4 border rounded-md mt-4 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Send Message</h3>
                  <div className="space-y-4">
                    <Input 
                      placeholder="To Number (e.g. +1234567890)" 
                      value={smsDest} 
                      onChange={(e) => setSmsDest(e.target.value)}
                    />
                    <Input 
                      placeholder="Message content..." 
                      value={smsMessage} 
                      onChange={(e) => setSmsMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendSms()}
                    />
                    <Button onClick={sendSms} disabled={smsLoading || !selectedNumber || selectedNumber === 'none'} className="w-full">
                      {smsLoading ? "Sending..." : <><Send className="mr-2 h-4 w-4" /> Send</>}
                    </Button>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Recent Messages</h3>
                    <Button variant="outline" size="sm" onClick={fetchMessages}>Refresh</Button>
                  </div>
                  <ScrollArea className="h-[300px] border rounded-md p-4 bg-slate-50">
                    {messages.length === 0 && <p className="text-muted-foreground text-sm text-center mt-10">No messages found.</p>}
                    <div className="space-y-4">
                      {messages.map((msg, i) => {
                        const isOutgoing = msg.direction === 'outbound-api' || msg.direction === 'outbound-reply';
                        return (
                          <div key={msg.sid || i} className={`flex flex-col ${isOutgoing ? 'items-end' : 'items-start'}`}>
                            <div className={`px-3 py-2 rounded-lg max-w-[85%] ${isOutgoing ? 'bg-blue-600 text-white' : 'bg-white border text-slate-800'}`}>
                              <p className="text-sm">{msg.body}</p>
                            </div>
                            <span className="text-[10px] text-slate-400 mt-1">
                              {isOutgoing ? `To: ${msg.to}` : `From: ${msg.from}`} • {new Date(msg.dateSent).toLocaleString()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="voicemail" className="p-4 border rounded-md mt-4 bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Recordings & Voicemails</h3>
                <Button variant="outline" size="sm" onClick={fetchRecordings}>Refresh</Button>
              </div>
              <ScrollArea className="h-[300px] border rounded-md p-4 bg-slate-50">
                {recordings.length === 0 && <p className="text-muted-foreground text-sm text-center mt-10">No recordings found.</p>}
                <div className="space-y-3">
                  {recordings.map((rec, i) => (
                    <div key={rec.sid || i} className="flex justify-between items-center p-3 bg-white border rounded-md">
                      <div>
                        <p className="font-medium text-sm">Duration: {rec.duration} seconds</p>
                        <p className="text-xs text-slate-500">{new Date(rec.dateCreated).toLocaleString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <audio controls src={rec.mediaUrl} className="h-8 w-48" />
                        <Button variant="ghost" size="icon" asChild>
                          <a href={rec.mediaUrl} target="_blank" rel="noreferrer" download><Download className="h-4 w-4" /></a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="settings" className="p-6 border rounded-md mt-4 bg-white">
              <h3 className="text-xl font-semibold mb-6">Application Settings</h3>
              
              <div className="space-y-8 max-w-lg">
                <div className="space-y-3">
                  <h4 className="text-base font-medium">Do Not Disturb (Voicemail Only)</h4>
                  <div className="flex items-center gap-2 p-4 border rounded-md bg-amber-50 border-amber-200">
                    <input 
                      type="checkbox" 
                      id="doNotDisturb" 
                      checked={doNotDisturb}
                      onChange={(e) => setDoNotDisturb(e.target.checked)}
                      className="w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                    />
                    <label htmlFor="doNotDisturb" className="text-sm font-medium cursor-pointer text-amber-900">
                      Send all inbound calls directly to Voicemail
                    </label>
                  </div>
                  <p className="text-sm text-slate-500">
                    When enabled, your phone will not ring. Callers will immediately hear a greeting and be asked to leave a message. Note: even if this is disabled, missed calls (after 20 seconds of ringing) will still fallback to voicemail automatically!
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-base font-medium">Call Forwarding</h4>
                  <p className="text-sm text-slate-500">
                    If set, incoming calls will ring your browser AND this physical mobile number simultaneously. The first one to answer connects the call.
                  </p>
                  <div>
                    <Input 
                      placeholder="e.g. +1234567890" 
                      value={forwardingNumber}
                      onChange={(e) => setForwardingNumber(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-base font-medium">Call Recording</h4>
                  <div className="flex items-center gap-2 p-4 border rounded-md bg-slate-50">
                    <input 
                      type="checkbox" 
                      id="recordCalls" 
                      checked={recordCalls}
                      onChange={(e) => setRecordCalls(e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="recordCalls" className="text-sm font-medium cursor-pointer">
                      Automatically record all answered calls
                    </label>
                  </div>
                </div>

                <Button onClick={saveAppSettings} disabled={appSettingsLoading} size="lg" className="w-full">
                  {appSettingsLoading ? "Saving..." : "Save Preferences"}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
