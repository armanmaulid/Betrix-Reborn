'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginSchema, type LoginInput } from '@/modules/identity/application/schemas/auth.schema';
import { Lock, Terminal, ShieldAlert, Cpu, CheckCircle2 } from 'lucide-react';
import { usePageTitle } from '@/shared/presentation/hooks/use-page-title';

function LoginForm() {
  usePageTitle('TERMINAL AUTH');
  const searchParams = useSearchParams();
  const rawReturn = searchParams.get('from') || '';
  const returnUrl = rawReturn.startsWith('/') && !rawReturn.startsWith('//') ? rawReturn : '/dashboard';

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [captchaData, setCaptchaData] = useState<{ id: string; question: string } | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const [fingerprint, setFingerprint] = useState<string>('BTX-ADM-NODE-INITIAL');

  // Generate or load persistent device fingerprint
  useEffect(() => {
    let fp = localStorage.getItem('betrix_device_fp');
    if (!fp) {
      fp = 'BTX-ADM-' + Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
      localStorage.setItem('betrix_device_fp', fp);
    }
    setFingerprint(fp);
  }, []);

  // Handle countdown timer if rate limit delay is active
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: '',
      password: '',
      deviceFingerprint: fingerprint,
      captchaId: '',
      captchaAnswer: ''
    }
  });

  // Keep device fingerprint in sync
  useEffect(() => {
    if (fingerprint) {
      setValue('deviceFingerprint', fingerprint);
    }
  }, [fingerprint, setValue]);

  const onSubmit = async (values: LoginInput) => {
    if (cooldownSeconds > 0) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          deviceFingerprint: fingerprint
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        // Check for 428 Precondition Required (CAPTCHA required)
        if (response.status === 428 || result.error?.captchaId) {
          setCaptchaData({
            id: result.error.captchaId || 'captcha-req',
            question: result.error.message || 'Math Challenge Required'
          });
          setValue('captchaId', result.error.captchaId);
        }

        // Check for progressive delay
        if (result.error?.delayMs) {
          const seconds = Math.ceil(result.error.delayMs / 1000);
          setCooldownSeconds(seconds);
        }

        setErrorMessage(result.error?.message || 'Authentication failed. Please verify credentials.');
        return;
      }

      // Success -> Redirect to dashboard with full page reload to ensure session cookies are active
      window.location.href = returnUrl;
    } catch (err: any) {
      setErrorMessage(err.message || 'Network connection to authentication gateway failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      {/* Background terminal grid effect */}
      <div className="w-full max-w-md border border-border bg-surface shadow-2xl relative">
        {/* Top Bloomberg Titlebar */}
        <div className="bg-black border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="h-2.5 w-2.5 bg-accent inline-block animate-pulse"></span>
            <span className="font-mono text-xs font-bold tracking-widest text-accent uppercase">
              BETRIX // TERMINAL AUTH
            </span>
          </div>
          <div className="flex items-center space-x-1.5 text-muted-foreground font-mono text-[10px]">
            <Cpu className="w-3 h-3 text-accent" />
            <span>FASTIFY v5</span>
          </div>
        </div>

        {/* Form Container */}
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2 font-mono">
              <Lock className="w-4 h-4 text-accent" />
              ADMINISTRATOR LOGIN
            </h1>
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              RESTRICTED ACCESS :: AUTHORIZED PERSONNEL ONLY
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-5 border border-negative/50 bg-negative/10 p-3 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-negative shrink-0 mt-0.5" />
              <div className="text-xs font-mono text-negative leading-tight">
                <span className="font-bold">AUTH_FAILURE: </span>
                {errorMessage}
              </div>
            </div>
          )}

          {/* Cooldown Timer Alert */}
          {cooldownSeconds > 0 && (
            <div className="mb-5 border border-accent/50 bg-accent/10 p-3 font-mono text-xs text-accent flex items-center justify-between">
              <span>RATE_LIMIT_PENALTY:</span>
              <span className="font-bold tabular-nums">RETRY IN {cooldownSeconds}s</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">
                Admin Email
              </label>
              <input
                type="email"
                {...register('email')}
                placeholder="name@company.com"
                autoComplete="email"
                disabled={isLoading || cooldownSeconds > 0}
                className="w-full bg-black border border-border px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-accent transition-colors"
              />
              {errors.email && (
                <span className="text-[11px] font-mono text-negative mt-1 block">
                  {errors.email.message}
                </span>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                type="password"
                {...register('password')}
                placeholder="••••••••••••"
                autoComplete="current-password"
                disabled={isLoading || cooldownSeconds > 0}
                className="w-full bg-black border border-border px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-accent transition-colors"
              />
              {errors.password && (
                <span className="text-[11px] font-mono text-negative mt-1 block">
                  {errors.password.message}
                </span>
              )}
            </div>

            {/* Dynamic Math CAPTCHA Field */}
            {captchaData && (
              <div className="border border-border/80 bg-black/80 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-accent font-semibold flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5" />
                    ANTI-BRUTEFORCE CHALLENGE
                  </span>
                </div>
                <div className="text-xs font-mono text-foreground">
                  Solve: <span className="font-bold text-accent">{captchaData.question}</span>
                </div>
                <input
                  type="text"
                  {...register('captchaAnswer')}
                  placeholder="Enter math answer"
                  disabled={isLoading || cooldownSeconds > 0}
                  className="w-full bg-black border border-border px-3 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-accent"
                />
              </div>
            )}

            {/* Device Fingerprint Indicator */}
            <div className="pt-1 flex items-center justify-between text-[10px] font-mono text-muted-foreground border-t border-border/50">
              <span>DEVICE_FP:</span>
              <span className="text-foreground/70 truncate max-w-[200px]" title={fingerprint}>
                {fingerprint}
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || cooldownSeconds > 0}
              className="w-full mt-2 bg-accent text-black font-mono text-xs font-bold uppercase tracking-widest py-2.5 px-4 hover:bg-accent/90 focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <span className="h-2 w-2 bg-black rounded-full animate-ping"></span>
                  AUTHENTICATING...
                </>
              ) : cooldownSeconds > 0 ? (
                `COOLDOWN (${cooldownSeconds}s)`
              ) : (
                'ESTABLISH SESSION'
              )}
            </button>
          </form>
        </div>

        {/* Footer info bar */}
        <div className="bg-black/60 border-t border-border px-4 py-2 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
          <span>ENCRYPTION: TLS 1.3 / AES-256</span>
          <span className="text-positive flex items-center gap-1">
            <CheckCircle2 className="w-2.5 h-2.5" />
            NODE ONLINE
          </span>
        </div>
      </div>
    </div>
  );
}

export default function TerminalLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center font-mono text-xs text-accent">INITIALIZING TERMINAL AUTH...</div>}>
      <LoginForm />
    </Suspense>
  );
}
