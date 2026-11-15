"use client";
import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/dg/button";

interface Item { name: string; progress: number; error?: string; done?: boolean }

/** Sends files one by one to /api/admin/media with a progress bar each. */
export function MediaUploader({ folders, disabled }: { folders: { id: string; label: string }[]; disabled?: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [folder, setFolder] = useState(folders[0].id);
  const [items, setItems] = useState<Item[]>([]);
  const [over, setOver] = useState(false);
  const busy = items.some((item) => !item.done && !item.error);

  const send = (file: File, index: number) => new Promise<void>((resolve) => {
    const set = (patch: Partial<Item>) => setItems((list) => list.map((item, i) => (i === index ? { ...item, ...patch } : item)));
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/media");
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.setRequestHeader("X-Filename", encodeURIComponent(file.name));
    xhr.setRequestHeader("X-Folder", folder);
    xhr.upload.onprogress = (event) => set({ progress: event.lengthComputable ? Math.round((event.loaded / event.total) * 100) : 0 });
    xhr.onload = () => {
      if (xhr.status === 200) set({ progress: 100, done: true });
      else { let message = "Το ανέβασμα απέτυχε."; try { message = JSON.parse(xhr.responseText).error ?? message; } catch {} set({ error: message }); }
      resolve();
    };
    xhr.onerror = () => { set({ error: "Χάθηκε η σύνδεση. Δοκιμάστε ξανά." }); resolve(); };
    xhr.send(file);
  });

  const start = async (files: FileList | null) => {
    if (!files?.length || busy) return;
    const list = [...files];
    setItems(list.map((file) => ({ name: file.name, progress: 0 })));
    for (let i = 0; i < list.length; i++) await send(list[i], i);
    router.refresh();
  };

  return (
    <div className="ad-upload">
      <div
        className={`ad-drop${over ? " is-over" : ""}`}
        onDragOver={(event) => { event.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => { event.preventDefault(); setOver(false); if (!disabled) start(event.dataTransfer.files); }}
      >
        <UploadCloud size={28} strokeWidth={1.5} aria-hidden="true" />
        <p><strong>Σύρετε εδώ φωτογραφίες ή βίντεο</strong><br />JPG, PNG, WebP, AVIF, MP4, WebM, MOV, έως 500 MB το καθένα.</p>
        <div className="ad-drop__row">
          <div className="ad-field">
            <label htmlFor="up-folder">Φάκελος</label>
            <select id="up-folder" value={folder} onChange={(event) => setFolder(event.target.value)}>{folders.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
          </div>
          <input ref={input} type="file" multiple hidden accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,video/quicktime" onChange={(event) => { start(event.target.files); event.target.value = ""; }} />
          <Button variant="primary" type="button" disabled={disabled || busy} isLoading={busy} onClick={() => input.current?.click()}>Επιλογή αρχείων</Button>
        </div>
      </div>
      {items.length ? (
        <ul className="ad-queue" aria-live="polite">
          {items.map((item, index) => (
            <li key={index}>
              <span>{item.name}</span>
              <span className={item.error ? "ad-tone--bad" : item.done ? "ad-tone--good" : undefined}>{item.error ?? (item.done ? "Ανέβηκε" : `${item.progress}%`)}</span>
              <progress max={100} value={item.error ? 0 : item.progress} aria-label={`Πρόοδος για ${item.name}`} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
