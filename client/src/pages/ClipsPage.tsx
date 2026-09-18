import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CLIP_TYPES, type Clip, type ClipType } from "@cqf/shared";
import { api } from "../api";
import { ClipThumbnail } from "../components/ClipThumbnail";
import { TrashIcon } from "../components/icons";
import { Dropdown } from "../components/Dropdown";
import { ConfirmDialog } from "../components/ConfirmDialog";

export function ClipsPage() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const [pendingDelete, setPendingDelete] = useState<Clip | null>(null);
  const [deleting, setDeleting] = useState(false);

  function refresh() {
    setLoading(true);
    api
      .listClips()
      .then(setClips)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  function showToast(message: string) {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }

  function handleCreated(title: string) {
    refresh();
    showToast(`"${title}" added`);
  }

  function handleDeleteClick(e: React.MouseEvent, clip: Clip) {
    e.preventDefault();
    e.stopPropagation();
    setPendingDelete(clip);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await api.deleteClip(pendingDelete.id);
      setClips((prev) => prev.filter((c) => c.id !== pendingDelete.id));
      showToast(`"${pendingDelete.title}" deleted`);
      setPendingDelete(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="page">
      <h1>Clips</h1>
      <UploadForm onCreated={handleCreated} />

      {error && <p className="error">{error}</p>}

      {loading && (
        <div className="skeleton-grid">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton-card" />
          ))}
        </div>
      )}

      {!loading && clips.length === 0 && <p className="empty">No clips yet — add one above.</p>}

      {!loading && clips.length > 0 && (
        <ul className="clip-list">
          {clips.map((clip) => (
            <li key={clip.id} className="clip-card">
              <Link to={`/clips/${clip.id}`}>
                <ClipThumbnail videoUrl={clip.videoUrl} clipType={clip.clipType} />
                <div className="clip-card__body">
                  <div className="clip-card__title">{clip.title}</div>
                  <div className="clip-card__meta">
                    <span className={`badge badge--${clip.status}`}>{clip.status}</span>
                    <span className="badge badge--type">{clip.clipType}</span>
                  </div>
                  <div className="clip-card__meta">
                    {clip.averageRating !== null ? (
                      <span>★ {clip.averageRating.toFixed(1)} ({clip.reviewCount})</span>
                    ) : (
                      <span>Not yet reviewed</span>
                    )}
                  </div>
                </div>
              </Link>
              <button
                type="button"
                className="clip-card__delete"
                aria-label={`Delete ${clip.title}`}
                title="Delete clip"
                onClick={(e) => handleDeleteClick(e, clip)}
              >
                <TrashIcon />
              </button>
            </li>
          ))}
        </ul>
      )}

      {toast && <div className="toast">{toast}</div>}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete clip?"
        message={
          pendingDelete
            ? `Delete "${pendingDelete.title}"? This also removes its reviews. This can't be undone.`
            : ""
        }
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        confirmDisabled={deleting}
        danger
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

function UploadForm({ onCreated }: { onCreated: (title: string) => void }) {
  const [title, setTitle] = useState("");
  const [clipType, setClipType] = useState<ClipType>("other");
  const [mode, setMode] = useState<"file" | "url">("file");
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "file" && !file) {
      setError("Choose a video file to upload.");
      return;
    }
    if (mode === "url" && !videoUrl.trim()) {
      setError("Enter a video URL.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "file" && file) {
        await api.createClipFromFile(title, clipType, file);
      } else {
        await api.createClipFromUrl(title, clipType, videoUrl.trim());
      }
      const submittedTitle = title;
      setTitle("");
      setVideoUrl("");
      setFile(null);
      onCreated(submittedTitle);
    } catch (err) {
      setError(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <h2>Add a clip</h2>
      <div className="form-row">
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
        </label>
        <label>
          Type
          <Dropdown
            value={clipType}
            onChange={setClipType}
            options={CLIP_TYPES.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
          />
        </label>
      </div>

      <div className="form-row">
        <label className="radio">
          <input type="radio" checked={mode === "file"} onChange={() => setMode("file")} />
          Upload file
        </label>
        <label className="radio">
          <input type="radio" checked={mode === "url"} onChange={() => setMode("url")} />
          Link to URL
        </label>
      </div>

      {mode === "file" ? (
        <input
          type="file"
          accept="video/mp4,video/quicktime,video/webm,video/x-matroska"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      ) : (
        <input
          type="url"
          placeholder="https://…"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
        />
      )}

      {error && <p className="error">{error}</p>}

      <button type="submit" disabled={submitting}>
        {submitting ? "Adding…" : "Add clip"}
      </button>
    </form>
  );
}
