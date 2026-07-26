import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import {
  Palette, Type, MousePointer, Volume2, Keyboard, Zap, RotateCcw, Save, LogOut
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AppLayout } from '@layouts/AppLayout';
import { Select } from '@components/common/Input';
import { Button } from '@components/common/Button';
import { useSettingsStore } from '@store/settings.store';
import { useAuthStore } from '@store/auth.store';
import { ROUTES } from '@constants';

const SettingsSection = ({ icon: Icon, title, children }) => (
  <div className="glass-card p-5 space-y-4">
    <h3 className="font-semibold text-text-primary flex items-center gap-2 text-sm">
      <Icon size={16} className="text-primary" /> {title}
    </h3>
    {children}
  </div>
);

const Toggle = ({ label, description, checked, onChange }) => (
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-text-primary">{label}</p>
      {description && <p className="text-xs text-muted mt-0.5">{description}</p>}
    </div>
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-surface-2'}`}
    >
      <motion.span
        animate={{ x: checked ? 20 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
      />
    </button>
  </div>
);

const Settings = () => {
  const settings = useSettingsStore();
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate(ROUTES.HOME);
    toast.success('Logged out successfully');
  };

  const handleReset = () => {
    settings.resetToDefaults();
    toast.success('Settings reset to defaults');
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
          <p className="text-text-secondary text-sm mt-1">Customize your CodeType AI experience</p>
        </div>

        {/* Appearance */}
        <SettingsSection icon={Palette} title="Appearance">
          <Select
            label="Color Theme"
            value={settings.theme}
            onChange={e => settings.setTheme(e.target.value)}
            options={[
              { value: 'dark', label: 'Dark (Default)' },
              { value: 'darker', label: 'Darker' },
              { value: 'midnight', label: 'Midnight Blue' },
            ]}
          />
          <Select
            label="Animation Speed"
            value={settings.animationSpeed}
            onChange={e => settings.setAnimationSpeed(e.target.value)}
            options={[
              { value: 'slow', label: 'Slow' },
              { value: 'normal', label: 'Normal' },
              { value: 'fast', label: 'Fast' },
              { value: 'off', label: 'Off' },
            ]}
          />
        </SettingsSection>

        {/* Typography */}
        <SettingsSection icon={Type} title="Typography">
          <Select
            label="Font Family"
            value={settings.font}
            onChange={e => settings.setFont(e.target.value)}
            options={[
              { value: 'JetBrains Mono', label: 'JetBrains Mono (Recommended)' },
              { value: 'Fira Code', label: 'Fira Code' },
              { value: 'Source Code Pro', label: 'Source Code Pro' },
              { value: 'Courier New', label: 'Courier New' },
            ]}
          />
          <Select
            label="Font Size"
            value={settings.fontSize}
            onChange={e => settings.setFontSize(Number(e.target.value))}
            options={[12, 13, 14, 15, 16, 18, 20].map(s => ({ value: s, label: `${s}px` }))}
          />
        </SettingsSection>

        {/* Cursor */}
        <SettingsSection icon={MousePointer} title="Cursor">
          <Select
            label="Cursor Style"
            value={settings.cursorStyle}
            onChange={e => settings.setCursorStyle(e.target.value)}
            options={[
              { value: 'line', label: 'Line (|)' },
              { value: 'block', label: 'Block (█)' },
              { value: 'underline', label: 'Underline (_)' },
            ]}
          />
          <Toggle
            label="Cursor Blink"
            description="Animate cursor blinking"
            checked={settings.cursorBlink}
            onChange={() => settings.setCursorStyle(settings.cursorStyle)}
          />
          <Toggle
            label="Smooth Caret"
            description="Smooth cursor movement between characters"
            checked={settings.smoothCaret}
            onChange={settings.toggleSmoothCaret}
          />
        </SettingsSection>

        {/* Sound */}
        <SettingsSection icon={Volume2} title="Sound">
          <Toggle
            label="Typing Sounds"
            description="Play keyboard click sounds while typing"
            checked={settings.soundEnabled}
            onChange={settings.toggleSound}
          />
        </SettingsSection>

        {/* Keyboard */}
        <SettingsSection icon={Keyboard} title="Keyboard Behavior">
          <Select
            label="Keyboard Layout"
            value={settings.keyboardLayout}
            onChange={e => settings.setKeyboardLayout(e.target.value)}
            options={[
              { value: 'qwerty', label: 'QWERTY' },
              { value: 'dvorak', label: 'Dvorak' },
              { value: 'colemak', label: 'Colemak' },
            ]}
          />
          <Toggle
            label="Confidence Mode"
            description="Disable backspace — commit to every keystroke"
            checked={settings.confidenceMode}
            onChange={settings.toggleConfidenceMode}
          />
          <Toggle
            label="Stop on Error"
            description="Pause progress on wrong keystrokes"
            checked={settings.stopOnError}
            onChange={settings.toggleStopOnError}
          />
        </SettingsSection>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="ghost" onClick={handleReset} className="flex items-center gap-2 border border-border flex-1">
            <RotateCcw size={15} /> Reset to Defaults
          </Button>
          <Button variant="danger" onClick={handleLogout} className="flex items-center gap-2 flex-1">
            <LogOut size={15} /> Sign Out
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default Settings;
