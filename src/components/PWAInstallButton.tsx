import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  onOpenPlayStoreGuide?: () => void;
  variant?: 'compact' | 'card';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  onOpenPlayStoreGuide,
  variant = 'compact',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (variant === 'card') {
    return (
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-[#136168] text-white flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900">
              موبائل ایپ اور پلے سٹور · Mobile App & Play Store
            </h3>
            <p className="text-[11px] text-slate-500">
              PWA Ready · Android AAB / APK Package
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {!isInstalled && isInstallable && (
            <button
              type="button"
              onClick={install}
              className="w-full py-2 px-3 bg-[#FF6B1A] hover:bg-[#e55a0d] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>فون میں انسٹال کریں (Install App)</span>
            </button>
          )}

          {!isInstalled && isIOS && (
            <button
              type="button"
              onClick={() => setShowIOSGuide(true)}
              className="w-full py-2 px-3 bg-[#FF6B1A] hover:bg-[#e55a0d] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>آئی فون پر انسٹال کریں (Install on iOS)</span>
            </button>
          )}

          {onOpenPlayStoreGuide && (
            <button
              type="button"
              onClick={onOpenPlayStoreGuide}
              className="w-full py-2 px-3 bg-[#136168] hover:bg-[#0e4b51] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              <span>پلے سٹور پر پبلش کرنے کا طریقہ (Play Store Guide)</span>
            </button>
          )}

          <a
            href="/active-habib-source-code.zip"
            download="active-habib-patan-social-code.zip"
            className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>تمام کوڈ کمپیوٹر پر سیو کریں (Download Code .ZIP)</span>
          </a>
        </div>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-sm rounded-xl bg-white p-6 space-y-4 border border-slate-200">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900">
                  Install on iPhone / iPad
                </h4>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                1. Tap the <strong>Share</strong> button in Safari toolbar.
                <br />
                2. Scroll down and tap <strong>Add to Home Screen</strong>.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-lg bg-[#136168] py-2 text-xs font-semibold text-white"
              >
                سمجھ گیا (Close)
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF6B1A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#e55a0d] transition-colors whitespace-nowrap cursor-pointer"
      >
        <Download className="w-3.5 h-3.5" />
        <span>ایپ انسٹال کریں</span>
      </button>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg">
      <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
      <span>آف لائن موڈ — محفوظ شدہ ڈیٹا استعمال ہو رہا ہے (Offline Mode)</span>
    </div>
  );
};
