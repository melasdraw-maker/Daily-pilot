// Web Audio API Alarm generator & Android Native Alarm intent helper

let audioCtx: AudioContext | null = null;
let activeAlarmInterval: any = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Plays a pleasant progressive chime using Web Audio API oscillators
 */
export function playChimeTone(type: 'zen' | 'gentle' | 'radar' = 'gentle') {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  if (type === 'zen') {
    const frequencies = [528, 660, 792, 1056];
    frequencies.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.25);
      gain.gain.setValueAtTime(0, now + idx * 0.25);
      gain.gain.linearRampToValueAtTime(0.3, now + idx * 0.25 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.25 + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.25);
      osc.stop(now + idx * 0.25 + 1.2);
    });
  } else if (type === 'radar') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1760, now + 0.3);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  } else {
    // Gentle progressive chime
    const chords = [440, 554.37, 659.25]; // A major
    chords.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.15);
      gain.gain.setValueAtTime(0, now + idx * 0.15);
      gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.15 + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 1.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.15);
      osc.stop(now + idx * 0.15 + 1.4);
    });
  }
}

export function startWebAlarm(soundType: 'zen' | 'gentle' | 'radar' = 'gentle') {
  stopWebAlarm();
  playChimeTone(soundType);
  activeAlarmInterval = setInterval(() => {
    playChimeTone(soundType);
  }, 2500);
}

export function stopWebAlarm() {
  if (activeAlarmInterval) {
    clearInterval(activeAlarmInterval);
    activeAlarmInterval = null;
  }
}

/**
 * Generates an Android Intent URI to trigger the native Clock app alarm
 * Intent: android.intent.action.SET_ALARM
 */
export function getAndroidAlarmIntentUrl(hour: number, minutes: number, label: string = 'Daily Pilot Formation'): string {
  const encodedLabel = encodeURIComponent(label);
  return `intent:#Intent;action=android.intent.action.SET_ALARM;i.android.intent.extra.HOUR=${hour};i.android.intent.extra.MINUTES=${minutes};S.android.intent.extra.MESSAGE=${encodedLabel};B.android.intent.extra.SKIP_UI=true;end`;
}

/**
 * Automatically triggers the Android Alarm Clock intent safely from user gesture
 */
export function triggerAndroidAlarm(hour: number, minutes: number, label: string = 'Daily Pilot Formation'): boolean {
  if (typeof window === 'undefined') return false;

  const intentUrl = getAndroidAlarmIntentUrl(hour, minutes, label);

  // Use an invisible anchor tag with user click to maximize Android intent permission
  const a = document.createElement('a');
  a.href = intentUrl;
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  return true;
}

let activeWakeLock: any = null;

export async function requestWakeLock(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
    try {
      activeWakeLock = await (navigator as any).wakeLock.request('screen');
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export function releaseWakeLock() {
  if (activeWakeLock) {
    try {
      activeWakeLock.release();
    } catch {}
    activeWakeLock = null;
  }
}

/**
 * Checks and requests browser notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

export function sendWebNotification(title: string, body: string, icon?: string) {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: icon || '/favicon.ico',
        requireInteraction: true,
      });
    } catch {}
  }
}
