import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import type { Event, EventCategory } from '../../types';

interface ExploreOverlayProps {
  onSelectEvent: (event: Event) => void;
  events?: Event[];
}

export const CATEGORY_COLORS: Record<EventCategory, { bg: string; text: string; icon: string }> = {
  sports_fitness: { bg: '#10B981', text: '#FFFFFF', icon: '🏃' },
  cafe_social: { bg: '#FF6B9D', text: '#FFFFFF', icon: '☕' },
  workshop_creative: { bg: '#9B59B6', text: '#FFFFFF', icon: '🎨' },
  career_networking: { bg: '#3B82F6', text: '#FFFFFF', icon: '💼' },
  uni_society: { bg: '#6366F1', text: '#FFFFFF', icon: '🎓' },
  study_session: { bg: '#F59E0B', text: '#FFFFFF', icon: '📚' },
  cultural: { bg: '#F97316', text: '#FFFFFF', icon: '🎭' },
  community: { bg: '#14B8A6', text: '#FFFFFF', icon: '🤝' },
};

export const ExploreOverlay: React.FC<ExploreOverlayProps> = ({ onSelectEvent, events: customEvents }) => {
  const [events, setEvents] = useState<Event[]>(customEvents || []);

  useEffect(() => {
    if (!customEvents) {
      api.events.list().then(setEvents).catch(() => {});
    } else {
      setEvents(customEvents);
    }
  }, [customEvents]);

  return null; // Logic & category color lookup helper consumed by MapScreen
};
