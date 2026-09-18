import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CLIP_TYPES, type Clip, type ClipStatus, type ClipType } from "@cqf/shared";
import { api } from "../api";
import { ClipThumbnail } from "../components/ClipThumbnail";
import { TrashIcon } from "../components/icons";
import { Dropdown } from "../components/Dropdown";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { capitalize } from "../lib/format";

type TypeFilter = "all" | ClipType;
type StatusFilter = "all" | ClipStatus;
type SortBy = "newest" | "rating" | "reviews";

const TYPE_FILTER_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All types" },
  ...CLIP_TYPES.map((t) => ({ value: t, label: capitalize(t) })),
];

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "reviewed", label: "Reviewed" },
];

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "rating", label: "Highest rated" },
  { value: "reviews", label: "Most reviewed" },
];

export function ClipsPage() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const [pendingDelete, setPendingDelete] = useState<Clip | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("newest");

  const visibleClips = useMemo(() => {
    let result = clips;
    if (typeFilter !== "all") result = result.filter((c) => c.clipType === typeFilter);
    if (statusFilter !== "all") result = result.filter((c) => c.status === statusFilter);

    result = [...result].sort((a, b) => {
      if (sortBy === "rating") {
        if (a.averageRating === null && b.averageRating === null) return 0;
        if (a.averageRating === null) return 1;
        if (b.averageRating === null) return -1;
        return b.averageRating - a.averageRating;
      }
      if (sortBy === "reviews") return b.reviewCount - a.reviewCount;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [clips, typeFilter, statusFilter, sortBy]);

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
        <div className="filter-bar">
          <div className="field">
            <label htmlFor="filter-type">Type</label>
            <Dropdown id="filter-type" value={typeFilter} onChange={setTypeFilter} options={TYPE_FILTER_OPTIONS} />
          </div>
          <div className="field">
            <label htmlFor="filter-status">Status</label>
            <Dropdown
              id="filter-status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_FILTER_OPTIONS}
            />
          </div>
          <div className="field">
            <label htmlFor="filter-sort">Sort by</label>
            <Dropdown id="filter-sort" value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} />
          </div>
        </div>
      )}

      {!loading && clips.length > 0 && visibleClips.length === 0 && (
        <p className="empty">No clips match these filters.</p>
      )}

      {!loading && visibleClips.length > 0 && (
        <ul className="clip-list">
          {visibleClips.map((clip) => (
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
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
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
    if (mode === "file") setUploadProgress(0);
    try {
      if (mode === "file" && file) {
        await api.createClipFromFile(title, clipType, file, setUploadProgress);
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
      setUploadProgress(null);
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
        <div className="field">
          {/* Deliberately not a <label> wrapping the Dropdown: <button> is a
              "labelable" element, so a wrapping <label> would forward clicks
              on the popup's <li> options to the trigger button (since they
              aren't the button itself), re-toggling it open right after an
              option closes it. Associating via htmlFor/id instead gives the
              same "click text to focus" behavior without that side effect. */}
          <label htmlFor="clip-type-trigger">Type</label>
          <Dropdown
            id="clip-type-trigger"
            value={clipType}
            onChange={setClipType}
            options={CLIP_TYPES.map((t) => ({ value: t, label: capitalize(t) }))}
          />
        </div>
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

      {uploadProgress !== null && (
        <div className="upload-progress">
          <div className="upload-progress__track">
            <div className="upload-progress__fill" style={{ width: `${uploadProgress}%` }} />
          </div>
          <span className="upload-progress__value">{uploadProgress}%</span>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      <button type="submit" disabled={submitting}>
        {submitting ? (mode === "file" ? "Uploading…" : "Adding…") : "Add clip"}
      </button>
    </form>
  );
}
