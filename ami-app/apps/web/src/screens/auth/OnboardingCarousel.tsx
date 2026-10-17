import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronRight, Shield, MapPin, Users, Coffee, Sparkles } from 'lucide-react';

interface Slide {
  title: string;
  subtitle: string;
  gradient: string;
  illustration: React.ReactNode;
}

export const OnboardingCarousel: React.FC = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides: Slide[] = [
    {
      title: 'Your Safety Companion',
      subtitle: 'Real-time navigation optimized for well-lit streets, verified safe havens, and 24/7 AI companion assistance.',
      gradient: 'linear-gradient(160deg, #FF94B8 0%, #FF6B9D 50%, #E8528A 100%)',
      illustration: (
        <div style={{ position: 'relative', width: '220px', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            className="ami-auth-screen ami-onboarding-screen"
            style={{
              position: 'absolute',
              width: '180px',
              height: '180px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.18)',
              animation: 'pulse 3s infinite',
            }}
          />
          <div
            style={{
              width: '130px',
              height: '130px',
              borderRadius: '36px',
              background: 'rgba(255, 255, 255, 0.28)',
              backdropFilter: 'blur(10px)',
              border: '2px solid rgba(255, 255, 255, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
            }}
          >
            <Shield size={64} color="#FFFFFF" strokeWidth={1.8} />
          </div>
          <div
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
            }}
          >
            <MapPin size={26} color="#E8528A" />
          </div>
        </div>
      ),
    },
    {
      title: 'Find Your People',
      subtitle: 'Verified peer matching for university students. Discover running buddies, library partners, and friendly meetups.',
      gradient: 'linear-gradient(160deg, #FF7FA5 0%, #E8528A 50%, #9B59B6 100%)',
      illustration: (
        <div style={{ position: 'relative', width: '240px', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Avatar 1 */}
          <div
            style={{
              position: 'absolute',
              top: '20px',
              left: '30px',
              width: '74px',
              height: '74px',
              borderRadius: '50%',
              background: 'white',
              border: '4px solid rgba(255,255,255,0.8)',
              boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '24px',
              color: '#FF6B9D',
            }}
          >
            SC
          </div>
          {/* Avatar 2 */}
          <div
            style={{
              position: 'absolute',
              bottom: '25px',
              left: '60px',
              width: '84px',
              height: '84px',
              borderRadius: '50%',
              background: '#FFF0F5',
              border: '4px solid white',
              boxShadow: '0 16px 28px rgba(0,0,0,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '28px',
              color: '#9B59B6',
            }}
          >
            ER
          </div>
          {/* Avatar 3 */}
          <div
            style={{
              position: 'absolute',
              top: '35px',
              right: '25px',
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: '#FFFFFF',
              border: '4px solid white',
              boxShadow: '0 14px 26px rgba(0,0,0,0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '26px',
              color: '#E8528A',
            }}
          >
            AM
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: '20px',
              right: '40px',
              background: '#FFFFFF',
              borderRadius: '100px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#E8528A',
              boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Sparkles size={14} /> 94% Match
          </div>
        </div>
      ),
    },
    {
      title: 'Explore with Confidence',
      subtitle: 'Join curated campus events, study sessions, and cafe gatherings verified by real community members.',
      gradient: 'linear-gradient(160deg, #FF6B9D 0%, #D8437A 50%, #7B1FA2 100%)',
      illustration: (
        <div style={{ position: 'relative', width: '220px', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            style={{
              width: '140px',
              height: '140px',
              borderRadius: '32px',
              background: 'rgba(255, 255, 255, 0.25)',
              backdropFilter: 'blur(12px)',
              border: '2px solid rgba(255, 255, 255, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 16px 36px rgba(0,0,0,0.15)',
            }}
          >
            <Coffee size={64} color="#FFFFFF" strokeWidth={1.8} />
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: '15px',
              right: '20px',
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#7B1FA2',
              boxShadow: '0 8px 18px rgba(0,0,0,0.18)',
            }}
          >
            📍 Bloomsbury Hub
          </div>
        </div>
      ),
    },
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      navigate('/signup');
    }
  };

  const handleSkip = () => {
    navigate('/signup');
  };

  const slide = slides[currentSlide];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: slide.gradient,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '24px 24px 44px',
        transition: 'background 0.5s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '48px' }}>
        <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 800, fontSize: '20px', letterSpacing: '-0.02em' }}>
          ami
        </span>
        <button
          onClick={handleSkip}
          className="btn"
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            color: 'white',
            borderRadius: '100px',
            padding: '6px 14px',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          Skip
        </button>
      </div>

      {/* Main Illustration Area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '20px 0',
        }}
      >
        <div style={{ marginBottom: '32px' }}>{slide.illustration}</div>

        <h2
          style={{
            fontSize: '28px',
            fontWeight: 800,
            color: 'white',
            marginBottom: '14px',
            letterSpacing: '-0.03em',
            lineHeight: 1.25,
            textShadow: '0 2px 10px rgba(0,0,0,0.12)',
          }}
        >
          {slide.title}
        </h2>

        <p
          style={{
            fontSize: '15px',
            color: 'rgba(255, 255, 255, 0.92)',
            lineHeight: 1.5,
            maxWidth: '320px',
          }}
        >
          {slide.subtitle}
        </p>
      </div>

      {/* Footer: Dots & Next Button */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Dot Indicators */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
              style={{
                width: index === currentSlide ? '28px' : '8px',
                height: '8px',
                borderRadius: '4px',
                background: index === currentSlide ? '#FFFFFF' : 'rgba(255, 255, 255, 0.35)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>

        {/* Action Button */}
        <button
          onClick={handleNext}
          className="btn"
          style={{
            background: 'white',
            color: '#E8528A',
            padding: '18px 24px',
            borderRadius: '18px',
            fontSize: '16px',
            fontWeight: 700,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            gap: '8px',
          }}
        >
          <span>{currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}</span>
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
};
