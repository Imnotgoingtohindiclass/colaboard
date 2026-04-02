'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage } from '@/lib/whiteboard/types';
import { formatTimestamp, generateId } from '@/lib/whiteboard/utils';
import { X, Send, MessageSquare } from 'lucide-react';

interface ChatPanelProps {
  userId: string;
  username: string;
  visible: boolean;
  onClose: () => void;
  onSendMessage: (message: ChatMessage) => void;
  messages: ChatMessage[];
}

export default function ChatPanel({
  userId,
  username,
  visible,
  onClose,
  onSendMessage,
  messages,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(() => {
    const content = input.trim();
    if (!content) return;

    const message: ChatMessage = {
      id: generateId(),
      userId,
      username,
      content,
      timestamp: Date.now(),
    };

    onSendMessage(message);
    setInput('');
  }, [input, userId, username, onSendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  if (!visible) return null;

  return (
    <div className="absolute right-4 bottom-4 z-20 w-72 bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col overflow-hidden animate-in slide-in-from-right-2"
      style={{ height: '380px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Chat</span>
          {messages.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 bg-gray-200 text-gray-500 rounded-full">
              {messages.length}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-md"
          onClick={onClose}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-2 space-y-2"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            No messages yet
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.userId === userId;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
              >
                {!isOwn && (
                  <span className="text-[11px] font-medium text-gray-500 mb-0.5">
                    {msg.username}
                  </span>
                )}
                <div
                  className={`max-w-[85%] px-3 py-1.5 rounded-xl text-sm break-words ${
                    isOwn
                      ? 'bg-gray-800 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
                <span className="text-[10px] text-gray-400 mt-0.5">
                  {formatTimestamp(msg.timestamp)}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-gray-100 bg-gray-50 flex-shrink-0">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="h-8 text-sm border-gray-200 rounded-lg"
          maxLength={500}
        />
        <Button
          size="icon"
          className="h-8 w-8 rounded-lg flex-shrink-0"
          onClick={handleSend}
          disabled={!input.trim()}
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
