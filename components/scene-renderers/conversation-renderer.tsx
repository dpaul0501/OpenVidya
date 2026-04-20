'use client';

import { useState, useEffect } from 'react';
import type { ConversationContent } from '@/lib/types/stage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConversationRendererProps {
  readonly content: ConversationContent;
  readonly mode: 'autonomous' | 'playback';
  readonly sceneId: string;
}

export function ConversationRenderer({ content, mode, sceneId: _sceneId }: ConversationRendererProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState<Array<{speaker: string, text: string}>>([]);

  useEffect(() => {
    if (content.initialMessage) {
      setMessages([{ speaker: 'AI Teacher', text: content.initialMessage }]);
    }
  }, [content.initialMessage]);

  const handleStartRecording = () => {
    setIsRecording(true);
    // TODO: Implement speech recognition
    setTranscript('Listening...');
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    // TODO: Process transcript and get AI response
    if (transcript) {
      setMessages(prev => [...prev, { speaker: 'You', text: transcript }]);
      // Simulate AI response
      setTimeout(() => {
        setMessages(prev => [...prev, { speaker: 'AI Teacher', text: 'Great! That was good pronunciation. Let\'s continue...' }]);
      }, 1000);
    }
    setTranscript('');
  };

  const handleSpeakResponse = (text: string) => {
    // TODO: Implement text-to-speech
    console.log('Speaking:', text);
  };

  return (
    <div className="w-full h-full overflow-y-auto p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">English Speaking Practice</CardTitle>
            <p className="text-muted-foreground">{content.scenario}</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Participants:</h3>
                <div className="flex flex-wrap gap-2">
                  {content.participants.map((participant) => (
                    <span
                      key={participant.id}
                      className="px-3 py-1 bg-primary/10 rounded-full text-sm"
                    >
                      {participant.name} ({participant.role})
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex gap-3 p-3 rounded-lg',
                    message.speaker === 'You' ? 'bg-primary/10 ml-12' : 'bg-muted mr-12'
                  )}
                >
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-sm font-semibold">
                      {message.speaker === 'You' ? 'Y' : 'T'}
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{message.speaker}</p>
                    <p className="text-sm">{message.text}</p>
                    {message.speaker !== 'You' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-1 h-6 px-2"
                        onClick={() => handleSpeakResponse(message.text)}
                      >
                        <Volume2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {transcript && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm font-medium">Your speech:</p>
                <p className="text-sm">{transcript}</p>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <Button
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                variant={isRecording ? 'destructive' : 'default'}
                className="flex items-center gap-2"
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                {isRecording ? 'Stop Recording' : 'Start Speaking'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}