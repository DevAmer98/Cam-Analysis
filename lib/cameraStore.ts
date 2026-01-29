export type ChannelStats = {
  peopleIn: number;
  peopleOut: number;
  faceEvents: number;
  facesDetected: number;
  gender: {
    male: number;
    female: number;
    unknown: number;
  };
  age: {
    avg: number | null;
  };
  glasses: {
    yes: number;
    no: number;
    unknown: number;
  };
  lastEventAt: string | null;
};

type CameraState = {
  channels: Record<string, ChannelStats>;
  lastEventAt: string | null;
};

const store = new Map<string, CameraState>();

const emptyStats = (): ChannelStats => ({
  peopleIn: 0,
  peopleOut: 0,
  faceEvents: 0,
  facesDetected: 0,
  gender: { male: 0, female: 0, unknown: 0 },
  age: { avg: null },
  glasses: { yes: 0, no: 0, unknown: 0 },
  lastEventAt: null
});

function getCamera(ip: string): CameraState {
  if (!store.has(ip)) {
    store.set(ip, { channels: {}, lastEventAt: null });
  }
  return store.get(ip) as CameraState;
}

export function ensureChannel(ip: string, channelId: string): ChannelStats {
  const camera = getCamera(ip);
  if (!camera.channels[channelId]) {
    camera.channels[channelId] = emptyStats();
  }
  return camera.channels[channelId];
}

export function recordPeopleCount(params: {
  ip: string;
  channelId: string;
  objectIn: number;
  objectOut: number;
  timestamp?: string;
}) {
  const { ip, channelId, objectIn, objectOut, timestamp } = params;
  const stats = ensureChannel(ip, channelId);
  stats.peopleIn += objectIn;
  stats.peopleOut += objectOut;
  stats.lastEventAt = timestamp ?? new Date().toISOString();
  const camera = getCamera(ip);
  camera.lastEventAt = stats.lastEventAt;
}

export function resetPeopleCount(ip: string, channelId: string) {
  const stats = ensureChannel(ip, channelId);
  stats.peopleIn = 0;
  stats.peopleOut = 0;
  stats.lastEventAt = null;
}

export function recordFaceDetection(params: {
  ip: string;
  channelId: string;
  facesDetected: number;
  timestamp?: string;
}) {
  const { ip, channelId, facesDetected, timestamp } = params;
  const stats = ensureChannel(ip, channelId);
  stats.faceEvents += 1;
  stats.facesDetected += facesDetected;
  stats.lastEventAt = timestamp ?? new Date().toISOString();
  const camera = getCamera(ip);
  camera.lastEventAt = stats.lastEventAt;
}

export function getCameraStats(ip: string) {
  const camera = getCamera(ip);
  return {
    ip,
    lastEventAt: camera.lastEventAt,
    channels: Object.entries(camera.channels).map(([channelId, stats]) => ({
      channelId,
      stats
    }))
  };
}
