import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { Clip, Review, Tag } from "@cqf/shared";
import { api } from "../api";
import { StarRating } from "../components/StarRating";
import { TagPicker } from "../components/TagPicker";
import { getYouTubeEmbedUrl, getYouTubeVideoId } from "../lib/youtube";
import { TrashIcon } from "../components/icons";
import { ConfirmDialog } from "../components/ConfirmDialog";

/** Remembers the last reviewer name in this browser so it doesn't need to be retyped for every review. */
const REVIEWER_NAME_KEY = "cqf.reviewerName";

export function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const clipId = Number(id);
  const navigate = useNavigate();

  const [clip, setClip] = useState<Clip | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function refresh() {
    Promise.all([api.getClip(clipId), api.listTags(), api.listReviews(clipId)])
      .then(([c, t, r]) => {
        setClip(c);
        setTags(t);
        setReviews(r);
      })
      .catch((e) => setError(String(e)));
  }

  useEffect(refresh, [clipId]);

  if (error) return <div className="page error">{error}</div>;

  if (!clip) {
    return (
      <div className="page">
        <Link to="/" className="back-link">
          ← All clips
        </Link>
        <div className="skeleton-block" style={{ height: 34, width: "45%", margin: "0.6rem 0 1rem" }} />
        <div className="skeleton-block" style={{ height: 320, margin: "0 0 1.1rem" }} />
        <div className="skeleton-block" style={{ height: 260 }} />
      </div>
    );
  }

  const youTubeId = getYouTubeVideoId(clip.videoUrl);

  async function confirmDeleteClip() {
    setDeleting(true);
    try {
      await api.deleteClip(clip.id);
      navigate("/");
    } catch (err) {
      setError(String(err));
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  return (
    <div className="page">
      <Link to="/" className="back-link">
        ← All clips
      </Link>
      <div className="review-page__header">
        <h1>{clip.title}</h1>
        <button type="button" className="btn-danger" onClick={() => setConfirmingDelete(true)}>
          <TrashIcon size={15} />
          Delete clip
        </button>
      </div>
      <div className="clip-card__meta">
        <span className={`badge badge--${clip.status}`}>{clip.status}</span>
        <span className="badge badge--type">{clip.clipType}</span>
      </div>

      {youTubeId ? (
        <iframe
          className="clip-player clip-player--embed"
          src={getYouTubeEmbedUrl(youTubeId)}
          title={clip.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <video className="clip-player" src={clip.videoUrl} controls preload="metadata" />
      )}

      <ReviewForm clipId={clip.id} tags={tags} onSubmitted={refresh} />

      <h2>Past reviews ({reviews.length})</h2>
      {reviews.length === 0 && <p className="empty">No reviews yet.</p>}
      <ul className="review-list">
        {reviews.map((r) => (
          <li key={r.id} className="review-card">
            <div className="review-card__header">
              <StarRating value={r.rating} />
              <span className="review-card__reviewer">{r.reviewerName ?? "Anonymous"}</span>
              <span className="review-card__date">{new Date(r.createdAt).toLocaleString()}</span>
            </div>
            {r.tags.length > 0 && (
              <div className="tag-pills tag-pills--readonly">
                {r.tags.map((t) => (
                  <span key={t.id} className={`tag-pill tag-pill--${t.sentiment} tag-pill--selected`}>
                    {t.sentiment === "positive" ? "✓ " : "✗ "}
                    {t.label}
                  </span>
                ))}
              </div>
            )}
            {r.comment && <p className="review-card__comment">"{r.comment}"</p>}
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete clip?"
        message={`Delete "${clip.title}"? This also removes its reviews. This can't be undone.`}
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        confirmDisabled={deleting}
        danger
        onConfirm={confirmDeleteClip}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  );
}

function ReviewForm({
  clipId,
  tags,
  onSubmitted,
}: {
  clipId: number;
  tags: Tag[];
  onSubmitted: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [reviewerName, setReviewerName] = useState(() => localStorage.getItem(REVIEWER_NAME_KEY) ?? "");
  const [comment, setComment] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (reviewerName.trim()) localStorage.setItem(REVIEWER_NAME_KEY, reviewerName);
    else localStorage.removeItem(REVIEWER_NAME_KEY);
  }, [reviewerName]);

  function toggleTag(tagId: number) {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      setError("Pick a star rating.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await api.submitReview(clipId, {
        rating,
        reviewerName: reviewerName.trim() || null,
        comment: comment.trim() || null,
        tagIds: [...selectedTagIds],
      });
      setRating(0);
      // Leave reviewerName as-is — it's remembered across reviews (see REVIEWER_NAME_KEY).
      setComment("");
      setSelectedTagIds(new Set());
      onSubmitted();
    } catch (err) {
      setError(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="review-form" onSubmit={handleSubmit}>
      <h2>Evaluate this clip</h2>

      <StarRating value={rating} onChange={setRating} size="lg" />

      <TagPicker tags={tags} selectedIds={selectedTagIds} onToggle={toggleTag} />

      <label>
        Reviewer name (optional)
        <input value={reviewerName} onChange={(e) => setReviewerName(e.target.value)} maxLength={100} />
      </label>

      <label>
        Comment
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="Good clip overall, but the first 3 seconds could be stronger."
        />
      </label>

      {error && <p className="error">{error}</p>}

      <button type="submit" disabled={submitting}>
        {submitting ? "Submitting…" : "Submit evaluation"}
      </button>
    </form>
  );
}
