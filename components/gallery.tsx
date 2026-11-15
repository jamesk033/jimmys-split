"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addLiftImage, captionLiftImage, deleteLiftImage } from "@/app/actions/lift";
import { browserClient, IMAGE_BUCKET } from "@/lib/supabase/client";
import type { LiftImage } from "@/lib/types";
import { IconChevronLeft, IconChevronRight, IconImage, IconTrash, IconX } from "./icons";
import { Button, cx } from "./ui";
import { SaveBadge, useAutosave } from "./use-autosave";

const ACCEPT = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/heic", "image/heif"];

/** Shrink big phone photos before upload so the page stays fast. */
async function prepare(file: File): Promise<Blob> {
  if (file.type === "image/gif") return file;
  try {
    const bmp = await createImageBitmap(file);
    const max = 2560;
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 1_500_000 && file.type !== "image/heic" && file.type !== "image/heif") return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", 0.86));
    return blob ?? file;
  } catch {
    return file;
  }
}

/** Photos on a workout: paste, pick or drop. The first one goes on the workout's share picture. */
export function Gallery({
  userId,
  images: initial,
  sessionId,
  onImages,
  compact,
  label,
}: {
  userId: string;
  images: LiftImage[];
  sessionId: string;
  /** Told whenever the photos change, so the share picture uses the newest one. */
  onImages?: (images: LiftImage[]) => void;
  compact?: boolean;
  label?: string;
}) {
  const router = useRouter();
  const [images, setImages] = useState(initial);
  const [status, setStatus] = useState("");
  const [viewer, setViewer] = useState<number | null>(null);
  const [zoom, setZoom] = useState(false);
  const [armed, setArmed] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const onImagesRef = useRef(onImages);
  onImagesRef.current = onImages;
  useEffect(() => onImagesRef.current?.(images), [images]);

  const syncKey = initial.map((i) => `${i.id}:${i.url ?? ""}`).join("|");
  // Re-sync only when the server sends a different set of images.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setImages(initial), [syncKey]);

  async function upload(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => ACCEPT.includes(f.type) || f.type.startsWith("image/"));
    if (!list.length) {
      setStatus("Pick PNG, JPG, WebP or GIF images.");
      return;
    }
    const sb = browserClient();
    let done = 0;
    for (const f of list) {
      setStatus(`Uploading ${done + 1} of ${list.length}…`);
      const blob = await prepare(f);
      const ext = blob.type === "image/webp" ? "webp" : (f.name.split(".").pop() || "png").toLowerCase();
      const folder = `lift-${sessionId}`;
      const path = `${userId}/${folder}/${crypto.randomUUID()}.${ext}`;
      const { error } = await sb.storage.from(IMAGE_BUCKET).upload(path, blob, { contentType: blob.type || f.type, upsert: false });
      if (error) {
        setStatus(`Upload failed: ${error.message}`);
        return;
      }
      const res = await addLiftImage({ storage_path: path, session_id: sessionId });
      if (!res.ok) {
        setStatus(res.error);
        await sb.storage.from(IMAGE_BUCKET).remove([path]);
        return;
      }
      const { data } = await sb.storage.from(IMAGE_BUCKET).createSignedUrl(path, 3600);
      setImages((prev) => [...prev, { id: res.id!, session_id: sessionId, storage_path: path, caption: "", position: Date.now(), url: data?.signedUrl }]);
      done++;
    }
    setStatus(`${done} photo${done === 1 ? "" : "s"} added.`);
    router.refresh();
  }

  /** Phone and desktop: read an image straight off the clipboard. */
  async function pasteFromClipboard() {
    try {
      const items = await navigator.clipboard.read();
      const files: File[] = [];
      for (const item of items) {
        const type = item.types.find((t) => t.startsWith("image/"));
        if (type) files.push(new File([await item.getType(type)], `pasted.${type.split("/")[1] || "png"}`, { type }));
      }
      if (files.length) await upload(files);
      else setStatus("No image on your clipboard. Copy a photo or screenshot first.");
    } catch {
      setStatus("Your browser blocked reading the clipboard. Press Ctrl+V (or long-press and Paste) instead.");
    }
  }
  const uploadRef = useRef(upload);
  uploadRef.current = upload;

  async function remove(idx: number) {
    if (!armed) {
      setArmed(true);
      setTimeout(() => setArmed(false), 4000);
      return;
    }
    const img = images[idx];
    const res = await deleteLiftImage(img.id);
    if (!res.ok) {
      setStatus(res.error);
      return;
    }
    setImages((prev) => prev.filter((p) => p.id !== img.id));
    setViewer(null);
    setArmed(false);
  }

  useEffect(() => {
    if (viewer === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setViewer(null);
      if (e.key === "ArrowRight") setViewer((v) => (v === null ? v : Math.min(images.length - 1, v + 1)));
      if (e.key === "ArrowLeft") setViewer((v) => (v === null ? v : Math.max(0, v - 1)));
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [viewer, images.length]);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []);
      const target = e.target as HTMLElement | null;
      if (files.length && !(target && (target.tagName === "TEXTAREA" || target.tagName === "INPUT"))) {
        e.preventDefault();
        uploadRef.current(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  const current = viewer !== null ? images[viewer] : null;

  return (
    <div className="grid gap-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          upload(e.dataTransfer.files);
        }}
        className={cx("grid gap-2 rounded-lg border border-dashed p-3", drag ? "border-accent bg-accent/10" : "border-line")}
      >
        <span className="inline-flex flex-wrap items-center gap-2">
          <Button type="button" variant="subtle" onClick={pasteFromClipboard}>
            <IconImage /> Paste photo
          </Button>
          <Button type="button" variant="ghost" onClick={() => input.current?.click()}>
            Pick photo
          </Button>
        </span>
        <span className="text-[13px] text-muted">{label ?? "On your phone, Pick photo opens your camera roll or camera. On a computer, press Ctrl+V or drop an image here."}</span>
        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) upload(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {status && (
        <p className="text-[13px] text-muted" role="status">
          {status}
        </p>
      )}
      {images.length > 0 && (
        <div className={cx("grid gap-3", compact ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4")}>
          {images.map((img, i) => (
            <figure key={img.id} className={cx("min-w-0", compact && i === 0 && "col-span-full")}>
              <button
                type="button"
                onClick={() => setViewer(i)}
                // On a log, the first screenshot shows whole, in its own shape (portrait or landscape), like the share image.
                className={cx("relative block w-full overflow-hidden rounded-lg border border-line bg-panel2", compact && i === 0 ? "min-h-24 cursor-zoom-in rounded-2xl" : "aspect-[16/10]")}
                aria-label={`Open image ${i + 1} full screen`}
              >
                {img.url ? (
                  <img src={img.url} alt={img.caption || `Photo ${i + 1}`} loading="lazy" className={compact && i === 0 ? "mx-auto block h-auto max-h-[80vh] w-auto max-w-full" : "h-full w-full object-cover"} />
                ) : (
                  <span className="text-[12px] text-muted">Unavailable</span>
                )}
                {compact && i === 0 && <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[12px] text-white">Tap to open</span>}
              </button>
              {compact && i === 0 && <p className="mt-1 text-[12px] text-muted">This one goes on your share picture.</p>}
              <Caption id={img.id} initial={img.caption} label={`Caption for image ${i + 1}`} />
            </figure>
          ))}
        </div>
      )}

      {current && viewer !== null && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95" role="dialog" aria-modal="true" aria-label="Image viewer">
          <div className="safe-top flex items-center gap-2 p-2">
            <span className="num px-2 text-[13px] text-muted">
              {viewer + 1} / {images.length}
            </span>
            <span className="min-w-0 flex-1 truncate text-[14px]">{current.caption}</span>
            <button type="button" onClick={() => setZoom((z) => !z)} className="min-h-11 rounded-lg px-3 text-[14px] text-ink">
              {zoom ? "Fit" : "Zoom"}
            </button>
            <button type="button" onClick={() => remove(viewer)} className="flex min-h-11 items-center gap-1 rounded-lg px-3 text-[14px] text-loss">
              <IconTrash /> {armed ? "Tap again" : "Delete"}
            </button>
            <button type="button" onClick={() => setViewer(null)} className="grid h-11 w-11 place-items-center rounded-lg" aria-label="Close">
              <IconX />
            </button>
          </div>
          <div className={cx("relative flex-1", zoom ? "overflow-auto" : "overflow-hidden")} style={{ touchAction: zoom ? "pan-x pan-y pinch-zoom" : "pinch-zoom" }}>
            {current.url && (
              <img
                src={current.url}
                alt={current.caption || "Photo"}
                onClick={() => setZoom((z) => !z)}
                className={cx(zoom ? "max-w-none cursor-zoom-out" : "absolute inset-0 m-auto h-full w-full cursor-zoom-in object-contain")}
                style={zoom ? { width: "250%" } : undefined}
              />
            )}
          </div>
          <div className="safe-bottom flex justify-between p-2">
            <button type="button" disabled={viewer === 0} onClick={() => { setZoom(false); setViewer(viewer - 1); }} className="grid h-12 w-12 place-items-center rounded-full bg-white/10 disabled:opacity-30" aria-label="Previous image">
              <IconChevronLeft />
            </button>
            <button type="button" disabled={viewer === images.length - 1} onClick={() => { setZoom(false); setViewer(viewer + 1); }} className="grid h-12 w-12 place-items-center rounded-full bg-white/10 disabled:opacity-30" aria-label="Next image">
              <IconChevronRight />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Caption({ id, initial, label }: { id: string; initial: string; label: string }) {
  const [v, setV] = useState(initial);
  const auto = useAutosave(v, async (c) => {
    const res = await captionLiftImage(id, c);
    return res.ok ? { ok: true } : { ok: false, error: res.error };
  });
  return (
    <div>
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder="Caption"
        aria-label={label}
        className="mt-1 w-full rounded-md border border-transparent bg-transparent px-1 py-1 text-[13px] text-ink placeholder:text-muted/70 focus:border-line focus:outline-none"
      />
      {auto.state !== "idle" && (
        <div className="px-1">
          <SaveBadge state={auto.state} error={auto.error} />
        </div>
      )}
    </div>
  );
}
