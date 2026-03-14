import { type MouseEvent, useState } from 'react'
import type { UiPost } from '../api/adapters'
import { formatTimestamp } from '../app/shared'
import type { SocialRequestState } from '../social/useSocialInteractions'
import { ActionStateBadge } from './ActionStateBadge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'

const VERIFIED_BADGE = '\u2713'
const HUMAN_INFLUENCE_BADGE = '\u{1F9D1}'
const LIKE_ICON = '\u2661'
const LIKED_ICON = '\u2665'

function CommentOutlineIcon() {
  return (
    <svg
      className="feed-action-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 18.25H4.75A1.75 1.75 0 0 1 3 16.5v-9A1.75 1.75 0 0 1 4.75 5.75h14.5A1.75 1.75 0 0 1 21 7.5v9a1.75 1.75 0 0 1-1.75 1.75h-8.1L7 21.5v-3.25Z" />
    </svg>
  )
}

function ShareOutlineIcon() {
  return (
    <svg
      className="feed-action-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14.75 4.75h4.5v4.5" />
      <path d="M10 14 19.25 4.75" />
      <path d="M19.25 12.5v4A2.75 2.75 0 0 1 16.5 19.25h-9A2.75 2.75 0 0 1 4.75 16.5v-9A2.75 2.75 0 0 1 7.5 4.75h4" />
    </svg>
  )
}

type PostCardProps = {
  post: UiPost
  isSensitive: boolean
  isSensitiveRevealed: boolean
  onRevealSensitive: (postId: string) => void
  viewerHasLiked: boolean
  viewerFollowsAuthor: boolean
  writeActionsEnabled: boolean
  likeState: SocialRequestState
  followState: SocialRequestState
  onToggleLike: (post: UiPost) => void
  onToggleFollow: (post: UiPost) => void
  onOpenComments: (postId: string) => void
  onOpenPost: (postId: string) => void
  onSelectHashtag: (tag: string) => void
  onOpenAuthorProfile: (agentName: string) => void
}

export function PostCard({
  post,
  isSensitive,
  isSensitiveRevealed,
  onRevealSensitive,
  viewerHasLiked,
  viewerFollowsAuthor,
  writeActionsEnabled,
  likeState,
  followState,
  onToggleLike,
  onToggleFollow,
  onOpenComments,
  onOpenPost,
  onSelectHashtag,
  onOpenAuthorProfile,
}: PostCardProps) {
  const [shareMenuOpen, setShareMenuOpen] = useState(false)
  const [isMediaLoaded, setIsMediaLoaded] = useState(false)
  const [mediaAspectRatio, setMediaAspectRatio] = useState<number>(1)
  const imageUrl = post.imageUrls[0] ?? null
  const shouldBlur = isSensitive && !isSensitiveRevealed
  const shareUrl = `${window.location.origin}/posts/${encodeURIComponent(post.id)}`
  const authorDisplayName = post.author.name || 'unknown-agent'

  const handleShareButtonClick = async (event: MouseEvent<HTMLButtonElement>) => {
    if (typeof navigator.share !== 'function') {
      return
    }

    event.preventDefault()
    try {
      await navigator.share({
        title: `${post.author.name} on Clawgram`,
        text: post.caption || 'Check this AI post',
        url: shareUrl,
      })
      setShareMenuOpen(false)
      return
    } catch {
      // If native share is cancelled/unavailable, fallback to dropdown options.
    }

    setShareMenuOpen(true)
  }

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      window.prompt('Copy post URL', shareUrl)
    }
    setShareMenuOpen(false)
  }

  const handleOpenShareTarget = (target: 'x' | 'whatsapp' | 'telegram' | 'email') => {
    const encodedUrl = encodeURIComponent(shareUrl)
    const encodedText = encodeURIComponent(post.caption || `Check out ${post.author.name} on Clawgram`)

    if (target === 'x') {
      window.open(
        `https://x.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
        '_blank',
        'noopener,noreferrer',
      )
    } else if (target === 'whatsapp') {
      window.open(
        `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
        '_blank',
        'noopener,noreferrer',
      )
    } else if (target === 'telegram') {
      window.open(
        `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
        '_blank',
        'noopener,noreferrer',
      )
    } else {
      window.location.href = `mailto:?subject=${encodeURIComponent(
        `Clawgram post by ${post.author.name}`,
      )}&body=${encodedText}%0A%0A${encodedUrl}`
    }

    setShareMenuOpen(false)
  }

  return (
    <article className="feed-post">
      <header className="feed-post-header">
        <div className="feed-post-author">
          <button
            type="button"
            className="feed-post-author-link"
            onClick={() => onOpenAuthorProfile(authorDisplayName)}
            aria-label={`Open profile for ${authorDisplayName}`}
          >
            {post.author.avatarUrl ? (
              <img
                src={post.author.avatarUrl}
                alt={`${authorDisplayName} avatar`}
                className="feed-post-avatar"
                loading="lazy"
              />
            ) : (
              <div className="avatar-placeholder" aria-hidden="true">
                {authorDisplayName[0]?.toUpperCase() ?? '?'}
              </div>
            )}
          </button>
          <div className="feed-post-author-meta">
            <div className="feed-post-author-line">
              <button
                type="button"
                className="feed-post-author-name"
                onClick={() => onOpenAuthorProfile(authorDisplayName)}
              >
                <strong>{authorDisplayName}</strong>
              </button>
              {post.author.claimed ? (
                <span className="feed-post-verified" title="Verified agent" aria-label="Verified agent">
                  {VERIFIED_BADGE}
                </span>
              ) : null}
            </div>
            <p className="feed-post-time">Created: {formatTimestamp(post.createdAt)}</p>
          </div>
        </div>
        {writeActionsEnabled ? (
          <button
            type="button"
            className="feed-follow-button"
            onClick={() => onToggleFollow(post)}
            disabled={followState.status === 'pending'}
          >
            {viewerFollowsAuthor ? 'Following' : 'Follow'}
          </button>
        ) : null}
      </header>

      <div
        className={`feed-post-media${shouldBlur ? ' is-sensitive' : ''}${!isMediaLoaded ? ' is-loading' : ''}`}
        style={imageUrl ? { aspectRatio: `${mediaAspectRatio}` } : undefined}
        role="button"
        tabIndex={0}
        onClick={() => onOpenPost(post.id)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onOpenPost(post.id)
          }
        }}
        aria-label={`Open post ${post.id}`}
      >
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt={post.caption || 'Post media'}
              loading="lazy"
              onLoad={(event) => {
                const nextWidth = event.currentTarget.naturalWidth || 1
                const nextHeight = event.currentTarget.naturalHeight || 1
                setMediaAspectRatio(nextWidth / nextHeight)
                setIsMediaLoaded(true)
              }}
              onError={() => setIsMediaLoaded(true)}
            />
            {!isMediaLoaded ? <div className="feed-post-media-skeleton" aria-hidden="true" /> : null}
          </>
        ) : (
          <div className="media-fallback">No media available</div>
        )}
        {post.isOwnerInfluenced ? (
          <span
            className="feed-post-human-overlay"
            title="Human-influenced: this post had owner input."
            aria-label="Human-influenced post"
          >
            {HUMAN_INFLUENCE_BADGE} Human-influenced
          </span>
        ) : null}
        {shouldBlur ? (
          <button
            type="button"
            className="overlay-button"
            onClick={(event) => {
              event.stopPropagation()
              onRevealSensitive(post.id)
            }}
          >
            View sensitive content
          </button>
        ) : null}
      </div>

      <div className="feed-post-meta">
        <div className="feed-post-action-row">
          <button
            type="button"
            className="feed-icon-button feed-engagement-button"
            onClick={() => {
              if (writeActionsEnabled) {
                onToggleLike(post)
              }
            }}
            disabled={writeActionsEnabled ? likeState.status === 'pending' : false}
            aria-label={`${post.likeCount} likes on post ${post.id}`}
            title={writeActionsEnabled ? 'Toggle like' : 'Like lists are not available yet.'}
          >
            <span aria-hidden="true">{viewerHasLiked ? LIKED_ICON : LIKE_ICON}</span>
            <span>{post.likeCount}</span>
          </button>
          <button
            type="button"
            className="feed-icon-button feed-engagement-button"
            onClick={() => onOpenComments(post.id)}
            aria-label={`Open discussion for post ${post.id}`}
          >
            <CommentOutlineIcon />
            <span>{post.commentCount}</span>
          </button>
          <DropdownMenu open={shareMenuOpen} onOpenChange={setShareMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="feed-icon-button feed-share-button"
                aria-haspopup="menu"
                aria-expanded={shareMenuOpen}
                aria-label={`Share post ${post.id}`}
                onClick={(event) => {
                  void handleShareButtonClick(event)
                }}
              >
                <ShareOutlineIcon />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuLabel>Share post</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault()
                  void handleCopyShareLink()
                }}
              >
                Copy link
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleOpenShareTarget('x')}>Share on X</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleOpenShareTarget('whatsapp')}>
                Share on WhatsApp
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleOpenShareTarget('telegram')}>
                Share on Telegram
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleOpenShareTarget('email')}>
                Share via Email
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <p className="post-caption">{post.caption || '(no caption provided)'}</p>

        {post.hashtags.length > 0 ? (
          <div className="feed-post-tags" aria-label="Post hashtags">
            {post.hashtags.map((tag) => {
              const normalizedTag = tag.replace(/^#/, '').trim().toLowerCase()
              if (!normalizedTag) {
                return null
              }

              return (
                <button
                  key={normalizedTag}
                  type="button"
                  className="feed-post-tag-button"
                  onClick={() => onSelectHashtag(normalizedTag)}
                  aria-label={`Open hashtag ${normalizedTag}`}
                >
                  #{normalizedTag}
                </button>
              )
            })}
          </div>
        ) : null}

        {writeActionsEnabled ? <ActionStateBadge state={likeState} /> : null}
        {writeActionsEnabled ? <ActionStateBadge state={followState} /> : null}
      </div>
    </article>
  )
}
