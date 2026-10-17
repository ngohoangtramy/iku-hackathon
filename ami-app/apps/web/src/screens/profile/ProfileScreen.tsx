import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  User, 
  GraduationCap, 
  Sparkles, 
  Plus, 
  X, 
  Phone, 
  Settings, 
  LogOut, 
  Download, 
  Trash2, 
  Edit3, 
  Check, 
  Bell, 
  Lock, 
  MapPin, 
  Activity,
  Heart
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import api from '../../lib/api';
import type { TrustedContact } from '../../types';
import { BottomNav } from '../../components/ui/BottomNav';
import toast from 'react-hot-toast';

export const ProfileScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUser, clearAuth } = useStore();

  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bio, setBio] = useState(user?.bio || 'CS & AI @ UCL. Love running in Regent\'s Park, boba walks, and late night study sessions! 🏃‍♀️✨');
  const [interests, setInterests] = useState<string[]>(user?.interests || ['Sports & Fitness', 'Study Sessions', 'Boba', 'Tech', 'Running']);
  const [newInterestInput, setNewInterestInput] = useState('');
  const [showAddInterest, setShowAddInterest] = useState(false);

  const [trustedContacts, setTrustedContacts] = useState<TrustedContact[]>([]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactRel, setNewContactRel] = useState('');

  // Settings states
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationSharingDefault, setLocationSharingDefault] = useState(true);
  const [distressToggle, setDistressToggle] = useState(false);

  useEffect(() => {
    api.emergency.getTrustedContacts().then(setTrustedContacts).catch(() => {});
  }, []);

  const handleSaveBio = () => {
    updateUser({ bio });
    setIsEditingBio(false);
    toast.success('Bio updated!');
  };

  const handleAddInterest = () => {
    if (!newInterestInput.trim()) return;
    const updated = [...interests, newInterestInput.trim()];
    setInterests(updated);
    updateUser({ interests: updated });
    setNewInterestInput('');
    setShowAddInterest(false);
    toast.success('Interest added');
  };

  const handleRemoveInterest = (index: number) => {
    const updated = interests.filter((_, i) => i !== index);
    setInterests(updated);
    updateUser({ interests: updated });
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName || !newContactPhone) return;

    try {
      const added = await api.emergency.updateTrustedContact({
        name: newContactName,
        phone: newContactPhone,
        relationship: newContactRel || 'Contact',
      });
      setTrustedContacts((prev) => [...prev, added]);
      setNewContactName('');
      setNewContactPhone('');
      setNewContactRel('');
      setShowAddContact(false);
      toast.success('Trusted contact added');
    } catch {
      toast.error('Could not save contact');
    }
  };

  const handleExportData = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({ user, trustedContacts }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `ami_data_export_${user?.displayName || 'user'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success('Your data has been exported securely');
  };

  const handleSignOut = async () => {
    await api.auth.logout();
    clearAuth();
    toast('Signed out');
    navigate('/login');
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      await api.auth.deleteAccount();
      clearAuth();
      toast('Account successfully deleted');
      navigate('/login');
    }
  };

  const currentTier = user?.tier ?? 0;

  return (
    <div className="screen-container">
      {/* Rose Gradient Hero Header */}
      <div
        className="hero-pink"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          paddingBottom: '28px',
        }}
      >
        {/* Large Avatar */}
        <div style={{ position: 'relative', marginBottom: '14px' }}>
          <img
            src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
            alt={user?.displayName || 'User'}
            className="avatar avatar-xl"
            style={{ border: '4px solid white', boxShadow: '0 8px 24px rgba(0,0,0,0.18)' }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '4px',
              right: '4px',
              background: currentTier >= 2 ? '#9B59B6' : '#10B981',
              color: 'white',
              borderRadius: '50%',
              width: '26px',
              height: '26px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid white',
            }}
          >
            <ShieldCheck size={16} />
          </div>
        </div>

        <h1 style={{ fontSize: '24px', color: 'white', marginBottom: '4px' }}>
          {user?.displayName || 'Sarah Chen'}
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255, 255, 255, 0.95)', fontSize: '13px', marginBottom: '12px' }}>
          <GraduationCap size={16} />
          <span>{user?.universityDomain || 'ucl.ac.uk'}</span>
        </div>

        {/* Tier Status Badge */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <span
            className="badge"
            style={{
              background: 'white',
              color: currentTier >= 2 ? '#7B1FA2' : '#2E7D32',
              fontWeight: 800,
              fontSize: '11px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
          >
            <ShieldCheck size={12} /> Tier {currentTier} Verified
          </span>

          {currentTier < 2 && (
            <button
              onClick={() => updateUser({ tier: 2 })}
              style={{
                background: 'rgba(255, 255, 255, 0.25)',
                border: '1px solid white',
                color: 'white',
                borderRadius: '100px',
                padding: '3px 10px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Unlock Tier 2 (Demo)
            </button>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '8px',
          padding: '16px 20px',
          marginTop: '-16px',
          zIndex: 20,
        }}
      >
        <div
          className="card"
          style={{ padding: '12px', textAlign: 'center', borderRadius: '18px' }}
        >
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#FF6B9D' }}>8</div>
          <div style={{ fontSize: '11px', color: '#6B7280' }}>Events Attended</div>
        </div>
        <div
          className="card"
          style={{ padding: '12px', textAlign: 'center', borderRadius: '18px' }}
        >
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#9B59B6' }}>14</div>
          <div style={{ fontSize: '11px', color: '#6B7280' }}>Buddy Matches</div>
        </div>
        <div
          className="card"
          style={{ padding: '12px', textAlign: 'center', borderRadius: '18px' }}
        >
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#10B981' }}>27</div>
          <div style={{ fontSize: '11px', color: '#6B7280' }}>Routes Rated</div>
        </div>
      </div>

      {/* Body Sections */}
      <div style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Section: Bio */}
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>About Me</h3>
            {isEditingBio ? (
              <button onClick={handleSaveBio} className="btn btn-ghost" style={{ color: '#E8528A', padding: '4px' }}>
                <Check size={16} /> Save
              </button>
            ) : (
              <button onClick={() => setIsEditingBio(true)} className="btn btn-ghost" style={{ color: '#6B7280', padding: '4px' }}>
                <Edit3 size={16} />
              </button>
            )}
          </div>

          {isEditingBio ? (
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="input"
              rows={3}
              style={{ fontSize: '13px' }}
            />
          ) : (
            <p style={{ fontSize: '14px', color: '#4B5563', lineHeight: 1.5 }}>{bio}</p>
          )}
        </div>

        {/* Section: Interests */}
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Interests & Hobbies</h3>
            <button
              onClick={() => setShowAddInterest(!showAddInterest)}
              className="btn btn-ghost"
              style={{ color: '#E8528A', padding: '4px', fontSize: '12px', gap: '4px' }}
            >
              <Plus size={14} /> Add
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {interests.map((interest, i) => (
              <span
                key={i}
                style={{
                  background: 'var(--color-primary-bg)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-primary-deep)',
                  padding: '6px 12px',
                  borderRadius: '100px',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {interest}
                <X
                  size={12}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleRemoveInterest(i)}
                />
              </span>
            ))}
          </div>

          {showAddInterest && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <input
                type="text"
                value={newInterestInput}
                onChange={(e) => setNewInterestInput(e.target.value)}
                placeholder="e.g. Photography"
                className="input"
                style={{ padding: '8px 12px', fontSize: '13px' }}
              />
              <button
                onClick={handleAddInterest}
                className="btn btn-primary"
                style={{ padding: '8px 14px', fontSize: '13px' }}
              >
                Add
              </button>
            </div>
          )}
        </div>

        {/* Section: Trusted Contacts */}
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Trusted Contacts</h3>
            <button
              onClick={() => setShowAddContact(!showAddContact)}
              className="btn btn-ghost"
              style={{ color: '#E8528A', padding: '4px', fontSize: '12px', gap: '4px' }}
            >
              <Plus size={14} /> Add Contact
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {trustedContacts.map((c) => (
              <div
                key={c.id}
                style={{
                  background: '#F9FAFB',
                  border: '1px solid var(--color-border)',
                  padding: '10px 14px',
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#1A1A2E' }}>{c.name}</div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>
                    {c.relationship} • {c.phone}
                  </div>
                </div>
                <a
                  href={`tel:${c.phone}`}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#E8F5E9',
                    color: '#2E7D32',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textDecoration: 'none',
                  }}
                >
                  <Phone size={16} />
                </a>
              </div>
            ))}
          </div>

          {showAddContact && (
            <form onSubmit={handleAddContact} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
              <input
                type="text"
                placeholder="Full Name"
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                className="input"
                style={{ padding: '8px 12px', fontSize: '13px' }}
                required
              />
              <input
                type="tel"
                placeholder="Phone Number (e.g. +44 7700 900123)"
                value={newContactPhone}
                onChange={(e) => setNewContactPhone(e.target.value)}
                className="input"
                style={{ padding: '8px 12px', fontSize: '13px' }}
                required
              />
              <input
                type="text"
                placeholder="Relationship (e.g. Mother, Flatmate)"
                value={newContactRel}
                onChange={(e) => setNewContactRel(e.target.value)}
                className="input"
                style={{ padding: '8px 12px', fontSize: '13px' }}
              />
              <button type="submit" className="btn btn-primary btn-full" style={{ padding: '10px' }}>
                Save Trusted Contact
              </button>
            </form>
          )}
        </div>

        {/* Section: Settings & Privacy */}
        <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Settings & Permissions</h3>

          {/* Toggle 1: Notifications */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Bell size={18} color="#FF6B9D" />
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>Push Notifications</div>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>Safety alerts and message replies</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={notificationsEnabled}
              onChange={(e) => setNotificationsEnabled(e.target.checked)}
              style={{ accentColor: '#FF6B9D', width: '20px', height: '20px' }}
            />
          </div>

          {/* Toggle 2: Location sharing */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <MapPin size={18} color="#9B59B6" />
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>Default Location Sharing</div>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>Only active during scheduled trips</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={locationSharingDefault}
              onChange={(e) => setLocationSharingDefault(e.target.checked)}
              style={{ accentColor: '#FF6B9D', width: '20px', height: '20px' }}
            />
          </div>

          {/* Toggle 3: Distress detection */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Activity size={18} color="#D97706" />
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>Experimental Distress Alerts</div>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>On-device movement and drop monitor</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={distressToggle}
              onChange={(e) => {
                setDistressToggle(e.target.checked);
                toast(e.target.checked ? 'Distress monitor enabled' : 'Distress monitor disabled');
              }}
              style={{ accentColor: '#FF6B9D', width: '20px', height: '20px' }}
            />
          </div>
        </div>

        {/* Section: Account Actions */}
        <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>Account & Data</h3>

          <button
            onClick={handleExportData}
            className="btn btn-ghost"
            style={{ justifyContent: 'flex-start', padding: '10px', color: '#374151', gap: '10px' }}
          >
            <Download size={18} color="#6B7280" />
            <span>Export My Data (GDPR Copy)</span>
          </button>

          <button
            onClick={handleSignOut}
            className="btn btn-ghost"
            style={{ justifyContent: 'flex-start', padding: '10px', color: '#E8528A', gap: '10px' }}
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>

          <button
            onClick={handleDeleteAccount}
            className="btn btn-ghost"
            style={{ justifyContent: 'flex-start', padding: '10px', color: '#EF4444', gap: '10px' }}
          >
            <Trash2 size={18} />
            <span>Delete Account & Erase Data</span>
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};
