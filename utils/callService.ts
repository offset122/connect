// utils/callService.ts
import 'react-native-get-random-values'; // MUST be first
import { Platform } from 'react-native';
import type { SupabaseClient } from '@supabase/supabase-js';

/* ---------- SSR-safe uuid ---------- */
const uuidv4 = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

/* ---------- SSR-safe Audio ---------- */
const setAudioMode = async (config: any) => {
  if (Platform.OS === 'web') return;
  try {
    const { Audio } = await import('expo-av');
    await Audio.setAudioModeAsync(config);
  } catch (e) {
    console.warn('setAudioMode error', e);
  }
};

const getAudioPermissions = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return true;
  try {
    const { Audio } = await import('expo-av');
    const perms = await Audio.getPermissionsAsync();
    if (perms.granted) return true;
    const requested = await Audio.requestPermissionsAsync();
    return requested.granted;
  } catch (e) {
    console.warn('getAudioPermissions error', e);
    return false;
  }
};

/* ---------- SSR-safe Haptics ---------- */
const triggerHaptic = async () => {
  if (Platform.OS === 'web') return;
  try {
    const Haptics = await import('expo-haptics');
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch (e) {
    console.warn('triggerHaptic error', e);
  }
};

/* ---------- runtime require wrapper ---------- */
let _RNWebRTC: any = null;
let _webrtcAvailable: boolean | null = null;

function getRNWebRTC(): any {
  if (_RNWebRTC) return _RNWebRTC;
  try {
    _RNWebRTC = require('react-native-webrtc');
    _webrtcAvailable = true;
    return _RNWebRTC;
  } catch (err: any) {
    console.warn('react-native-webrtc not available:', err?.message || err);
    _RNWebRTC = null;
    _webrtcAvailable = false;
    return null;
  }
}

export function isWebRTCAvailable(): boolean {
  if (_webrtcAvailable === null) getRNWebRTC();
  return _webrtcAvailable === true;
}

/* ---------- Types ---------- */
export type CallType = 'voice' | 'video';
export type SignalType = 'offer' | 'answer' | 'ice' | 'control';

export interface CallState {
  callId: string | null;
  callType: CallType | null;
  isInitiator: boolean;
  remoteUserId: string | null;
  isRinging: boolean;
  isConnected: boolean;
  callStartTime: Date | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  roomUrl?: string | null;
}

/* ---------- CallService Class ---------- */
class CallServiceClass {
  private supabase: SupabaseClient | null = null;
  private currentUserId: string | null = null;

  private pc: any = null;
  private localStream: any = null;
  private remoteStream: any = null;

  private state: CallState = {
    callId: null,
    callType: null,
    isInitiator: false,
    remoteUserId: null,
    isRinging: false,
    isConnected: false,
    callStartTime: null,
    localStream: null,
    remoteStream: null,
  };

  private onStateChange?: (s: Partial<CallState>) => void;
  private onIncomingCall?: (meta: { callId: string; from: string; callType: CallType }) => void;
  private signalsChannel: any = null;

  private iceServers: Array<any> = [
    { urls: 'stun:stun.l.google.com:19302' },
  ];

  /* ---------- Initialization ---------- */

  init(
    supabaseClient: SupabaseClient,
    currentUserId: string,
    opts?: {
      onStateChange?: (s: Partial<CallState>) => void;
      onIncomingCall?: (meta: { callId: string; from: string; callType: CallType }) => void;
    }
  ) {
    console.log('[CallService] Initializing with userId:', currentUserId);
    this.supabase = supabaseClient;
    this.currentUserId = currentUserId;
    if (opts?.onStateChange) this.onStateChange = opts.onStateChange;
    if (opts?.onIncomingCall) this.onIncomingCall = opts.onIncomingCall;
    this.subscribeToSignals();
  }

  /* ---------- Supabase signalling ---------- */

  private subscribeToSignals() {
    if (!this.supabase || !this.currentUserId) return;

    try { this.signalsChannel?.unsubscribe?.(); } catch (e) {}

    const channel = this.supabase.channel(`public:call_signals:receiver=${this.currentUserId}`);

    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'call_signals',
        filter: `receiver_id=eq.${this.currentUserId}`,
      },
      (payload: any) => {
        const signal = payload.new;
        if (signal.sender_id === this.currentUserId) return;
        this.handleRemoteSignal(signal).catch((e) => console.warn('handleRemoteSignal error', e));
      }
    );

    channel.subscribe((status: any) => {
      console.log('[CallService] Channel status:', status);
    });

    this.signalsChannel = channel;
  }

  private async sendSignal(
    callId: string,
    senderId: string,
    receiverId: string,
    type: SignalType,
    data: any
  ) {
    if (!this.supabase) throw new Error('Supabase client not initialized');
    const result = await this.supabase.from('call_signals').insert({
      call_id: callId,
      sender_id: senderId,
      receiver_id: receiverId,
      type,
      data,
    });
    console.log('[CallService] Signal sent:', type, result);
  }

  /* ---------- Call lifecycle (caller) ---------- */

  async startCall(remoteUserId: string, callType: CallType = 'voice'): Promise<string> {
    if (!this.supabase || !this.currentUserId) throw new Error('CallService not initialized');

    const callId = uuidv4();
    const { error: insertErr } = await this.supabase.from('calls').insert({
      id: callId,
      caller_id: this.currentUserId,
      receiver_id: remoteUserId,
      call_type: callType,
      status: 'calling',
    });
    if (insertErr) throw insertErr;

    this.state = {
      ...this.state,
      callId,
      isInitiator: true,
      callType,
      remoteUserId,
      isRinging: true,
      isConnected: false,
      callStartTime: null,
    };
    this.emitState();

    const roomUrl = 'https://hannasconnect.daily.co/hannasconnect';
    await this.sendSignal(callId, this.currentUserId, remoteUserId, 'offer', { roomUrl, callType });
    await this.createCallHistoryMessage(callId, this.currentUserId, remoteUserId, callType, 'outgoing', 'ringing');

    this.state.isConnected = true;
    this.state.isRinging = false;
    this.state.callStartTime = new Date();
    this.state.roomUrl = roomUrl;
    this.emitState();

    return callId;
  }

  /* ---------- Call lifecycle (callee) ---------- */

  async acceptCall(callId: string): Promise<void> {
    if (!this.supabase || !this.currentUserId) throw new Error('CallService not initialized');

    const { data, error } = await this.supabase.from('calls').select('*').eq('id', callId).single();
    if (error || !data) throw new Error('Call not found');

    const callerId = data.caller_id as string;
    const callType = (data.call_type as CallType) || 'voice';

    await this.supabase.from('calls').update({ status: 'accepted' }).eq('id', callId);
    await this.createCallHistoryMessage(callId, this.currentUserId, callerId, callType, 'incoming', 'accepted');

    this.state = {
      ...this.state,
      callId,
      isInitiator: false,
      callType,
      remoteUserId: callerId,
      isRinging: false,
      isConnected: true,
      callStartTime: new Date(),
    };
    this.emitState();
  }

  /* ---------- Local media ---------- */

  private async prepareLocalStream(callType: CallType) {
    if (!isWebRTCAvailable()) throw new Error('WebRTC not available in this environment.');

    const rn = getRNWebRTC();
    if (!rn?.mediaDevices) throw new Error('react-native-webrtc not installed or available');

    const ok = await getAudioPermissions();
    if (!ok) throw new Error('Audio permission denied');

    await setAudioMode({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    const constraints: any = callType === 'video' ? { audio: true, video: true } : { audio: true };
    const stream = await rn.mediaDevices.getUserMedia(constraints);
    this.localStream = stream;
    this.state.localStream = stream;
    this.emitState();
  }

  /* ---------- PeerConnection ---------- */

  private async createPeerConnection(callId: string, otherUserId: string) {
    const rn = getRNWebRTC();
    if (!rn?.RTCPeerConnection) throw new Error('RTCPeerConnection not available');

    this.cleanupPeerConnection();

    this.pc = new rn.RTCPeerConnection({ iceServers: this.iceServers });

    if (this.localStream?.getTracks) {
      this.localStream.getTracks().forEach((track: any) => {
        try { this.pc.addTrack(track, this.localStream); } catch (e) {}
      });
    }

    this.pc.ontrack = (event: any) => {
      this.remoteStream = event.streams?.[0] ?? null;
      this.state.remoteStream = this.remoteStream;
      this.emitState();
    };

    this.pc.onicecandidate = async (ev: any) => {
      if (ev?.candidate) {
        try {
          await this.sendSignal(callId, this.currentUserId!, otherUserId, 'ice', { candidate: ev.candidate });
        } catch (e) {
          console.warn('Failed to send ICE candidate', e);
        }
      }
    };

    this.pc.onconnectionstatechange = () => {
      const st = this.pc.connectionState;
      if (st === 'connected') {
        this.state.isConnected = true;
        this.state.isRinging = false;
        this.state.callStartTime = new Date();
        this.emitState();
        triggerHaptic();
      } else if (st === 'disconnected' || st === 'failed' || st === 'closed') {
        this.endCall(true).catch(() => {});
      }
    };
  }

  /* ---------- Handle incoming signals ---------- */

  private async handleRemoteSignal(signalRow: any) {
    try {
      const { call_id: callId, sender_id: senderId, type, data } = signalRow;

      switch (type) {
        case 'offer': {
          if (!this.state.callId) {
            this.state = {
              ...this.state,
              callId,
              isInitiator: false,
              remoteUserId: senderId,
              isRinging: true,
              callType: (data?.callType as CallType) || 'voice',
              roomUrl: data?.roomUrl,
            };
            this.emitState();
            this.onIncomingCall?.({
              callId,
              from: senderId,
              callType: (data?.callType as CallType) || 'voice',
            });
            this.createCallNotification(
              senderId,
              this.currentUserId!,
              (data?.callType as CallType) || 'voice',
              'incoming_call',
              `Incoming ${data?.callType || 'voice'} call`
            );
          } else if (this.state.callId === callId && data?.roomUrl) {
            this.state.roomUrl = data.roomUrl;
            this.state.isConnected = true;
            this.state.isRinging = false;
            this.state.callStartTime = new Date();
            this.emitState();
          }
          break;
        }

        case 'answer': {
          if (!this.pc) return;
          const rn = getRNWebRTC();
          const RTCSessionDescription = rn?.RTCSessionDescription || ((s: any) => s);
          await this.pc.setRemoteDescription(
            new RTCSessionDescription({ type: data.type || 'answer', sdp: data.sdp })
          );
          break;
        }

        case 'ice': {
          if (!this.pc) return;
          const rn = getRNWebRTC();
          const RTCIceCandidate = rn?.RTCIceCandidate || ((c: any) => c);
          try {
            await this.pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (e) {
            console.warn('addIceCandidate failed', e);
          }
          break;
        }

        case 'control': {
          const action = data?.action;
          if (action === 'hangup' || action === 'decline') {
            if (this.state.isRinging && action === 'hangup') {
              await this.createCallHistoryMessage(
                callId,
                this.currentUserId!,
                senderId,
                this.state.callType || 'voice',
                'incoming',
                'missed'
              );
            }
            await this.endCall(true);
          } else if (action === 'accept') {
            this.state.isRinging = false;
            this.emitState();
          }
          break;
        }
      }
    } catch (e) {
      console.error('handleRemoteSignal error', e);
    }
  }

  /* ---------- End call ---------- */

  async endCall(dontSignal = false) {
    try {
      const callId = this.state.callId;
      const other = this.state.remoteUserId;

      if (!dontSignal && callId && other && this.currentUserId && this.supabase) {
        await this.sendSignal(callId, this.currentUserId, other, 'control', { action: 'hangup' });
        await this.supabase.from('calls').update({ status: 'ended' }).eq('id', callId);
      }

      if (callId && this.currentUserId && other && this.state.callType) {
        const duration = this.state.callStartTime
          ? Math.floor((new Date().getTime() - this.state.callStartTime.getTime()) / 1000)
          : undefined;
        await this.createCallHistoryMessage(
          callId,
          this.currentUserId,
          other,
          this.state.callType,
          this.state.isInitiator ? 'outgoing' : 'incoming',
          'ended',
          duration
        );
      }
    } catch (e) {
      console.warn('endCall signalling error', e);
    } finally {
      this.cleanupPeerConnection();
      try {
        this.localStream?.getTracks?.().forEach((t: any) => { try { t.stop(); } catch (e) {} });
      } catch (e) {}
      try {
        this.remoteStream?.getTracks?.().forEach((t: any) => { try { t.stop(); } catch (e) {} });
      } catch (e) {}

      this.localStream = null;
      this.remoteStream = null;
      this.state = {
        callId: null,
        callType: null,
        isInitiator: false,
        remoteUserId: null,
        isRinging: false,
        isConnected: false,
        callStartTime: null,
        localStream: null,
        remoteStream: null,
      };
      this.emitState();
    }
  }

  private cleanupPeerConnection() {
    try {
      if (this.pc) {
        try { this.pc.onicecandidate = null; } catch (e) {}
        try { this.pc.ontrack = null; } catch (e) {}
        try { this.pc.onconnectionstatechange = null; } catch (e) {}
        try { this.pc.close?.(); } catch (e) {}
      }
    } catch (e) {}
    this.pc = null;
  }

  /* ---------- Controls ---------- */

  async toggleMute(muted: boolean) {
    try {
      this.localStream?.getAudioTracks().forEach((t: any) => (t.enabled = !muted));
    } catch (e) {
      console.warn('toggleMute error', e);
    }
  }

  async toggleSpeaker(speakerOn: boolean) {
    await setAudioMode({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: !speakerOn,
    });
  }

  async switchCamera() {
    try {
      const rn = getRNWebRTC();
      if (!rn || !this.localStream) return;

      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack?._switchCamera) {
        videoTrack._switchCamera();
        return;
      }

      const newStream = await rn.mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode: 'environment' },
      });

      const sender = this.pc?.getSenders?.().find((s: any) => s.track?.kind === 'video');
      const newTrack = newStream.getVideoTracks()[0];

      if (sender?.replaceTrack) {
        await sender.replaceTrack(newTrack);
      } else {
        this.pc?.addTrack(newTrack, newStream);
      }

      try { this.localStream.getVideoTracks().forEach((t: any) => t.stop()); } catch (e) {}
      this.localStream = newStream;
      this.state.localStream = this.localStream;
      this.emitState();
    } catch (e) {
      console.warn('switchCamera error', e);
      throw e;
    }
  }

  /* ---------- Getters / setters ---------- */

  getState() { return this.state; }

  setOnStateChange(cb: (s: Partial<CallState>) => void) { this.onStateChange = cb; }

  setOnIncomingCall(cb: (meta: { callId: string; from: string; callType: CallType }) => void) {
    this.onIncomingCall = cb;
  }

  private emitState() {
    try { this.onStateChange?.({ ...this.state }); } catch (e) {}
  }

  /* ---------- Call History ---------- */

  private async createCallHistoryMessage(
    callId: string,
    senderId: string,
    receiverId: string,
    callType: CallType,
    direction: 'incoming' | 'outgoing',
    status: 'ringing' | 'accepted' | 'rejected' | 'missed' | 'ended',
    duration?: number
  ) {
    if (!this.supabase) return;
    try {
      const content = `[Call:${JSON.stringify({ call_id: callId, call_type: callType, direction, status, duration: duration || null })}]`;
      await this.supabase.from('messages').insert({
        sender_id: senderId,
        receiver_id: receiverId,
        content,
        status: 'sent',
        is_deleted: false,
      });
      if (status === 'missed') {
        await this.createCallNotification(senderId, receiverId, callType, 'missed_call', `Missed ${callType} call`);
      }
    } catch (error) {
      console.warn('[CallService] Failed to create call history message:', error);
    }
  }

  private async createCallNotification(
    fromUserId: string,
    toUserId: string,
    callType: CallType,
    notificationType: string,
    title: string
  ) {
    if (!this.supabase) return;
    try {
      const { data: callerData } = await this.supabase
        .from('users')
        .select('first_name')
        .eq('id', fromUserId)
        .single();

      await this.supabase.from('notifications').insert({
        user_id: toUserId,
        title,
        body: `From ${callerData?.first_name || 'Someone'}`,
        notification_type: notificationType,
        type: notificationType,
        related_user_id: fromUserId,
        read: false,
      });
    } catch (error) {
      console.warn('[CallService] Failed to create call notification:', error);
    }
  }

  /* ---------- Destroy ---------- */

  async destroy() {
    try { await this.endCall(true); } catch (e) {}
    try { this.signalsChannel?.unsubscribe?.(); } catch (e) {}
    this.supabase = null;
    this.currentUserId = null;
    this.onStateChange = undefined;
    this.onIncomingCall = undefined;
  }
}

/* ---------- Utilities ---------- */

export function formatCallDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/* ---------- Singleton ---------- */
export const callService = new CallServiceClass();
export default callService;