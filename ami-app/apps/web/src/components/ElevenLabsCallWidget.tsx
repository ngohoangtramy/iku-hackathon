import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const ADAM_AGENT_ID = 'agent_3601m572qh6xedjakhn24g36v275';
const WIDGET_SCRIPT_URL = 'https://unpkg.com/@elevenlabs/convai-widget-embed';

let widgetScriptPromise: Promise<void> | null = null;

function loadElevenLabsWidget(): Promise<void> {
  if (customElements.get('elevenlabs-convai')) return Promise.resolve();
  if (widgetScriptPromise) return widgetScriptPromise;

  widgetScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = WIDGET_SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      void customElements.whenDefined('elevenlabs-convai').then(() => resolve(), reject);
    };
    script.onerror = () => {
      script.remove();
      reject(new Error('The ElevenLabs widget script could not be loaded.'));
    };
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    widgetScriptPromise = null;
    throw error;
  });

  return widgetScriptPromise;
}

export const ElevenLabsCallWidget: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const widgetRef = useRef<HTMLElement | null>(null);
  const callListenerRef = useRef<((event: Event) => void) | null>(null);
  const widgetClickListenerRef = useRef<((event: Event) => void) | null>(null);
  const callStartedRef = useRef(false);

  useEffect(() => {
    const isCallFlow = location.pathname === '/map' || location.pathname === '/ai-call';
    if (!isCallFlow) {
      if (widgetRef.current && callListenerRef.current) {
        widgetRef.current.removeEventListener('elevenlabs-convai:call', callListenerRef.current);
      }
      if (widgetRef.current?.shadowRoot && widgetClickListenerRef.current) {
        widgetRef.current.shadowRoot.removeEventListener('click', widgetClickListenerRef.current, true);
      }
      widgetRef.current?.remove();
      widgetRef.current = null;
      callListenerRef.current = null;
      widgetClickListenerRef.current = null;
      callStartedRef.current = false;
      return;
    }

    if (location.pathname === '/map' && callStartedRef.current) {
      if (widgetRef.current && callListenerRef.current) {
        widgetRef.current.removeEventListener('elevenlabs-convai:call', callListenerRef.current);
      }
      if (widgetRef.current?.shadowRoot && widgetClickListenerRef.current) {
        widgetRef.current.shadowRoot.removeEventListener('click', widgetClickListenerRef.current, true);
      }
      widgetRef.current?.remove();
      widgetRef.current = null;
      callListenerRef.current = null;
      widgetClickListenerRef.current = null;
      callStartedRef.current = false;
    }

    if (widgetRef.current) return;

    let cancelled = false;
    void loadElevenLabsWidget()
      .then(() => {
        if (cancelled || widgetRef.current) return;

        const widget = document.createElement('elevenlabs-convai');
        widget.setAttribute('agent-id', ADAM_AGENT_ID);
        const onCall = () => {
          callStartedRef.current = true;
          widget.style.display = 'none';
          if (location.pathname !== '/ai-call') navigate('/ai-call');
        };
        const onWidgetClick = (event: Event) => {
          const target = event.target;
          if (!(target instanceof HTMLElement)) return;
          if (target.closest('button')?.textContent?.trim() !== 'Cancel') return;
          window.setTimeout(() => {
            if (!callStartedRef.current && location.pathname === '/map') {
              widget.style.display = 'none';
            }
          }, 0);
        };
        widget.addEventListener('elevenlabs-convai:call', onCall);
        widget.shadowRoot?.addEventListener('click', onWidgetClick, true);
        callListenerRef.current = onCall;
        widgetClickListenerRef.current = onWidgetClick;
        if (location.pathname === '/map') widget.style.display = 'none';
        document.body.appendChild(widget);
        widgetRef.current = widget;
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          console.error('[AI_CALL] Could not initialize the ElevenLabs widget:', error);
          toast.error('Adam’s call widget could not load. Check your connection and try again.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [location.pathname, navigate]);

  useEffect(() => {
    const onEndCall = () => {
      if (widgetRef.current && callListenerRef.current) {
        widgetRef.current.removeEventListener('elevenlabs-convai:call', callListenerRef.current);
      }
      if (widgetRef.current?.shadowRoot && widgetClickListenerRef.current) {
        widgetRef.current.shadowRoot.removeEventListener('click', widgetClickListenerRef.current, true);
      }
      widgetRef.current?.remove();
      widgetRef.current = null;
      callListenerRef.current = null;
      widgetClickListenerRef.current = null;
      callStartedRef.current = false;
      navigate('/map');
    };
    window.addEventListener('ami-call-end', onEndCall);
    return () => window.removeEventListener('ami-call-end', onEndCall);
  }, [navigate]);

  useEffect(() => {
    const onOpenCallWidget = () => {
      const widget = widgetRef.current;
      const launchButton = widget?.shadowRoot?.querySelector<HTMLButtonElement>(
        'button[aria-label="Start a fake call with Adam"]',
      );
      if (!widget || !launchButton) {
        toast.error('Adam’s call widget is still loading. Try again in a moment.');
        return;
      }
      widget.style.removeProperty('display');
      launchButton.click();
    };
    window.addEventListener('ami-open-call-widget', onOpenCallWidget);
    return () => window.removeEventListener('ami-open-call-widget', onOpenCallWidget);
  }, []);

  return null;
};
