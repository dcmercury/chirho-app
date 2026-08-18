import { useAuth } from "@clerk/expo";
import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

export interface RealtimeGroupMessage {
  messageId: string;
  groupUuid: string;
  userId: string;
  content: string;
  timestamp: string;
  sequenceNumber: number;
  createdAt: string;
  updatedAt: string;
}

interface PrayerUpdate {
  messageId: string;
  count: number;
  userPraying: boolean;
}

interface UseGroupRealtimeOptions {
  groupuuid: string;
  enabled?: boolean;
  onMessage: (message: RealtimeGroupMessage) => void;
  onPrayerUpdate: (update: PrayerUpdate) => void;
}

let socketUrl =
  process.env.EXPO_PUBLIC_SOCKET_URL ||
  "https://dailyoffice-production.up.railway.app";
if (!/^https?:\/\//.test(socketUrl)) socketUrl = `https://${socketUrl}`;

export function useGroupRealtime({
  groupuuid,
  enabled = true,
  onMessage,
  onPrayerUpdate,
}: UseGroupRealtimeOptions) {
  const { userId, getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  const onMessageRef = useRef(onMessage);
  const onPrayerUpdateRef = useRef(onPrayerUpdate);
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    getTokenRef.current = getToken;
    onMessageRef.current = onMessage;
    onPrayerUpdateRef.current = onPrayerUpdate;
  }, [getToken, onMessage, onPrayerUpdate]);

  useEffect(() => {
    if (!enabled || !userId || !groupuuid) return;
    let cancelled = false;

    const connect = async () => {
      const token = await getTokenRef.current().catch(() => null);
      if (cancelled) return;

      const socket = io(socketUrl, {
        path: "/socket.io",
        transports: ["websocket", "polling"],
        auth: { token: token || undefined },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        setConnected(true);
        socket.emit("joinGroup", groupuuid, (success: boolean) => {
          if (!success) setConnected(false);
        });
      });
      socket.on("disconnect", () => setConnected(false));
      socket.on("message", (message: RealtimeGroupMessage) => {
        if (message.groupUuid === groupuuid) onMessageRef.current(message);
      });
      socket.on("prayerUpdate", (update: PrayerUpdate) => {
        onPrayerUpdateRef.current(update);
      });
    };

    void connect();
    return () => {
      cancelled = true;
      setConnected(false);
      if (socketRef.current) {
        socketRef.current.emit("leaveGroup", groupuuid);
        socketRef.current.removeAllListeners();
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [enabled, groupuuid, userId]);

  return { connected };
}
