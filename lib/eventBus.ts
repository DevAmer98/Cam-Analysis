import { EventEmitter } from "events";

type CameraEvent = {
  type: "people-count" | "face-detection";
  ip: string;
  channelId: string;
  timestamp: string;
};

const emitter = new EventEmitter();

export function emitCameraEvent(event: CameraEvent) {
  emitter.emit("camera-event", event);
}

export function onCameraEvent(handler: (event: CameraEvent) => void) {
  emitter.on("camera-event", handler);
  return () => emitter.off("camera-event", handler);
}
