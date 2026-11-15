import { errorResponse, type CodeContext } from "@/lib/server/http";
import { getStore } from "@/lib/store";

const HEARTBEAT_MS = 15_000;

/**
 * Server-sent events carrying only a "something changed" signal. Clients refetch
 * their own authorized snapshot, so no room data or tokens travel in this URL.
 */
export async function GET(request: Request, { params }: CodeContext) {
  try {
    const { code } = await params;
    const store = getStore();
    await store.getPublicRoom(code);

    const encoder = new TextEncoder();
    let cleanup = () => {};

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const send = (chunk: string) => {
          try {
            controller.enqueue(encoder.encode(chunk));
          } catch {
            cleanup();
          }
        };
        send("retry: 2000\n\n: connected\n\n");
        const unsubscribe = store.subscribe(code, () => send("event: change\ndata: 1\n\n"));
        const heartbeat = setInterval(() => send(": ping\n\n"), HEARTBEAT_MS);
        cleanup = () => {
          clearInterval(heartbeat);
          unsubscribe();
          cleanup = () => {};
          try {
            controller.close();
          } catch {
            // already closed
          }
        };
        request.signal.addEventListener("abort", () => cleanup());
      },
      cancel() {
        cleanup();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
