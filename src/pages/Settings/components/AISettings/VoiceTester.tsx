import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Volume2, Download } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { textToSpeech } from "@/lib/api";
import { getConfig } from "@/lib/configManager";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";

interface VoiceTesterProps {
  voiceService: string;
  voiceType: string;
  elevenlabsVoice: string;
  googleVoice: string;
  azureVoice: string;
  amazonVoice: string;
  openaiVoice: string;
}

export const VoiceTester: React.FC<VoiceTesterProps> = ({
  voiceService,
  voiceType,
  elevenlabsVoice,
  googleVoice,
  azureVoice,
  amazonVoice,
  openaiVoice
}) => {
  const [testText, setTestText] = useState("Hello, this is a test of the text to speech functionality.");
  const [isTesting, setIsTesting] = useState(false);
  const [testLogs, setTestLogs] = useState<string[]>([]);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Add this function for testing the voice service
  const testVoiceService = async () => {
    setIsTesting(true);
    setTestLogs([]);
    setAudioBlob(null);
    
    try {
      // Start logging debug info
      const logs: string[] = [];
      logs.push(`Test started at: ${new Date().toISOString()}`);
      logs.push(`Voice service: ${voiceService}`);
      
      // Log current configuration
      const config = getConfig();
      logs.push(`Voice configuration: ${JSON.stringify({
        voice_service: config.voice_service,
        voice_gender: config.voice_gender,
        voice_enabled: config.voice_enabled,
        elevenlabs_voice: config.elevenlabs_voice,
        google_voice: config.google_voice,
        azure_voice: config.azure_voice,
        amazon_voice: config.amazon_voice,
        openai_voice: config.openai_voice
      }, null, 2)}`);

      // Log API base URL for debugging
      const apiBaseUrlElement = document.getElementById('api-base-url');
      const apiBaseUrl = apiBaseUrlElement ? apiBaseUrlElement.innerText : 'Unknown';
      logs.push(`API Base URL: ${apiBaseUrl}`);
      
      // Determine voice ID based on service
      let voiceId = "";
      switch (voiceService) {
        case "elevenlabs":
          voiceId = elevenlabsVoice;
          break;
        case "google":
          voiceId = googleVoice;
          break;
        case "azure":
          voiceId = azureVoice;
          break;
        case "amazon":
          voiceId = amazonVoice;
          break;
        case "openai":
          voiceId = openaiVoice;
          break;
        default:
          voiceId = voiceType;
      }
      
      logs.push(`Selected voice ID: ${voiceId}`);
      setTestLogs(logs);
      
      // Attempt to generate speech
      logs.push(`Sending TTS request with text: "${testText}"`);
      setTestLogs([...logs]);
      
      // Make the TTS request
      const startTime = performance.now();
      const result = await textToSpeech(testText, voiceService, {
        voice: voiceId,
        gender: voiceType
      });
      const endTime = performance.now();
      
      logs.push(`TTS request completed in ${Math.round(endTime - startTime)}ms`);
      
      // Create and play the audio
      if (result instanceof Blob) {
        logs.push(`Received audio blob of type: ${result.type}, size: ${result.size} bytes`);
        
        // Save the blob for download
        setAudioBlob(result);
        
        // Add very simple EMERGENCY FALLBACK method - create a visible audio element
        // This has the highest likelihood of working across browsers
        logs.push(`Creating fallback audio element in the DOM...`);
        
        // Create the element
        const emergencyAudio = document.createElement('audio');
        emergencyAudio.controls = true;
        emergencyAudio.style.width = '100%';
        emergencyAudio.style.marginTop = '10px';
        
        // Convert blob to URL
        const audioUrl = URL.createObjectURL(result);
        emergencyAudio.src = audioUrl;
        
        // Add cleanup on ended
        emergencyAudio.onended = () => {
          logs.push(`Emergency audio playback ended`);
          setTestLogs([...logs]);
        };
        
        // Add to DOM after the test area
        const testArea = document.querySelector('.space-y-4.mt-6');
        if (testArea) {
          // Create container
          const container = document.createElement('div');
          container.className = 'mt-4 p-2 border rounded bg-muted';
          
          // Add label
          const label = document.createElement('div');
          label.className = 'text-sm mb-2 font-medium';
          label.textContent = 'Emergency Playback (if other methods fail):';
          container.appendChild(label);
          
          // Add audio
          container.appendChild(emergencyAudio);
          
          // Add notes
          const note = document.createElement('div');
          note.className = 'text-xs text-muted-foreground mt-1';
          note.textContent = 'Click play above to hear the audio. This element will disappear after 30 seconds.';
          container.appendChild(note);
          
          // Append to page
          testArea.appendChild(container);
          
          // Clean up after 30 seconds
          setTimeout(() => {
            URL.revokeObjectURL(audioUrl);
            testArea.removeChild(container);
            logs.push(`Emergency audio element removed from DOM`);
            setTestLogs([...logs]);
          }, 30000);
          
          logs.push(`Emergency audio element added to DOM`);
        } else {
          logs.push(`Could not find test area to add emergency audio element`);
        }
        
        // Continue with data URL conversion for the normal playback methods
        logs.push(`Converting blob to data URL for regular playback...`);
        const reader = new FileReader();
        reader.onload = async () => {
          const dataUrl = reader.result as string;
          logs.push(`Data URL created (length: ${dataUrl.length})`);
          setTestLogs([...logs]);
          
          if (voiceService === 'openai') {
            logs.push(`Using special handling for OpenAI audio...`);
            
            // Try playing with data URL
            try {
              const audio = new Audio(dataUrl);
              audio.oncanplay = () => {
                logs.push(`OpenAI audio Data URL can play!`);
                setTestLogs([...logs]);
              };
              audio.onplay = () => {
                logs.push(`OpenAI audio playback started with data URL`);
                setTestLogs([...logs]);
              };
              audio.onended = () => {
                logs.push(`OpenAI audio playback completed with data URL`);
                setTestLogs([...logs]);
              };
              audio.onerror = (e: Event) => {
                logs.push(`OpenAI audio error with data URL: ${audio.error?.code} - ${audio.error?.message}`);
                setTestLogs([...logs]);
              };
              
              await audio.play();
              logs.push(`OpenAI audio.play() called successfully with data URL`);
              setTestLogs([...logs]);
            } catch (err) {
              logs.push(`Failed to play OpenAI audio with data URL: ${String(err)}`);
              setTestLogs([...logs]);
              
              // Fall back to audio element
              if (audioRef.current) {
                logs.push(`Falling back to regular audio element...`);
                try {
                  audioRef.current.src = dataUrl;
                  await audioRef.current.play();
                  logs.push(`Regular audio element playback started with data URL`);
                } catch (fallbackErr) {
                  logs.push(`Regular audio element failed too: ${String(fallbackErr)}`);
                }
                setTestLogs([...logs]);
              }
            }
          } else {
            // Use the audio ref for non-OpenAI voices
            if (audioRef.current) {
              audioRef.current.src = audioUrl;
              audioRef.current.onplay = () => {
                logs.push(`Audio playback started via audio element`);
                setTestLogs([...logs]);
              };
              
              audioRef.current.onended = () => {
                logs.push(`Audio playback completed successfully`);
                setTestLogs([...logs]);
              };
              
              audioRef.current.onerror = (e: Event) => {
                const audioElement = audioRef.current;
                logs.push(`Audio playback error: Code ${audioElement?.error?.code}, Message: ${audioElement?.error?.message}`);
                logs.push(`Full error: ${JSON.stringify(e)}`);
                setTestLogs([...logs]);
              };
              
              // Try playing with the audio element
              try {
                logs.push(`Attempting to play using audio element...`);
                await audioRef.current.play();
                logs.push(`Audio.play() called successfully on audio element`);
              } catch (error) {
                logs.push(`Error playing audio with element: ${error instanceof Error ? error.message : String(error)}`);
                
                // Try alternative method
                logs.push(`Trying alternative playback method...`);
                try {
                  const audio = new Audio();
                  audio.src = audioUrl;
                  audio.onerror = (e) => logs.push(`Alternative playback error: ${JSON.stringify(e)}`);
                  await audio.play();
                  logs.push(`Alternative playback started`);
                } catch (fallbackError) {
                  logs.push(`Alternative playback failed: ${String(fallbackError)}`);
                }
              }
            } else {
              logs.push(`Audio ref not available`);
            }
          }
        };
        reader.readAsDataURL(result);
      } else {
        logs.push(`Received audio URL: ${result}`);
        // For direct URLs, we can just set the src
        if (audioRef.current) {
          audioRef.current.src = result;
          try {
            await audioRef.current.play();
            logs.push(`Direct URL playback started`);
          } catch (error) {
            logs.push(`Error playing direct URL: ${String(error)}`);
          }
        }
      }
      
      toast.success("Voice test completed successfully");
    } catch (error) {
      // Log detailed error information
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error && error.stack ? error.stack : "No stack trace available";
      
      setTestLogs(prev => [
        ...prev,
        `ERROR: ${errorMessage}`,
        `Error details: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
        `Stack trace: ${errorStack}`
      ]);
      
      toast.error(`Voice test failed: ${errorMessage}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleDownloadAudio = () => {
    if (!audioBlob) {
      toast.error("No audio generated yet");
      return;
    }
    
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `voice-test-${new Date().toISOString().slice(0, 10)}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Audio file downloaded");
  };

  return (
    <>
      {/* Hidden audio element for better browser compatibility */}
      <audio ref={audioRef} style={{ display: 'none' }} controls />
      
      <div className="space-y-4 mt-6">
        <h4 className="text-base font-medium">Test Voice Service</h4>
        <div className="flex flex-col space-y-4">
          <Textarea
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            placeholder="Enter text to test TTS"
            className="min-h-[80px]"
          />
          <div className="flex space-x-2">
            <Button 
              onClick={() => {
                testVoiceService();
                setShowTestDialog(true);
              }} 
              variant="outline"
              disabled={isTesting}
              className="flex items-center"
            >
              {isTesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Volume2 className="mr-2 h-4 w-4" />
                  Test Voice
                </>
              )}
            </Button>
            {audioBlob && (
              <Button 
                onClick={handleDownloadAudio} 
                variant="secondary"
                className="flex items-center"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Audio
              </Button>
            )}
            <Button
              onClick={() => setShowTestDialog(true)}
              variant="ghost"
              disabled={testLogs.length === 0}
            >
              Show Debug Info
            </Button>
          </div>
        </div>
      </div>
      
      {/* Debug Dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Voice Test Debug Information</DialogTitle>
            <DialogDescription>
              Detailed logs from the voice test process
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <Textarea
              value={testLogs.join('\n')}
              readOnly
              className="font-mono text-xs h-[300px] overflow-y-auto"
            />
          </div>
          <div className="flex justify-end mt-4">
            <Button variant="secondary" onClick={() => setShowTestDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}; 