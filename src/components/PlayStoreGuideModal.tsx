import React, { useState } from 'react';
import { Check, Copy, Download, Smartphone, X } from 'lucide-react';

interface PlayStoreGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHARED_APP_URL =
  'https://ais-pre-cx3satdakkelhrmqibqurz-974530825230.asia-southeast1.run.app';
const PACKAGE_ID = 'com.activehabib.patansocial';

export const PlayStoreGuideModal: React.FC<PlayStoreGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyText = (key: string, value: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(value).catch(() => {});
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#136168] text-white flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 urdu-text">
                گوگل پلے سٹور (Google Play Store) پر پبلش کرنے کا مکمل طریقہ
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                آپ کی ایپ اب مکمل طور پر PWA (Progressive Web App) اور Play Store کے لیے تیار کر دی گئی ہے!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Copyable App URL & Package ID Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="pb-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-900 urdu-text">
                پروجیکٹ کی تمام کوڈ فائلز اپنے کمپیوٹر پر سیو کریں:
              </p>
              <p className="text-[11px] text-slate-500">
                Includes all 37 files (src/, public/, package.json, firestore.rules, images)
              </p>
            </div>
            <a
              href="/active-habib-source-code.zip"
              download="active-habib-patan-social-code.zip"
              className="px-4 py-2 bg-[#FF6B1A] hover:bg-[#e55a0d] text-white text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>ڈاؤن لوڈ زپ فائل (Save All Code .ZIP)</span>
            </a>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-800 urdu-text">
              1. آپ کی ایپ کا لائیو لنک (Live Public App URL):
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <code className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 truncate">
                {SHARED_APP_URL}
              </code>
              <button
                type="button"
                onClick={() => copyText('url', SHARED_APP_URL)}
                className="px-3 py-2 bg-[#136168] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 hover:bg-[#0e4b51] whitespace-nowrap cursor-pointer"
              >
                {copiedKey === 'url' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>کاپی ہوگیا</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>لنک کاپی کریں</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-800 urdu-text">
              2. تجویز کردہ اینڈرائیڈ پیکج آئی ڈی (Android Package ID):
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <code className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 truncate">
                {PACKAGE_ID}
              </code>
              <button
                type="button"
                onClick={() => copyText('pkg', PACKAGE_ID)}
                className="px-3 py-2 bg-slate-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 hover:bg-slate-700 whitespace-nowrap cursor-pointer"
              >
                {copiedKey === 'pkg' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>کاپی ہوگیا</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>کاپی کریں</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Step-by-Step Urdu Guide */}
        <div className="space-y-3 text-right" dir="rtl">
          <div className="p-3.5 rounded-xl border border-slate-200 space-y-1">
            <h3 className="text-sm font-bold text-[#136168] urdu-text">
              مرحلہ 1: AI Studio سے اپنی ایپ کو Deploy کریں
            </h3>
            <p className="text-xs text-slate-700 urdu-text leading-relaxed">
              سب سے پہلے اوپر دائیں کونے میں موجود <strong>Deploy / Share</strong> بٹن پر کلک کریں تاکہ آپ کا پبلک لنک ہر کسی کے لیے لائیو ہو جائے۔ ہم نے آپ کی ایپ میں <code>manifest.webmanifest</code>، <code>Service Worker</code> اور <code>512x512</code> آئیکونز پہلے ہی لگا دیے ہیں۔
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 space-y-1">
            <h3 className="text-sm font-bold text-[#136168] urdu-text">
              مرحلہ 2: PWABuilder سے مفت Android (.aab اور .apk) فائل بنائیں
            </h3>
            <p className="text-xs text-slate-700 urdu-text leading-relaxed">
              1. اپنے براؤزر میں <strong>pwabuilder.com</strong> کھولیں۔
              <br />
              2. وہاں اوپر دیا گیا اپنا ایپ لنک پیسٹ کریں اور <strong>Start</strong> پر کلک کریں۔
              <br />
              3. پھر <strong>Package for stores</strong> پر کلک کریں اور <strong>Android (Google Play)</strong> کے نیچے <strong>Generate Package</strong> دبائیں۔
              <br />
              4. آپ کو ایک زپ فائل ملے گی جس میں پلے سٹور کے لیے <code>.aab</code> فائل اور فون میں ٹیسٹ کرنے کے لیے <code>.apk</code> فائل موجود ہوگی۔
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 space-y-1">
            <h3 className="text-sm font-bold text-[#136168] urdu-text">
              مرحلہ 3: Google Play Console پر اپ لوڈ کریں
            </h3>
            <p className="text-xs text-slate-700 urdu-text leading-relaxed">
              1. <strong>play.google.com/console</strong> پر اپنا ڈویلپر اکاؤنٹ کھولیں (اس کی ایک بار رجسٹریشن فیس $25 ہوتی ہے)۔
              <br />
              2. <strong>Create App</strong> پر کلک کریں اور نام <strong>Active Habib - Patan Social</strong> رکھیں۔
              <br />
              3. <strong>Production &rarr; Create new release</strong> میں جا کر PWABuilder سے ملنے والی <code>.aab</code> فائل اپ لوڈ کر دیں۔
              <br />
              4. سٹور لسٹنگ میں اپنا آئیکون اور سکرین شاٹس لگا کر <strong>Send for review</strong> کر دیں!
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
            <h3 className="text-sm font-bold text-emerald-900 urdu-text">
              بونس: بغیر پلے سٹور کے بھی ابھی فون میں انسٹال ہو سکتی ہے!
            </h3>
            <p className="text-xs text-emerald-800 urdu-text leading-relaxed">
              چونکہ ہم نے اسے مکمل PWA بنا دیا ہے، کوئی بھی صارف موبائل کے Chrome براؤزر میں یہ لنک کھول کر <strong>&quot;Add to Home Screen / Install App&quot;</strong> پر کلک کرے تو یہ بالکل اصلی اینڈرائیڈ ایپ کی طرح فون کی سکرین پر آئیکون کے ساتھ انسٹال ہو جائے گی!
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#136168] hover:bg-[#0e4b51] text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            سمجھ گیا · Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
