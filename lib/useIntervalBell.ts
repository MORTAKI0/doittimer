"use client";

import * as React from "react";

import { normalizeFocusIntervalMinutes } from "@/lib/focusInterval";

type UseIntervalBellArgs = {
  enabled: boolean;
  isLeader: boolean;
  intervalMinutes: number;
  title?: string;
  soundSrc?: string;
};

type BellPermission = NotificationPermission | "unsupported";

const SOUND_SRC = "/sounds/focus-chime.wav";

function getPermissionState(): BellPermission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return window.Notification.permission;
}

export function useIntervalBell({
  enabled,
  isLeader,
  intervalMinutes,
  title = "Focus interval",
  soundSrc = SOUND_SRC,
}: UseIntervalBellArgs) {
  const [permissionState, setPermissionState] =
    React.useState<BellPermission>("unsupported");
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const intervalRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const audio = new Audio(soundSrc);
    audio.preload = "auto";
    audioRef.current = audio;

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [soundSrc]);

  const playSound = React.useCallback(async () => {
    if (!audioRef.current) return;
    try {
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
    } catch {
      // Best effort: browsers may block autoplay until user interaction.
    }
  }, []);

  const showNotification = React.useCallback(
    (minutes: number) => {
      if (getPermissionState() !== "granted") return;
      new Notification(title, {
        body: `${minutes} minutes passed - keep going`,
      });
    },
    [title],
  );

  React.useEffect(() => {
    setPermissionState(getPermissionState());
  }, []);

  React.useEffect(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (!enabled || !isLeader) return;

    const normalizedMinutes = normalizeFocusIntervalMinutes(intervalMinutes);
    const intervalMs = normalizedMinutes * 60_000;

    intervalRef.current = window.setInterval(() => {
      void playSound();
      showNotification(normalizedMinutes);
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, intervalMinutes, isLeader, playSound, showNotification]);

  const requestNotificationPermission = React.useCallback(async () => {
    if (getPermissionState() === "unsupported") {
      setPermissionState("unsupported");
      return "unsupported" as const;
    }

    const next = await Notification.requestPermission();
    setPermissionState(next);
    return next;
  }, []);

  const isPermissionGranted = permissionState === "granted";

  return {
    requestNotificationPermission,
    isPermissionGranted,
    permissionState,
    playTestSound: playSound,
  };
}
