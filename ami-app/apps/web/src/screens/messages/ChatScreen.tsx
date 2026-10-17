import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, MoreVertical, Send, ShieldAlert, Flag } from 'lucide-react';
import api from '../../lib/api';
import type { Message, BuddyProfile } from '../../types';
import toast from 'react-hot-toast';

export const ChatScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const conversationId = id || 'conv_01';
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const buddy: BuddyProfile = {
    id: 'bud_02',
    userId: 'usr_amina',
    displayName: 'Amina Al-Mansoor',
    bio: 'Biomedical Science @ Imperial',
    interests: ['Running', 'Study Sessions'],
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    university: 'Imperial College London',
  };

  useEffect(() => {
    api.messages.getMessages(conversationId).then(setMessages).catch(() => {});
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const text = inputValue;
    setInputValue('');

    const newMsg: Message = {
      id: 'msg_' + Date.now(),
      conversationId,
      senderId: 'me',
      content: text,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isOwn: true,
    };

    setMessages((prev) => [...prev, newMsg]);

    // Simulate buddy response
    setTimeout(() => {
      setIsTyping(true);
    }, 800);

    setTimeout(() => {
      setIsTyping(false);
      const replyMsg: Message = {
        id: 'reply_' + Date.now(),
        conversationId,
        senderId: buddy.userId,
        content: "Perfect, see you soon! Stay along the well-lit path outside the station 😊",
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isOwn: false,
      };
      setMessages((prev) => [...prev, replyMsg]);
    }, 2400);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: '#FAF7FA',
        position: 'relative',
      }}
    >
      {/* Top Header */}
      <div
        style={{
          height: '64px',
          background: 'white',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          zIndex: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate('/messages')}
            style={{ background: 'none', border: 'none', color: '#1A1A2E', cursor: 'pointer', padding: '4px' }}
          >
            <ArrowLeft size={22} />
          </button>

          <div style={{ position: 'relative' }}>
            <img
              src={buddy.avatarUrl}
              alt={buddy.displayName}
              style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #FFB3CC' }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#10B981',
                border: '2px solid white',
              }}
            />
          </div>

          <div>
            <div style={{ fontWeight: 700, fontSize: '15px', color: '#1A1A2E' }}>
              {buddy.displayName}
            </div>
            <div style={{ fontSize: '11px', color: '#10B981', fontWeight: 600 }}>
              Online now • Verified Peer
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => navigate('/ai-call')}
            title="Start Call"
            style={{
              background: 'var(--color-primary-bg)',
              border: 'none',
              borderRadius: '50%',
              width: '38px',
              height: '38px',
              color: '#E8528A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Phone size={18} />
          </button>
          <button
            onClick={() => toast('Report options opened')}
            title="Safety Options"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-muted)',
              cursor: 'pointer',
              padding: '6px',
            }}
          >
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {/* Safe Meetup Reminder Banner */}
        <div
          style={{
            background: '#FFF0F5',
            border: '1px solid #FFCCD9',
            borderRadius: '14px',
            padding: '10px 14px',
            fontSize: '12px',
            color: '#831843',
            textAlign: 'center',
            lineHeight: 1.4,
          }}
        >
          💡 <strong>Safety tip:</strong> Always meet buddies in public, well-lit spaces and keep your live location shared if walking after dark.
        </div>

        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.isOwn ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: '78%',
                padding: '12px 16px',
                borderRadius: msg.isOwn ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                background: msg.isOwn ? 'var(--gradient-primary)' : '#FFFFFF',
                color: msg.isOwn ? '#FFFFFF' : '#1A1A2E',
                boxShadow: msg.isOwn
                  ? '0 4px 14px rgba(255, 107, 157, 0.3)'
                  : '0 2px 8px rgba(0,0,0,0.06)',
                fontSize: '14px',
                lineHeight: 1.45,
                border: msg.isOwn ? 'none' : '1px solid var(--color-border)',
              }}
            >
              {msg.content}
            </div>
            <span
              style={{
                fontSize: '10px',
                color: '#9CA3AF',
                marginTop: '4px',
                padding: '0 4px',
              }}
            >
              {msg.createdAt}
            </span>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
            <div
              style={{
                background: 'white',
                border: '1px solid var(--color-border)',
                borderRadius: '16px',
                padding: '8px 14px',
                display: 'flex',
                gap: '4px',
              }}
            >
              <span className="spinner" style={{ width: '8px', height: '8px', borderWidth: '1.5px' }} />
              <span style={{ fontSize: '12px', color: '#9CA3AF' }}>Amina is typing...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form
        onSubmit={handleSend}
        style={{
          background: 'white',
          borderTop: '1px solid var(--color-border)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type a friendly message..."
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: '24px',
            border: '1.5px solid var(--color-border)',
            outline: 'none',
            fontSize: '14px',
            fontFamily: 'var(--font-family)',
            background: '#F9FAFB',
          }}
        />
        <button
          type="submit"
          disabled={!inputValue.trim()}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: inputValue.trim() ? 'var(--gradient-primary)' : '#E5E7EB',
            color: 'white',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: inputValue.trim() ? 'pointer' : 'default',
            boxShadow: inputValue.trim() ? 'var(--shadow-button)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};
