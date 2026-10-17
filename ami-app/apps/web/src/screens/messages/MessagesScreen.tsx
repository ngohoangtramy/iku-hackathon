import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Edit, Search } from 'lucide-react';
import api from '../../lib/api';
import type { Conversation } from '../../types';
import { BottomNav } from '../../components/ui/BottomNav';

export const MessagesScreen: React.FC = () => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.messages.conversations().then(setConversations).catch(() => {});
  }, []);

  const filteredConversations = conversations.filter((c) =>
    c.otherUser.displayName.toLowerCase().includes(search.toLowerCase()) ||
    c.lastMessage?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="screen-container">
      {/* Header */}
      <div className="app-header">
        <h2 style={{ fontSize: '22px', fontWeight: 800 }}>Messages</h2>
        <button
          onClick={() => navigate('/buddies')}
          className="btn btn-ghost"
          style={{ color: '#E8528A', padding: '6px' }}
          title="Find Buddies"
        >
          <Edit size={20} />
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ padding: '12px 20px 8px' }}>
        <div
          style={{
            background: '#F3F4F6',
            borderRadius: '16px',
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Search size={16} color="#9CA3AF" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              width: '100%',
              fontSize: '14px',
              fontFamily: 'var(--font-family)',
            }}
          />
        </div>
      </div>

      {/* Conversations List */}
      <div style={{ padding: '8px 16px 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filteredConversations.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '24px',
                background: 'var(--gradient-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FF6B9D',
                marginBottom: '16px',
              }}
            >
              <MessageSquare size={34} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>No messages yet</h3>
            <p style={{ fontSize: '14px', color: 'var(--color-muted)', maxWidth: '260px', marginBottom: '20px' }}>
              Match with a peer buddy in the Buddies tab to start planning walks and meetups.
            </p>
            <button
              onClick={() => navigate('/buddies')}
              className="btn btn-primary"
            >
              Find Buddies
            </button>
          </div>
        ) : (
          filteredConversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => navigate(`/messages/${conv.id}`)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                borderRadius: '18px',
                background: 'white',
                border: '1px solid var(--color-border)',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
            >
              {/* Avatar */}
              <div style={{ position: 'relative' }}>
                <img
                  src={conv.otherUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                  alt={conv.otherUser.displayName}
                  className="avatar avatar-md"
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: '0',
                    right: '0',
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: '#10B981',
                    border: '2px solid white',
                  }}
                />
              </div>

              {/* Text content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 700, fontSize: '15px', color: '#1A1A2E' }}>
                    {conv.otherUser.displayName}
                  </span>
                  <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{conv.lastMessageAt}</span>
                </div>
                <p
                  style={{
                    fontSize: '13px',
                    color: conv.unreadCount > 0 ? '#1A1A2E' : '#6B7280',
                    fontWeight: conv.unreadCount > 0 ? 600 : 400,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {conv.lastMessage}
                </p>
              </div>

              {/* Unread badge */}
              {conv.unreadCount > 0 && (
                <div
                  style={{
                    background: 'var(--color-primary-deep)',
                    color: 'white',
                    borderRadius: '50%',
                    minWidth: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  {conv.unreadCount}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
};
