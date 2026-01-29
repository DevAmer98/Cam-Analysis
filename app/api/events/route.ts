import { onCameraEvent } from "../../../lib/eventBus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: string) => {
        controller.enqueue(encoder.encode(data));
      };

      send("retry: 3000\n\n");

      const unsubscribe = onCameraEvent((event) => {
        send(`data: ${JSON.stringify(event)}\n\n`);
      });

      const heartbeat = setInterval(() => {
        send(": keep-alive\n\n");
      }, 15000);

      (controller as unknown as { _cleanup?: () => void })._cleanup = () => {
        clearInterval(heartbeat);
        unsubscribe();
        controller.close();
      };
    },
    cancel() {
      const cleanup = (this as unknown as { _cleanup?: () => void })._cleanup;
      if (cleanup) cleanup();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
