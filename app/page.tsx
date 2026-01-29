"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { LineChart } from "../components/LineChart";
import { PieChart } from "../components/PieChart";
import logoNoir from "../assets/image-removebg-preview (1).png";
import logoFooter from "../assets/image-removebg-preview (2).png";

type ChannelStats = {
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

type CameraChannel = {
  id: string;
  name: string;
  zone: string | null;
  features: string[];
  capabilities: unknown;
  stats: ChannelStats;
};

type DeviceInfo = {
  ip: string;
  name: string | null;
  deviceType: string | null;
  zone: string | null;
  updatedAt: string | null;
  channels: CameraChannel[];
};

type DeviceListItem = {
  id: string;
  ip: string;
  name: string | null;
  deviceType: string | null;
  zone: string | null;
  channelsTotal: number;
  parentCameraId: string | null;
  updatedAt: string | null;
};

type CameraListResponse = {
  ok: boolean;
  cameras: DeviceListItem[];
};

type CameraStatsResponse = {
  ok: boolean;
  stats: {
    ip: string;
    lastEventAt: string | null;
    channels: { channelId: string; stats: ChannelStats }[];
  };
};

type CameraDetailResponse = {
  ok: boolean;
  ip: string;
  name: string | null;
  deviceType: string | null;
  zone: string | null;
  updatedAt: string | null;
  channels: {
    id: string;
    name: string;
    zone: string | null;
    features: string[];
    capabilities: unknown;
  }[];
  error?: string;
};

type TimeseriesPoint = {
  t: string;
  peopleIn: number;
  peopleOut: number;
  faces: number;
};

type TimeseriesResponse = {
  ok: boolean;
  series: TimeseriesPoint[];
};

type OverviewResponse = {
  ok: boolean;
  totals: {
    peopleIn: number;
    peopleOut: number;
  };
  gender: {
    male: number;
    female: number;
    unknown: number;
  };
  age: {
    child: number;
    teen: number;
    youngAdult: number;
    middleAge: number;
    senior: number;
    unknown: number;
  };
};

type ZoneListResponse = {
  ok: boolean;
  zones: string[];
};

type ZoneChannel = {
  cameraId: string;
  cameraIp: string;
  cameraName: string | null;
  channelId: string;
  channelName: string;
  zone: string | null;
  features: string[];
  capabilities: unknown;
  stats: ChannelStats;
  ageBuckets: {
    child: number;
    teen: number;
    youngAdult: number;
    middleAge: number;
    senior: number;
    unknown: number;
  };
};

type ZoneChannelsResponse = {
  ok: boolean;
  zone: string;
  channels: ZoneChannel[];
  error?: string;
};

type SessionUser = {
  username: string;
  role: "admin" | "user";
};

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

function normalizeHour(value: string) {
  const date = new Date(value);
  date.setMinutes(0, 0, 0);
  return date.toISOString();
}

export default function Home() {
  const router = useRouter();
  const [deviceList, setDeviceList] = useState<DeviceListItem[]>([]);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [selectedIp, setSelectedIp] = useState<string>("");
  const [series, setSeries] = useState<TimeseriesPoint[]>([]);
  const [seriesHours, setSeriesHours] = useState(24);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [zoneList, setZoneList] = useState<string[]>([]);
  const [selectedZone, setSelectedZone] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState(() =>
    new Date().toLocaleDateString("en-CA")
  );
  const [zoneChannels, setZoneChannels] = useState<ZoneChannel[]>([]);
  const [zoneLoading, setZoneLoading] = useState(false);
  const [zoneError, setZoneError] = useState<string | null>(null);

  const [registerType, setRegisterType] = useState("camera");
  const [registerName, setRegisterName] = useState("");
  const [registerIp, setRegisterIp] = useState("");
  const [registerUser, setRegisterUser] = useState("");
  const [registerPass, setRegisterPass] = useState("");
  const [registerStatus, setRegisterStatus] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerLoading, setRegisterLoading] = useState(false);

  const [channelSaving, setChannelSaving] = useState<Record<string, boolean>>({});
  const [resettingChannels, setResettingChannels] = useState<Record<string, boolean>>({});

  const [session, setSession] = useState<SessionUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const isAdmin = session?.role === "admin";

  const rootDevices = useMemo(
    () => deviceList.filter((device) => !device.parentCameraId),
    [deviceList]
  );

  const selectDevice = (device: DeviceListItem) => {
    setSelectedIp(device.ip);
  };

  const sidebarDevices = useMemo(
    () =>
      rootDevices
        .slice()
        .sort((a, b) => (a.name || a.ip).localeCompare(b.name || b.ip)),
    [rootDevices]
  );

  const summary = useMemo(() => {
    const total = deviceList.length;
    const cameras = deviceList.filter((device) => device.deviceType === "camera").length;
    const aiBoxes = deviceList.filter((device) => device.deviceType === "ai_box").length;
    return { total, cameras, aiBoxes, zones: zoneList.length };
  }, [deviceList, zoneList.length]);

  const channelTotals = useMemo(() => {
    if (!deviceInfo) return null;
    return deviceInfo.channels.reduce(
      (acc, channel) => {
        acc.peopleIn += channel.stats.peopleIn;
        acc.peopleOut += channel.stats.peopleOut;
        acc.faceEvents += channel.stats.faceEvents;
        acc.facesDetected += channel.stats.facesDetected;
        acc.occupancy += Math.max(0, channel.stats.peopleIn - channel.stats.peopleOut);
        return acc;
      },
      { peopleIn: 0, peopleOut: 0, faceEvents: 0, facesDetected: 0, occupancy: 0 }
    );
  }, [deviceInfo]);

  const channelZones = useMemo(() => {
    if (!deviceInfo) return [];
    const zonesSet = new Set<string>();
    for (const channel of deviceInfo.channels) {
      const zone = channel.zone?.trim();
      if (zone) zonesSet.add(zone);
    }
    return Array.from(zonesSet).sort((a, b) => a.localeCompare(b));
  }, [deviceInfo]);

  const zoneTotals = useMemo(() => {
    return zoneChannels.reduce(
      (acc, channel) => {
        acc.peopleIn += channel.stats.peopleIn;
        acc.peopleOut += channel.stats.peopleOut;
        acc.faceEvents += channel.stats.faceEvents;
        acc.facesDetected += channel.stats.facesDetected;
        acc.occupancy += Math.max(0, channel.stats.peopleIn - channel.stats.peopleOut);
        return acc;
      },
      { peopleIn: 0, peopleOut: 0, faceEvents: 0, facesDetected: 0, occupancy: 0 }
    );
  }, [zoneChannels]);

  const zoneDeviceCount = useMemo(() => {
    const ids = new Set(zoneChannels.map((channel) => channel.cameraId));
    return ids.size;
  }, [zoneChannels]);

  const genderPie = useMemo(() => {
    if (!overview) return null;
    return [
      { label: "Male", value: overview.gender.male, color: "var(--accent-2)" },
      { label: "Female", value: overview.gender.female, color: "var(--danger)" },
      { label: "Unknown", value: overview.gender.unknown, color: "var(--accent)" }
    ];
  }, [overview]);

  const agePie = useMemo(() => {
    if (!overview) return null;
    return [
      { label: "Child", value: overview.age.child, color: "var(--accent-2)" },
      { label: "Teen", value: overview.age.teen, color: "var(--signal)" },
      { label: "Young", value: overview.age.youngAdult, color: "var(--accent)" },
      { label: "Middle", value: overview.age.middleAge, color: "#8fa2b9" },
      { label: "Senior", value: overview.age.senior, color: "var(--danger)" },
      { label: "Unknown", value: overview.age.unknown, color: "#c2b7aa" }
    ];
  }, [overview]);

  const timeline = useMemo(() => {
    const now = new Date();
    const hours = Math.max(1, seriesHours);
    const points: string[] = [];
    for (let i = hours - 1; i >= 0; i -= 1) {
      const date = new Date(now.getTime() - i * 60 * 60 * 1000);
      date.setMinutes(0, 0, 0);
      points.push(date.toISOString());
    }
    return points;
  }, [seriesHours]);

  const chartSeries = useMemo(() => {
    const map = new Map<string, TimeseriesPoint>();
    for (const point of series) {
      map.set(normalizeHour(point.t), point);
    }
    const peopleIn = timeline.map((stamp) => map.get(stamp)?.peopleIn ?? 0);
    const peopleOut = timeline.map((stamp) => map.get(stamp)?.peopleOut ?? 0);
    const faces = timeline.map((stamp) => map.get(stamp)?.faces ?? 0);
    return { peopleIn, peopleOut, faces, timestamps: timeline };
  }, [series, timeline]);

  const formatEventTime = (value: string | null) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Riyadh",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  };

  const getAgeBucket = (value: number | null) => {
    if (value === null || Number.isNaN(value)) return "Unknown";
    if (value < 13) return "Child";
    if (value < 20) return "Teen";
    if (value < 40) return "Young adult";
    if (value < 60) return "Middle age";
    return "Senior";
  };

  const formatAvgAge = (value: number | null) => getAgeBucket(value);

  const isFaceDeviceName = (value?: string | null) =>
    typeof value === "string" && /face/i.test(value);

  const isFaceChannel = (
    name: string | null | undefined,
    features: string[],
    capabilities: unknown,
    stats: ChannelStats
  ) => {
    const hasFaceLabel = (value?: string | null) =>
      typeof value === "string" && /(face|fece)/i.test(value);
    const capabilityText =
      typeof capabilities === "string"
        ? capabilities
        : capabilities
          ? JSON.stringify(capabilities)
          : "";
    return (
      hasFaceLabel(name) ||
      features.some(hasFaceLabel) ||
      (capabilityText && /face/i.test(capabilityText)) ||
      stats.faceEvents > 0 ||
      stats.facesDetected > 0
    );
  };

  const genderSlicesFor = (stats: ChannelStats) => [
    { label: "Male", value: stats.gender.male, color: "var(--accent-2)" },
    { label: "Female", value: stats.gender.female, color: "var(--danger)" },
    { label: "Unknown", value: stats.gender.unknown, color: "var(--accent)" }
  ];

  const ageSlicesFor = (avgAge: number | null) => {
    const bucket = getAgeBucket(avgAge);
    const entries = [
      { label: "Child", color: "var(--accent-2)" },
      { label: "Teen", color: "var(--signal)" },
      { label: "Young adult", color: "var(--accent)" },
      { label: "Middle age", color: "#8fa2b9" },
      { label: "Senior", color: "var(--danger)" },
      { label: "Unknown", color: "#c2b7aa" }
    ];
    return entries.map((entry) => ({
      label: entry.label,
      value: entry.label === bucket ? 1 : 0,
      color: entry.color
    }));
  };

  const ageSlicesFromBuckets = (buckets: ZoneChannel["ageBuckets"]) => [
    { label: "Child", value: buckets.child, color: "var(--accent-2)" },
    { label: "Teen", value: buckets.teen, color: "var(--signal)" },
    { label: "Young", value: buckets.youngAdult, color: "var(--accent)" },
    { label: "Middle", value: buckets.middleAge, color: "#8fa2b9" },
    { label: "Senior", value: buckets.senior, color: "var(--danger)" },
    { label: "Unknown", value: buckets.unknown, color: "#c2b7aa" }
  ];

  const flowSlicesFor = (stats: ChannelStats) => {
    const occupancy = Math.max(0, stats.peopleIn - stats.peopleOut);
    return [
      { label: "In", value: stats.peopleIn, color: "var(--accent)" },
      { label: "Out", value: stats.peopleOut, color: "var(--signal)" },
      { label: "Occupancy", value: occupancy, color: "var(--accent-2)" }
    ];
  };

  const loadDeviceList = async () => {
    try {
      const res = await fetch("/api/camera/list");
      const data = (await res.json()) as CameraListResponse;
      if (res.ok && data.ok) {
        setDeviceList(data.cameras);
        if (!selectedIp && data.cameras.length > 0) {
          setSelectedIp(data.cameras[0].ip);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadOverview = async () => {
    try {
      const url = selectedDay
        ? `/api/overview?day=${encodeURIComponent(selectedDay)}`
        : "/api/overview";
      const res = await fetch(url);
      const data = (await res.json()) as OverviewResponse;
      if (res.ok && data.ok) {
        setOverview(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadZoneList = async () => {
    try {
      const res = await fetch("/api/zone/list");
      const data = (await res.json()) as ZoneListResponse;
      if (res.ok && data.ok) {
        setZoneList(data.zones);
        if (!selectedZone && data.zones.length > 0) {
          setSelectedZone(data.zones[0]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadZoneChannels = async (zone: string) => {
    setZoneLoading(true);
    setZoneError(null);
    try {
      const url = selectedDay
        ? `/api/zone/channels?zone=${encodeURIComponent(zone)}&day=${encodeURIComponent(selectedDay)}`
        : `/api/zone/channels?zone=${encodeURIComponent(zone)}`;
      const res = await fetch(url);
      const data = (await res.json()) as ZoneChannelsResponse;
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to load zone channels.");
      }
      setZoneChannels(data.channels);
    } catch (err) {
      setZoneChannels([]);
      setZoneError((err as Error).message ?? "Failed to load zone channels.");
    } finally {
      setZoneLoading(false);
    }
  };

  const loadDeviceContext = async (ip: string) => {
    try {
      const dayParam = selectedDay ? `&day=${encodeURIComponent(selectedDay)}` : "";
      const [detailRes, statsRes, seriesRes] = await Promise.all([
        fetch(`/api/camera/detail?ip=${encodeURIComponent(ip)}`),
        fetch(`/api/camera/stats?ip=${encodeURIComponent(ip)}${dayParam}`),
        fetch(
          `/api/camera/timeseries?ip=${encodeURIComponent(ip)}&hours=${seriesHours}${dayParam}`
        )
      ]);

      const detailData = (await detailRes.json()) as CameraDetailResponse;
      const statsData = (await statsRes.json()) as CameraStatsResponse;
      const seriesData = (await seriesRes.json()) as TimeseriesResponse;

      if (!detailRes.ok || !detailData.ok) {
        throw new Error(detailData.error || "Failed to load device.");
      }

      const statsMap = new Map<string, ChannelStats>();
      if (statsData.ok) {
        for (const entry of statsData.stats.channels) {
          statsMap.set(entry.channelId, entry.stats);
        }
      }

      const channels = detailData.channels.map((channel) => ({
        id: channel.id,
        name: channel.name?.trim() ? channel.name : `Channel ${channel.id}`,
        zone: channel.zone ?? null,
        features: channel.features ?? [],
        capabilities: channel.capabilities ?? null,
        stats: statsMap.get(channel.id) ?? emptyStats()
      }));

      setDeviceInfo({
        ip: detailData.ip,
        name: detailData.name,
        deviceType: detailData.deviceType,
        zone: detailData.zone,
        updatedAt: detailData.updatedAt,
        channels
      });
      if (seriesData.ok) {
        setSeries(seriesData.series);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const saveChannelName = async (channelId: string, name: string) => {
    if (!deviceInfo?.ip || !isAdmin) return;
    const trimmed = name.trim();
    setChannelSaving((prev) => ({ ...prev, [channelId]: true }));
    try {
      const res = await fetch("/api/camera/channel", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ip: deviceInfo.ip,
          channelId,
          name: trimmed
        })
      });
      const data = (await res.json()) as {
        ok: boolean;
        name?: string | null;
        zone?: string | null;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to update channel name");
      }
      setDeviceInfo((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          channels: prev.channels.map((channel) =>
            channel.id === channelId
              ? { ...channel, name: data.name ?? "", zone: data.zone ?? channel.zone ?? null }
              : channel
          )
        };
      });
    } catch (err) {
      console.error(err);
    } finally {
      setChannelSaving((prev) => ({ ...prev, [channelId]: false }));
    }
  };

  const saveChannelZone = async (channelId: string, zone: string) => {
    if (!deviceInfo?.ip || !isAdmin) return;
    const trimmed = zone.trim();
    setChannelSaving((prev) => ({ ...prev, [channelId]: true }));
    try {
      const res = await fetch("/api/camera/channel", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ip: deviceInfo.ip,
          channelId,
          zone: trimmed
        })
      });
      const data = (await res.json()) as {
        ok: boolean;
        name?: string | null;
        zone?: string | null;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to update channel zone");
      }
      setDeviceInfo((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          channels: prev.channels.map((channel) =>
            channel.id === channelId
              ? { ...channel, zone: data.zone ?? null, name: data.name ?? channel.name }
              : channel
          )
        };
      });
    } catch (err) {
      console.error(err);
    } finally {
      setChannelSaving((prev) => ({ ...prev, [channelId]: false }));
    }
  };

  const resetChannelCounters = async (channelId: string) => {
    if (!deviceInfo?.ip || !isAdmin) return;
    setResettingChannels((prev) => ({ ...prev, [channelId]: true }));
    try {
      const res = await fetch("/api/camera/people-count/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip: deviceInfo.ip, channelId })
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Reset failed");
      }
      setDeviceInfo((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          channels: prev.channels.map((channel) =>
            channel.id === channelId
              ? {
                  ...channel,
                  stats: {
                    ...channel.stats,
                    peopleIn: 0,
                    peopleOut: 0,
                    lastEventAt: null
                  }
                }
              : channel
          )
        };
      });
    } catch (err) {
      console.error(err);
    } finally {
      setResettingChannels((prev) => ({ ...prev, [channelId]: false }));
    }
  };

  const handleRegister = async () => {
    setRegisterLoading(true);
    setRegisterError(null);
    setRegisterStatus(null);
    try {
      if (!registerIp.trim() || !registerType) {
        throw new Error("Device IP and type are required.");
      }
      if (registerType === "camera" && (!registerUser || !registerPass)) {
        throw new Error("Camera registration requires username and password.");
      }

      if (registerType === "camera") {
        const res = await fetch("/api/camera/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ip: registerIp.trim(),
            username: registerUser,
            password: registerPass,
            name: registerName,
            deviceType: "camera"
          })
        });
        const data = (await res.json()) as { ok: boolean; error?: string };
        if (!res.ok || !data.ok) {
          throw new Error(data.error || "Camera registration failed");
        }
      } else {
        const res = await fetch("/api/device/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ip: registerIp.trim(),
            name: registerName,
            deviceType: "ai_box",
            username: registerUser,
            password: registerPass
          })
        });
        const data = (await res.json()) as { ok: boolean; error?: string };
        if (!res.ok || !data.ok) {
          throw new Error(data.error || "AI box registration failed");
        }
      }

      await loadDeviceList();
      setSelectedIp(registerIp.trim());
      setRegisterStatus("Device registered successfully.");
    } catch (err) {
      setRegisterError((err as Error).message ?? "Registration failed");
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
    }
  };

  useEffect(() => {
    document.documentElement.dataset.theme = "noir";
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadSession = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.replace("/login");
          return;
        }
        const data = (await res.json()) as { ok: boolean; user: SessionUser };
        if (isMounted && data.ok) {
          setSession(data.user);
        }
      } catch {
        if (isMounted) router.replace("/login");
      } finally {
        if (isMounted) setAuthLoading(false);
      }
    };
    loadSession();
    return () => {
      isMounted = false;
    };
  }, [router]);

  useEffect(() => {
    loadDeviceList();
    loadZoneList();
  }, []);

  useEffect(() => {
    if (!selectedIp) return;
    loadDeviceContext(selectedIp);
  }, [selectedIp, seriesHours, selectedDay]);

  useEffect(() => {
    if (!selectedZone) {
      setZoneChannels([]);
      return;
    }
    loadZoneChannels(selectedZone);
  }, [selectedZone, selectedDay]);

  useEffect(() => {
    loadOverview();
  }, [selectedDay]);

  if (authLoading) {
    return (
      <div className="loading-screen">
        <div className="orb" />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <Image src={logoNoir} alt="EWC" width={120} height={120} />
          <div>
            <div className="brand-title">EWC Command</div>
            <div className="small">AI cameras + analytics</div>
          </div>
        </div>
        <div className="topbar-actions">
          <div className="pill small-pill ghost">
            {session?.username} ({session?.role})
          </div>
          <button className="btn-ghost" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <section className="hero">
        <div className="hero-card">
          <div>
            <span className="eyebrow">Device Overview</span>
            <h1>Registered devices by zone</h1>
            <p className="small">
              Connect AI boxes and cameras, then monitor people flow and occupancy from one view.
            </p>
          </div>
          <div className="hero-stats">
            <div className="stat-chip">
              <span>Total</span>
              <strong>{summary.total}</strong>
            </div>
            <div className="stat-chip">
              <span>Cameras</span>
              <strong>{summary.cameras}</strong>
            </div>
            <div className="stat-chip">
              <span>AI Boxes</span>
              <strong>{summary.aiBoxes}</strong>
            </div>
            <div className="stat-chip">
              <span>Zones</span>
              <strong>{summary.zones}</strong>
            </div>
          </div>
        </div>
        <div className="hero-card">
          <div className="header-min">
            <h3>Register device</h3>
            <span className="pill small-pill ghost">Admin only</span>
          </div>
          <div className="form-grid">
            <label>
              Type
              <select
                value={registerType}
                onChange={(event) => setRegisterType(event.target.value)}
                disabled={!isAdmin}
              >
                <option value="camera">Camera</option>
                <option value="ai_box">AI Box</option>
              </select>
            </label>
            <label>
              Device name
              <input
                value={registerName}
                onChange={(event) => setRegisterName(event.target.value)}
                placeholder="Entrance Cam 01"
                disabled={!isAdmin}
              />
            </label>
            <label>
              IP address
              <input
                value={registerIp}
                onChange={(event) => setRegisterIp(event.target.value)}
                placeholder="192.168.1.45"
                disabled={!isAdmin}
              />
            </label>
            <label>
              Username
              <input
                value={registerUser}
                onChange={(event) => setRegisterUser(event.target.value)}
                placeholder="admin"
                disabled={!isAdmin}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={registerPass}
                onChange={(event) => setRegisterPass(event.target.value)}
                placeholder="••••••••"
                disabled={!isAdmin}
              />
            </label>
          </div>
          <div className="actions">
            <button
              className="btn-primary"
              onClick={handleRegister}
              disabled={registerLoading || !isAdmin}
            >
              {registerLoading ? "Registering..." : "Register device"}
            </button>
            {registerStatus && <span className="pill small-pill">{registerStatus}</span>}
            {registerError && <span className="pill small-pill danger">{registerError}</span>}
          </div>
        </div>
      </section>

      <section className="layout">
        <aside className="panel device-list">
          <div className="header-min">
            <h3>Devices</h3>
            <span className="pill small-pill ghost">{deviceList.length} total</span>
          </div>
          <div className="zone-list">
            <div className="device-cards">
              {sidebarDevices.map((device) => {
                const isActive = device.ip === selectedIp;
                return (
                  <button
                    key={device.id}
                    className={`device-card ${isActive ? "selected" : ""}`}
                    onClick={() => selectDevice(device)}
                  >
                    <div>
                      <div className="camera-name">{device.name || device.ip}</div>
                      <div className="small">{device.ip}</div>
                    </div>
                    <div className="device-meta">
                      <span className="pill small-pill ghost">
                        {device.deviceType === "ai_box" ? "AI Box" : "Camera"}
                      </span>
                      <span className="small">{device.channelsTotal} ch</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <div className="stack">
          {overview && genderPie && agePie && (
            <section className="panel">
              <div className="header-min">
                <h3>All devices stats</h3>
                <div className="actions">
                  <input
                    type="date"
                    value={selectedDay}
                    onChange={(event) => setSelectedDay(event.target.value)}
                  />
                  <button
                    className="pill small-pill ghost"
                    onClick={() => setSelectedDay(new Date().toLocaleDateString("en-CA"))}
                  >
                    Today
                  </button>
                </div>
              </div>
              <div className="device-summary">
                <div className="summary-card">
                  <h4>Total people in</h4>
                  <div className="value">{overview.totals.peopleIn}</div>
                  <span className="small">Across all devices</span>
                </div>
                <div className="summary-card">
                  <h4>Total people out</h4>
                  <div className="value">{overview.totals.peopleOut}</div>
                  <span className="small">Across all devices</span>
                </div>
              </div>
              <div className="pie-grid">
                <PieChart title="Gender mix" subtitle="Attributes" slices={genderPie} />
                <PieChart title="Age range" subtitle="Attributes" slices={agePie} />
              </div>
            </section>
          )}

          <section className="panel">
            <div className="header-min">
              <div>
                <h3>Live device insight</h3>
                <span className="small">
                  {deviceInfo?.name || deviceInfo?.ip || "Select a device"}
                </span>
              </div>
              <div className="actions">
                <button className="pill small-pill ghost" onClick={() => loadDeviceList()}>
                  Refresh list
                </button>
                <button
                  className="pill small-pill ghost"
                  onClick={() => selectedIp && loadDeviceContext(selectedIp)}
                >
                  Refresh stats
                </button>
              </div>
            </div>
            {deviceInfo ? (
              <div className="device-summary">
                <div className="summary-card">
                  <h4>Channel zones</h4>
                  <div className="value">{channelZones.length}</div>
                  <span className="small">
                    {channelZones.length ? channelZones.join(", ") : "No zones assigned"}
                  </span>
                </div>
                <div className="summary-card">
                  <h4>Type</h4>
                  <div className="value">
                    {deviceInfo.deviceType === "ai_box" ? "AI Box" : "Camera"}
                  </div>
                  <span className="small">{deviceInfo.channels.length} channels</span>
                </div>
                {!isFaceDeviceName(deviceInfo.name) && (
                  <>
                    <div className="summary-card">
                      <h4>People in</h4>
                      <div className="value">{channelTotals?.peopleIn ?? 0}</div>
                      <span className="small">Total today</span>
                    </div>
                    <div className="summary-card">
                      <h4>People out</h4>
                      <div className="value">{channelTotals?.peopleOut ?? 0}</div>
                      <span className="small">Total today</span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="empty-state">
                <div className="orb small" />
                <div>
                  <div className="camera-name">No device selected</div>
                  <p className="small">Choose a device from the left panel to load analytics.</p>
                </div>
              </div>
            )}
          </section>

          {!isFaceDeviceName(deviceInfo?.name) && (
            <section className="panel">
              <div className="header-min">
                <h3>Flow timelines</h3>
                <div className="actions">
                  <button
                    className={`pill small-pill ghost ${seriesHours === 24 ? "active" : ""}`}
                    onClick={() => setSeriesHours(24)}
                  >
                    24h
                  </button>
                  <button
                    className={`pill small-pill ghost ${seriesHours === 72 ? "active" : ""}`}
                    onClick={() => setSeriesHours(72)}
                  >
                    3d
                  </button>
                  <button
                    className={`pill small-pill ghost ${seriesHours === 168 ? "active" : ""}`}
                    onClick={() => setSeriesHours(168)}
                  >
                    7d
                  </button>
                </div>
              </div>
              <div className="chart-grid">
                <LineChart
                  title="People flow"
                  subtitle="Entries vs exits"
                  timestamps={chartSeries.timestamps}
                  series={[
                    { label: "In", color: "var(--accent)", data: chartSeries.peopleIn },
                    { label: "Out", color: "var(--signal)", data: chartSeries.peopleOut }
                  ]}
                />
              </div>
            </section>
          )}


          {deviceInfo && (
            <section className="panel">
              <div className="header-min">
                <h3>Channel analytics</h3>
                <span className="pill small-pill ghost">
                  {deviceInfo.channels.length} channels
                </span>
              </div>
              <div className="camera-grid">
                {deviceInfo.channels.map((channel) => {
                  const isFaceDevice = isFaceDeviceName(deviceInfo.name);
                  const isFace = isFaceDevice || isFaceChannel(
                    channel.name,
                    channel.features,
                    channel.capabilities,
                    channel.stats
                  );
                  const hasPeopleCount =
                    !isFaceDevice &&
                    !isFace &&
                    channel.features.some((feature) => feature.toLowerCase().includes("people"));
                  return (
                    <div key={channel.id} className="camera-card">
                      <div className="camera-header">
                        <div>
                          <input
                            className="camera-name-input"
                            value={channel.name ?? ""}
                            placeholder={`Channel ${channel.id}`}
                            disabled={!isAdmin}
                            title={!isAdmin ? "Admin only" : undefined}
                            onChange={(event) => {
                              const nextValue = event.target.value;
                              setDeviceInfo((prev) => {
                                if (!prev) return prev;
                                return {
                                  ...prev,
                                  channels: prev.channels.map((entry) =>
                                    entry.id === channel.id
                                      ? { ...entry, name: nextValue }
                                      : entry
                                  )
                                };
                              });
                            }}
                            onBlur={() => saveChannelName(channel.id, channel.name ?? "")}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.currentTarget.blur();
                              }
                            }}
                          />
                          <div className="small">Channel {channel.id}</div>
                          <input
                            className="camera-name-input channel-zone-input"
                            value={channel.zone ?? ""}
                            placeholder="Zone"
                            disabled={!isAdmin}
                            title={!isAdmin ? "Admin only" : undefined}
                            onChange={(event) => {
                              const nextValue = event.target.value;
                              setDeviceInfo((prev) => {
                                if (!prev) return prev;
                                return {
                                  ...prev,
                                  channels: prev.channels.map((entry) =>
                                    entry.id === channel.id
                                      ? { ...entry, zone: nextValue }
                                      : entry
                                  )
                                };
                              });
                            }}
                            onBlur={() => saveChannelZone(channel.id, channel.zone ?? "")}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.currentTarget.blur();
                              }
                            }}
                          />
                        </div>
                        {isAdmin && hasPeopleCount && (
                          <button
                            className="pill small-pill ghost"
                            onClick={() => resetChannelCounters(channel.id)}
                            disabled={resettingChannels[channel.id]}
                          >
                            {resettingChannels[channel.id] ? "Resetting..." : "Reset count"}
                          </button>
                        )}
                        {channelSaving[channel.id] && (
                          <span className="pill small-pill ghost">Saving</span>
                        )}
                      </div>
                      <div className="mini-grid">
                        {isFace ? (
                          <>
                            <div className="mini">
                              <h5>Gender</h5>
                              <div className="value">
                                M {channel.stats.gender.male} · F {channel.stats.gender.female} · U{" "}
                                {channel.stats.gender.unknown}
                              </div>
                            </div>
                            <div className="mini">
                              <h5>Avg age</h5>
                              <div className="value">{formatAvgAge(channel.stats.age.avg)}</div>
                            </div>
                            <div className="mini">
                              <h5>Glasses</h5>
                              <div className="value">
                                Yes {channel.stats.glasses.yes} · No {channel.stats.glasses.no} · U{" "}
                                {channel.stats.glasses.unknown}
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="mini">
                              <h5>In</h5>
                              <div className="value">{channel.stats.peopleIn}</div>
                            </div>
                            <div className="mini">
                              <h5>Out</h5>
                              <div className="value">{channel.stats.peopleOut}</div>
                            </div>
                            <div className="mini">
                              <h5>Occupancy</h5>
                              <div className="value">
                                {Math.max(0, channel.stats.peopleIn - channel.stats.peopleOut)}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="small">Last event: {formatEventTime(channel.stats.lastEventAt)}</div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className="panel">
            <div className="header-min">
              <div>
                <h3>Zone channels</h3>
                <span className="small">Select a zone to view channels across devices</span>
              </div>
              <div className="actions">
                <select
                  value={selectedZone}
                  onChange={(event) => setSelectedZone(event.target.value)}
                >
                  <option value="">Select zone</option>
                  {zoneList.map((zone) => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
                </select>
                <button
                  className="pill small-pill ghost"
                  onClick={() => selectedZone && loadZoneChannels(selectedZone)}
                  disabled={!selectedZone || zoneLoading}
                >
                  {zoneLoading ? "Loading..." : "Refresh zone"}
                </button>
              </div>
            </div>

            {selectedZone && (
              <>
                <div className="device-summary">
                  <div className="summary-card">
                    <h4>Devices</h4>
                    <div className="value">{zoneDeviceCount}</div>
                    <span className="small">In {selectedZone}</span>
                  </div>
                  <div className="summary-card">
                    <h4>People in</h4>
                    <div className="value">{zoneTotals.peopleIn}</div>
                    <span className="small">All channels</span>
                  </div>
                  <div className="summary-card">
                    <h4>People out</h4>
                    <div className="value">{zoneTotals.peopleOut}</div>
                    <span className="small">All channels</span>
                  </div>
                  <div className="summary-card">
                    <h4>Occupancy</h4>
                    <div className="value">{zoneTotals.occupancy}</div>
                    <span className="small">Net in zone</span>
                  </div>
                </div>
                {zoneError && <div className="pill small-pill danger">{zoneError}</div>}
                <div className="camera-grid">
                  {zoneChannels.map((channel) => {
                    const isFace = isFaceDeviceName(channel.cameraName) || isFaceChannel(
                      channel.channelName,
                      channel.features,
                      channel.capabilities,
                      channel.stats
                    );
                    return (
                      <div key={`${channel.cameraId}-${channel.channelId}`} className="camera-card">
                        <div className="camera-header">
                          <div>
                            <div className="camera-name">{channel.channelName}</div>
                            <div className="small">
                              {channel.cameraName || channel.cameraIp} · Channel {channel.channelId}
                            </div>
                          </div>
                          <span className="pill small-pill ghost">{selectedZone}</span>
                        </div>
                        <div className="pie-grid">
                          {isFace ? (
                            <>
                              <PieChart
                                title="Gender mix"
                                subtitle="Attributes"
                                slices={genderSlicesFor(channel.stats)}
                              />
                              <PieChart
                                title="Age range"
                                subtitle="Attributes"
                                slices={ageSlicesFromBuckets(channel.ageBuckets)}
                              />
                            </>
                          ) : (
                            <PieChart
                              title="People flow"
                              subtitle="In / Out / Occupancy"
                              slices={flowSlicesFor(channel.stats)}
                            />
                          )}
                        </div>
                        <div className="small">
                          Last event: {formatEventTime(channel.stats.lastEventAt)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        </div>
      </section>

      <footer className="footer">
        <span className="small">Powered by</span>
        <Image src={logoFooter} alt="Powered by" width={120} height={50} />
      </footer>
    </div>
  );
}
