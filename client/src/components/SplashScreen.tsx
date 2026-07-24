import React, { useEffect, useMemo, useState } from 'react';
import { useUiSettings } from '@/context/UiSettingsContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { prefetchBootstrap } from '@/lib/bootstrap';
import waselLogo from '@assets/wasel-logo.png';

interface SplashScreenProps {
  onFinish: () => void;
}

const MIN_SPLASH_MS = 1400;
const MAX_BOOTSTRAP_MS = 6000;

const PARTICLE_COUNT = 22;
const TWINKLE_COUNT = 14;
const RAY_COUNT = 12;

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const { getSetting, loading: settingsLoading } = useUiSettings();
  const { user } = useAuth();
  const [show, setShow] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();

    const phone = user?.phone || localStorage.getItem('customer_phone') || '';
    const customerId = user?.id || '';

    const bootPromise = prefetchBootstrap({ phone, customerId, force: true });
    const timeoutPromise = new Promise(resolve => setTimeout(resolve, MAX_BOOTSTRAP_MS));

    Promise.race([bootPromise, timeoutPromise]).finally(() => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, MIN_SPLASH_MS - elapsed);
      setTimeout(() => {
        if (!cancelled) setReady(true);
      }, remaining);
    });

    return () => { cancelled = true; };
  }, [user?.id, user?.phone]);

  // Pre-compute random positions once so they don't shift on re-render
  const particles = useMemo(() =>
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: 20 + Math.random() * 60,
      size: 3 + Math.random() * 6,
      delay: Math.random() * 6,
      duration: 5 + Math.random() * 4,
      hue: Math.random() > 0.5 ? '#F05215' : '#FF7840',
    })), []);

  const twinkles = useMemo(() =>
    Array.from({ length: TWINKLE_COUNT }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: 2 + Math.random() * 3,
      delay: Math.random() * 2.4,
    })), []);

  const rays = useMemo(() =>
    Array.from({ length: RAY_COUNT }, (_, i) => ({
      id: i,
      angle: (360 / RAY_COUNT) * i,
      delay: (i * 0.15) % 4,
    })), []);

  if (settingsLoading) {
    return (
      <div className="fixed inset-0 bg-[#1A0600] z-[9999] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F05215]"></div>
      </div>
    );
  }

  const logoUrl = getSetting('logo_url') || waselLogo;
  const splashTitle = getSetting('splash_title') || 'السريع ون';
  const splashSubtitle = getSetting('splash_subtitle') || 'نوصل لك بكل سرعة وأمان';
  const buttonText = getSetting('splash_button_text') || 'ابدأ الآن';

  const handleStart = () => {
    setShow(false);
    setTimeout(onFinish, 500);
  };

  if (!show) {
    return (
      <div className="fixed inset-0 bg-[#C73208] z-[9999] transition-opacity duration-500 opacity-0 pointer-events-none" />
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col transition-opacity duration-500 overflow-hidden bg-gradient-to-b from-[#C73208] via-[#E03A0E] to-[#B52200]">
      {/* خلفية شبكية متدرجة متحركة */}
      <div className="absolute inset-0 splash-bg-mesh pointer-events-none" />

      {/* خلفيات إشعاع كبيرة */}
      <div className="absolute -top-32 -right-24 w-96 h-96 rounded-full bg-[#F05215] opacity-25 blur-3xl animate-pulse" />
      <div className="absolute -bottom-32 -left-24 w-[28rem] h-[28rem] rounded-full bg-[#FF7840] opacity-20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/3 left-1/4 w-64 h-64 rounded-full bg-[#F05215] opacity-10 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />

      {/* نجوم متلألئة منتشرة في الخلفية */}
      <div className="absolute inset-0 pointer-events-none">
        {twinkles.map((t) => (
          <span
            key={t.id}
            className="absolute rounded-full bg-white splash-twinkle"
            style={{
              left: `${t.left}%`,
              top: `${t.top}%`,
              width: `${t.size}px`,
              height: `${t.size}px`,
              animationDelay: `${t.delay}s`,
              boxShadow: '0 0 8px rgba(255,255,255,0.8)',
            }}
          />
        ))}
      </div>

      {/* خطوط سرعة جانبية */}
      <div className="absolute inset-0 overflow-hidden opacity-50 pointer-events-none">
        <div className="absolute top-1/4 right-0 h-1 w-32 bg-gradient-to-l from-[#F05215] to-transparent rounded-full splash-speed-line" />
        <div className="absolute top-1/3 right-0 h-0.5 w-24 bg-gradient-to-l from-[#FF7840] to-transparent rounded-full splash-speed-line" style={{ animationDelay: '0.4s' }} />
        <div className="absolute top-1/2 right-0 h-1 w-40 bg-gradient-to-l from-[#F05215] to-transparent rounded-full splash-speed-line" style={{ animationDelay: '0.8s' }} />
        <div className="absolute top-2/3 right-0 h-0.5 w-28 bg-gradient-to-l from-[#FF7840] to-transparent rounded-full splash-speed-line" style={{ animationDelay: '1.2s' }} />
      </div>

      {/* قسم الشعار */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        <div className="relative">
          {/* أشعة ضوئية تنبثق من الشعار */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-80 h-80">
              {rays.map((ray) => (
                <div
                  key={ray.id}
                  className="absolute top-1/2 left-1/2 origin-center splash-ray"
                  style={{
                    width: '2px',
                    height: '180px',
                    marginTop: '-90px',
                    marginLeft: '-1px',
                    background: 'linear-gradient(to top, transparent, #F05215 60%, transparent)',
                    transform: `rotate(${ray.angle}deg)`,
                    animationDelay: `${ray.delay}s`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* موجات صدى متوسعة (sonar pulse) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="absolute w-48 h-48 rounded-full border-2 border-[#F05215] splash-pulse-ring" />
            <div className="absolute w-48 h-48 rounded-full border-2 border-[#FF7840] splash-pulse-ring" style={{ animationDelay: '1s' }} />
            <div className="absolute w-48 h-48 rounded-full border-2 border-[#F05215] splash-pulse-ring" style={{ animationDelay: '2s' }} />
          </div>

          {/* الشعار + الهالة */}
          <div className="relative splash-logo-enter">
            {/* هالة توهج خلف الشعار */}
            <div className="absolute inset-0 bg-[#F05215] rounded-full blur-[80px] opacity-50 scale-90" />
            <div className="absolute inset-0 bg-[#FF7840] rounded-full blur-[120px] opacity-30 scale-110" />

            {/* 3 حلقات مدارية بسرعات مختلفة */}
            <div className="absolute inset-0 -m-4 md:-m-6 rounded-full border-2 border-dashed border-[#F05215]/50 splash-rotate-slow pointer-events-none" />
            <div className="absolute inset-0 -m-10 md:-m-12 rounded-full border border-[#F05215]/25 splash-rotate-reverse pointer-events-none" />
            <div className="absolute inset-0 -m-16 md:-m-20 rounded-full border border-dotted border-[#FF7840]/20 splash-rotate-medium pointer-events-none" />

            {/* الشعار مع تأثير اللمعان */}
            <div className="relative w-64 h-64 md:w-80 md:h-80">
              <img
                src={logoUrl}
                alt="السريع ون - Saree One"
                className="relative w-full h-full object-contain drop-shadow-[0_25px_60px_rgba(240,82,21,0.65)] splash-float"
                data-testid="img-splash-logo"
              />
              {/* طبقة لمعان تمر على الشعار */}
              <div className="absolute inset-0 splash-shimmer rounded-full pointer-events-none" />
            </div>

            {/* نجوم تدور على الحلقة الداخلية */}
            <div className="absolute inset-0 -m-4 md:-m-6 splash-rotate-slow pointer-events-none">
              <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#F05215] shadow-[0_0_15px_rgba(240,82,21,1)]" />
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)]" />
              <span className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 w-2 h-2 rounded-full bg-[#FF7840] shadow-[0_0_10px_rgba(255,120,64,0.9)]" />
              <span className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#FF7840] shadow-[0_0_10px_rgba(255,120,64,0.9)]" />
            </div>

            {/* نجوم على الحلقة الخارجية تدور بعكس الاتجاه */}
            <div className="absolute inset-0 -m-10 md:-m-12 splash-rotate-reverse pointer-events-none">
              <span className="absolute top-1/4 right-0 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
              <span className="absolute bottom-1/4 left-0 w-1.5 h-1.5 rounded-full bg-[#F05215] shadow-[0_0_8px_rgba(240,82,21,0.9)]" />
            </div>
          </div>

          {/* جسيمات ذهبية تطفو حول الشعار */}
          <div className="absolute inset-0 -m-32 pointer-events-none">
            {particles.map((p) => (
              <span
                key={p.id}
                className="absolute rounded-full splash-particle"
                style={{
                  left: `${p.left}%`,
                  top: `${p.top}%`,
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  background: p.hue,
                  boxShadow: `0 0 ${p.size * 2}px ${p.hue}`,
                  animationDelay: `${p.delay}s`,
                  animationDuration: `${p.duration}s`,
                }}
              />
            ))}
          </div>
        </div>

        {/* العنوان والوصف */}
        <div className="mt-12 text-center space-y-3 splash-text-enter">
          {/* اسم العلامة - حروف تظهر واحداً واحداً */}
          <h1
            className="text-5xl md:text-6xl font-black text-white tracking-tight drop-shadow-[0_4px_20px_rgba(240,82,21,0.5)]"
            data-testid="text-splash-title"
            aria-label={splashTitle}
          >
            {splashTitle.split('').map((ch, i) => (
              <span
                key={i}
                className="splash-letter"
                style={{ animationDelay: `${1 + i * 0.12}s` }}
              >
                {ch === ' ' ? '\u00A0' : ch}
              </span>
            ))}
          </h1>

          <div className="flex items-center justify-center gap-2">
            <span className="h-px w-10 bg-gradient-to-l from-transparent to-[#F05215]" />
            <p className="text-[#F05215] text-xs md:text-sm font-bold tracking-[0.4em]">SAREE ONE</p>
            <span className="h-px w-10 bg-gradient-to-r from-transparent to-[#F05215]" />
          </div>
          <p className="text-base md:text-lg font-medium text-white/75 leading-relaxed max-w-[320px] md:max-w-md mx-auto pt-2">
            {splashSubtitle}
          </p>
        </div>
      </div>

      {/* قسم الزر */}
      <div className="w-full px-8 pb-10 md:pb-14 relative z-10 splash-button-enter">
        <div className="max-w-sm mx-auto">
          <Button
            onClick={handleStart}
            disabled={!ready}
            data-testid="button-splash-start"
            className="w-full h-16 md:h-[68px] rounded-2xl text-lg md:text-xl font-black bg-gradient-to-r from-[#F05215] to-[#FF7840] hover:from-[#E89512] hover:to-[#F05215] text-[#1A0600] shadow-[0_15px_40px_rgba(240,82,21,0.45)] flex items-center justify-center gap-3 active:scale-95 transition-all group disabled:opacity-70 disabled:cursor-not-allowed border border-white/10 relative overflow-hidden"
          >
            {ready ? (
              <>
                <span className="relative z-10">{buttonText}</span>
                <ChevronLeft className="h-6 w-6 group-hover:-translate-x-2 transition-transform relative z-10" />
                {/* لمعان داخل الزر */}
                <span className="absolute inset-0 splash-shimmer" />
              </>
            ) : (
              <span className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="flex gap-1">
                  <span className="splash-loading-dot inline-block w-1.5 h-1.5 rounded-full bg-[#1A0600]" style={{ animationDelay: '0s' }} />
                  <span className="splash-loading-dot inline-block w-1.5 h-1.5 rounded-full bg-[#1A0600]" style={{ animationDelay: '0.2s' }} />
                  <span className="splash-loading-dot inline-block w-1.5 h-1.5 rounded-full bg-[#1A0600]" style={{ animationDelay: '0.4s' }} />
                </span>
                <span>جاري التحميل</span>
              </span>
            )}
          </Button>
          <p className="text-center text-white/40 text-xs mt-4 font-medium tracking-wide">
            © 2026 السريع ون · جميع الحقوق محفوظة
          </p>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
