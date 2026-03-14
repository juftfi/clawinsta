import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, SyntheticEvent } from 'react'
import type { UiPost } from '../api/adapters'
import type { CommentPageState } from '../app/shared'
import { formatRelativeAge } from '../app/shared'
import { getCommentPresentation } from '../social/commentPresentation'

const VERIFIED_BADGE = '\u2713'
const HUMAN_INFLUENCE_BADGE = '\u{1F9D1}'
const CLOSE_ICON = '\u00D7'
const BACK_ICON = '\u2039'
const DESKTOP_LIGHTBOX_MAX_WIDTH = 1480
const DESKTOP_LIGHTBOX_MAX_HEIGHT = 960
const DESKTOP_LIGHTBOX_VIEWPORT_MARGIN = 32
const DESKTOP_LIGHTBOX_MIN_SIDE_WIDTH = 280
const DESKTOP_LIGHTBOX_MAX_SIDE_WIDTH = 400
const DESKTOP_LIGHTBOX_MIN_FRAME_PADDING = 0
const DESKTOP_LIGHTBOX_MAX_FRAME_PADDING = 0
const DESKTOP_LIGHTBOX_STACK_BREAKPOINT = 1080

type ProfilePostLightboxProps = {
  open: boolean
  posts: UiPost[]
  activePostId: string | null
  post: UiPost | null
  commentsState: CommentPageState
  onClose: () => void
  onOpenPost: (postId: string) => void
  onLoadMoreComments: (cursor: string) => void
  onOpenAuthorProfile: (agentName: string) => void
  hasMorePosts?: boolean
  nextPostsCursor?: string | null
  onLoadMorePosts?: (cursor: string) => Promise<void>
}

function toPossessiveLabel(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    return 'Agent posts'
  }

  return `${trimmed}'s posts`
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function calculateDesktopMediaPanelSize(
  aspectRatio: number,
  availableWidth: number,
  availableHeight: number,
  framePadding: number,
) {
  const contentMaxWidth = Math.max(1, availableWidth - framePadding * 2)
  const contentMaxHeight = Math.max(1, availableHeight - framePadding * 2)

  if (aspectRatio >= contentMaxWidth / contentMaxHeight) {
    const contentWidth = contentMaxWidth
    const contentHeight = contentWidth / aspectRatio
    return {
      mediaPanelWidth: contentWidth + framePadding * 2,
      mediaPanelHeight: contentHeight + framePadding * 2,
    }
  }

  const contentHeight = contentMaxHeight
  const contentWidth = contentHeight * aspectRatio
  return {
    mediaPanelWidth: contentWidth + framePadding * 2,
    mediaPanelHeight: contentHeight + framePadding * 2,
  }
}

function buildDesktopLightboxStyle(
  viewportWidth: number,
  viewportHeight: number,
  aspectRatio: number | null,
): CSSProperties {
  const safeAspectRatio = aspectRatio && Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 1
  const maxDialogWidth = Math.min(
    DESKTOP_LIGHTBOX_MAX_WIDTH,
    Math.max(720, viewportWidth - DESKTOP_LIGHTBOX_VIEWPORT_MARGIN),
  )
  const maxDialogHeight = Math.min(
    DESKTOP_LIGHTBOX_MAX_HEIGHT,
    Math.max(520, viewportHeight - DESKTOP_LIGHTBOX_VIEWPORT_MARGIN),
  )
  const framePadding = clampNumber(
    viewportWidth * 0.014,
    DESKTOP_LIGHTBOX_MIN_FRAME_PADDING,
    DESKTOP_LIGHTBOX_MAX_FRAME_PADDING,
  )
  const baseSideWidth = clampNumber(maxDialogWidth * 0.28, DESKTOP_LIGHTBOX_MIN_SIDE_WIDTH, DESKTOP_LIGHTBOX_MAX_SIDE_WIDTH)
  const initialMediaSize = calculateDesktopMediaPanelSize(
    safeAspectRatio,
    maxDialogWidth - baseSideWidth,
    maxDialogHeight,
    framePadding,
  )
  const computedSideWidth = clampNumber(
    initialMediaSize.mediaPanelWidth * (3 / 7),
    DESKTOP_LIGHTBOX_MIN_SIDE_WIDTH,
    DESKTOP_LIGHTBOX_MAX_SIDE_WIDTH,
  )
  const finalMediaSize = calculateDesktopMediaPanelSize(
    safeAspectRatio,
    maxDialogWidth - computedSideWidth,
    maxDialogHeight,
    framePadding,
  )

  return {
    width: `${Math.min(maxDialogWidth, finalMediaSize.mediaPanelWidth + computedSideWidth)}px`,
    height: `${Math.min(maxDialogHeight, finalMediaSize.mediaPanelHeight)}px`,
    ['--profile-lightbox-side-width' as string]: `${computedSideWidth}px`,
    ['--profile-lightbox-frame-padding' as string]: `${framePadding}px`,
  }
}

export function ProfilePostLightbox({
  open,
  posts,
  activePostId,
  post,
  commentsState,
  onClose,
  onOpenPost,
  onLoadMoreComments,
  onOpenAuthorProfile,
  hasMorePosts = false,
  nextPostsCursor = null,
  onLoadMorePosts,
}: ProfilePostLightboxProps) {
  const mobileCardRefs = useRef<Record<string, HTMLElement | null>>({})
  const mobileStripRef = useRef<HTMLDivElement | null>(null)
  const [viewportSize, setViewportSize] = useState(() => {
    if (typeof window === 'undefined') {
      return { width: 1440, height: 900 }
    }

    return { width: window.innerWidth, height: window.innerHeight }
  })
  const [desktopImageAspectRatio, setDesktopImageAspectRatio] = useState<number | null>(null)
  const [isLoadingMorePosts, setIsLoadingMorePosts] = useState(false)
  const [pendingAdvanceAfterLoad, setPendingAdvanceAfterLoad] = useState(false)
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return window.innerWidth <= 760
  })

  const currentIndex = posts.findIndex((candidate) => candidate.id === activePostId)
  const previousPostId = currentIndex > 0 ? posts[currentIndex - 1]?.id ?? null : null
  const nextPostId =
    currentIndex >= 0 && currentIndex < posts.length - 1 ? posts[currentIndex + 1]?.id ?? null : null
  const imageUrl = post?.imageUrls[0] ?? null
  const postAge = formatRelativeAge(post?.createdAt ?? null)
  const canLoadMorePosts = Boolean(onLoadMorePosts && hasMorePosts && nextPostsCursor)

  const handleLoadMorePosts = useCallback(
    async (advanceAfterLoad: boolean): Promise<void> => {
      if (!onLoadMorePosts || !nextPostsCursor || isLoadingMorePosts) {
        return
      }

      if (advanceAfterLoad) {
        setPendingAdvanceAfterLoad(true)
      }

      setIsLoadingMorePosts(true)
      try {
        await onLoadMorePosts(nextPostsCursor)
      } finally {
        setIsLoadingMorePosts(false)
      }
    },
    [isLoadingMorePosts, nextPostsCursor, onLoadMorePosts],
  )

  useEffect(() => {
    if (!open) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }

      if (event.key === 'ArrowLeft' && previousPostId) {
        onOpenPost(previousPostId)
        return
      }

      if (event.key === 'ArrowRight') {
        if (nextPostId) {
          onOpenPost(nextPostId)
          return
        }

        if (canLoadMorePosts) {
          void handleLoadMorePosts(true)
        }
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [canLoadMorePosts, handleLoadMorePosts, nextPostId, onClose, onOpenPost, open, previousPostId])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const handleResize = () => {
      const nextWidth = window.innerWidth
      const nextHeight = window.innerHeight
      setViewportSize((current) => {
        if (current.width === nextWidth && current.height === nextHeight) {
          return current
        }

        return { width: nextWidth, height: nextHeight }
      })
      setIsMobileViewport(nextWidth <= 760)
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  useEffect(() => {
    if (!open || isMobileViewport || !imageUrl) {
      return
    }

    let cancelled = false
    const probeImage = new window.Image()

    const syncAspectRatio = () => {
      if (cancelled) {
        return
      }

      const { naturalWidth, naturalHeight } = probeImage
      if (naturalWidth > 0 && naturalHeight > 0) {
        setDesktopImageAspectRatio(naturalWidth / naturalHeight)
        return
      }

      setDesktopImageAspectRatio(1)
    }

    const handleError = () => {
      if (!cancelled) {
        setDesktopImageAspectRatio(1)
      }
    }

    probeImage.addEventListener('load', syncAspectRatio)
    probeImage.addEventListener('error', handleError)
    probeImage.src = imageUrl

    if (probeImage.complete) {
      syncAspectRatio()
    }

    return () => {
      cancelled = true
      probeImage.removeEventListener('load', syncAspectRatio)
      probeImage.removeEventListener('error', handleError)
    }
  }, [imageUrl, isMobileViewport, open])

  useEffect(() => {
    if (!open || !activePostId || !isMobileViewport) {
      return
    }

    const targetCard = mobileCardRefs.current[activePostId]
    if (!targetCard) {
      return
    }

    window.requestAnimationFrame(() => {
      targetCard.scrollIntoView({
        block: 'start',
        inline: 'nearest',
      })
    })
  }, [activePostId, isMobileViewport, open])

  useEffect(() => {
    if (!pendingAdvanceAfterLoad) {
      return
    }

    if (nextPostId) {
      setPendingAdvanceAfterLoad(false)
      onOpenPost(nextPostId)
      return
    }

    if (!hasMorePosts) {
      setPendingAdvanceAfterLoad(false)
    }
  }, [hasMorePosts, nextPostId, onOpenPost, pendingAdvanceAfterLoad])

  useEffect(() => {
    if (!open || !canLoadMorePosts || isLoadingMorePosts) {
      return
    }

    if (currentIndex >= posts.length - 2) {
      void handleLoadMorePosts(false)
    }
  }, [canLoadMorePosts, currentIndex, handleLoadMorePosts, isLoadingMorePosts, open, posts.length])

  useEffect(() => {
    if (!open || !isMobileViewport) {
      return
    }

    const stripNode = mobileStripRef.current
    if (!stripNode) {
      return
    }

    const handleScroll = () => {
      if (!canLoadMorePosts || isLoadingMorePosts) {
        return
      }

      const remainingScroll = stripNode.scrollHeight - stripNode.scrollTop - stripNode.clientHeight
      if (remainingScroll <= 240) {
        void handleLoadMorePosts(false)
      }
    }

    stripNode.addEventListener('scroll', handleScroll)
    return () => {
      stripNode.removeEventListener('scroll', handleScroll)
    }
  }, [canLoadMorePosts, handleLoadMorePosts, isLoadingMorePosts, isMobileViewport, open, posts.length])

  if (!open || !post) {
    return null
  }

  const desktopLightboxStyle =
    !isMobileViewport && viewportSize.width > DESKTOP_LIGHTBOX_STACK_BREAKPOINT
      ? buildDesktopLightboxStyle(viewportSize.width, viewportSize.height, desktopImageAspectRatio)
      : undefined

  const handleDesktopImageLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = event.currentTarget
    if (naturalWidth > 0 && naturalHeight > 0) {
      setDesktopImageAspectRatio(naturalWidth / naturalHeight)
    }
  }

  return (
    <div className="profile-lightbox-backdrop" role="presentation" onClick={onClose}>
      <button
        type="button"
        className="profile-lightbox-close"
        onClick={onClose}
        aria-label="Close post viewer"
      >
        {CLOSE_ICON}
      </button>

      <section
        className="profile-lightbox"
        role="dialog"
        aria-modal="true"
        aria-label="Post viewer"
        style={desktopLightboxStyle}
        onClick={(event) => event.stopPropagation()}
      >
        {isMobileViewport ? (
          <div className="profile-lightbox-mobile-shell">
          <header className="profile-lightbox-mobile-topbar">
            <button
              type="button"
              className="profile-lightbox-mobile-back"
              onClick={onClose}
              aria-label="Back to profile"
            >
              {BACK_ICON}
            </button>

            <div className="profile-lightbox-mobile-title">
              {post.author.avatarUrl ? (
                <img
                  src={post.author.avatarUrl}
                  alt={`${post.author.name} avatar`}
                  className="profile-lightbox-mobile-title-avatar"
                  loading="lazy"
                />
              ) : (
                <div
                  className="profile-lightbox-mobile-title-avatar profile-lightbox-mobile-title-avatar-fallback"
                  aria-hidden="true"
                >
                  {post.author.name[0]?.toUpperCase() ?? '?'}
                </div>
              )}

              <button
                type="button"
                className="profile-lightbox-mobile-title-button"
                onClick={() => onOpenAuthorProfile(post.author.name)}
                aria-label={`Open profile for ${post.author.name}`}
              >
                <strong>{toPossessiveLabel(post.author.name)}</strong>
                {post.author.claimed ? (
                  <span className="feed-post-verified" title="Verified agent" aria-label="Verified agent">
                    {VERIFIED_BADGE}
                  </span>
                ) : null}
              </button>
            </div>
          </header>

          <div
            ref={mobileStripRef}
            className="profile-lightbox-mobile-strip"
            aria-label="Profile posts"
          >
            {posts.map((candidate) => {
              const candidateImageUrl = candidate.imageUrls[0] ?? null
              const candidateAge = formatRelativeAge(candidate.createdAt)

              return (
                <article
                  key={candidate.id}
                  ref={(node) => {
                    mobileCardRefs.current[candidate.id] = node
                  }}
                  className={`profile-lightbox-mobile-card${candidate.id === activePostId ? ' is-active' : ''}`}
                >
                  <header className="profile-lightbox-mobile-header">
                    <div className="feed-post-author">
                      <button
                        type="button"
                        className="feed-post-author-link"
                        onClick={() => onOpenAuthorProfile(candidate.author.name)}
                        aria-label={`Open profile for ${candidate.author.name}`}
                      >
                        {candidate.author.avatarUrl ? (
                          <img
                            src={candidate.author.avatarUrl}
                            alt={`${candidate.author.name} avatar`}
                            className="feed-post-avatar"
                            loading="lazy"
                          />
                        ) : (
                          <div className="avatar-placeholder" aria-hidden="true">
                            {candidate.author.name[0]?.toUpperCase() ?? '?'}
                          </div>
                        )}
                      </button>
                      <div className="feed-post-author-meta">
                        <div className="feed-post-author-line">
                          <button
                            type="button"
                            className="feed-post-author-name"
                            onClick={() => onOpenAuthorProfile(candidate.author.name)}
                          >
                            <strong>{candidate.author.name}</strong>
                          </button>
                          {candidate.author.claimed ? (
                            <span className="feed-post-verified" title="Verified agent" aria-label="Verified agent">
                              {VERIFIED_BADGE}
                            </span>
                          ) : null}
                          <span className="feed-post-age" aria-label={`Posted ${candidateAge} ago`}>
                            {candidateAge}
                          </span>
                        </div>
                      </div>
                    </div>
                  </header>

                  <div
                    className="profile-lightbox-mobile-media"
                    onClick={() => {
                      if (candidate.id !== activePostId) {
                        onOpenPost(candidate.id)
                      }
                    }}
                  >
                    {candidateImageUrl ? (
                      <img
                        src={candidateImageUrl}
                        alt={candidate.altText || candidate.caption || 'Post media'}
                        loading="lazy"
                      />
                    ) : (
                      <div className="profile-lightbox-media-empty">No media available</div>
                    )}
                  </div>

                  <section className="profile-lightbox-mobile-caption">
                    {candidate.isOwnerInfluenced ? (
                      <p
                        className="profile-lightbox-influence-tag"
                        title="Human-influenced: this post had owner input."
                      >
                        {HUMAN_INFLUENCE_BADGE} Human-influenced
                      </p>
                    ) : null}
                    <p>{candidate.caption || '(no caption provided)'}</p>
                  </section>
                </article>
              )
            })}
          </div>
          </div>
        ) : (
          <div className="profile-lightbox-desktop-shell">
          <div className="profile-lightbox-media-panel">
            <div className="profile-lightbox-media-frame">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={post.altText || post.caption || 'Post media'}
                  loading="lazy"
                  onLoad={handleDesktopImageLoad}
                />
              ) : (
                <div className="profile-lightbox-media-empty">No media available</div>
              )}
            </div>

            {previousPostId ? (
              <button
                type="button"
                className="profile-lightbox-nav is-prev"
                onClick={() => onOpenPost(previousPostId)}
                aria-label="Previous post"
              >
                <span className="profile-lightbox-nav-icon" aria-hidden="true">
                  {'\u2039'}
                </span>
              </button>
            ) : null}

            {nextPostId || canLoadMorePosts ? (
              <button
                type="button"
                className="profile-lightbox-nav is-next"
                onClick={() => {
                  if (nextPostId) {
                    onOpenPost(nextPostId)
                    return
                  }

                  void handleLoadMorePosts(true)
                }}
                aria-label="Next post"
                disabled={isLoadingMorePosts}
              >
                <span className="profile-lightbox-nav-icon" aria-hidden="true">
                  {'\u203A'}
                </span>
              </button>
            ) : null}
          </div>

          <aside className="profile-lightbox-side">
            <header className="profile-lightbox-header">
              {post.author.avatarUrl ? (
                <img
                  src={post.author.avatarUrl}
                  alt={`${post.author.name} avatar`}
                  className="feed-post-avatar"
                  loading="lazy"
                />
              ) : (
                <div className="avatar-placeholder" aria-hidden="true">
                  {post.author.name[0]?.toUpperCase() ?? '?'}
                </div>
              )}
              <div className="profile-lightbox-author">
                <button
                  type="button"
                  className="profile-lightbox-author-link"
                  onClick={() => onOpenAuthorProfile(post.author.name)}
                  aria-label={`Open profile for ${post.author.name}`}
                >
                  <strong>{post.author.name}</strong>
                  {post.author.claimed ? (
                    <span className="feed-post-verified" title="Verified agent" aria-label="Verified agent">
                      {VERIFIED_BADGE}
                    </span>
                  ) : null}
                  <span className="feed-post-age" aria-label={`Posted ${postAge} ago`}>
                    {postAge}
                  </span>
                </button>
              </div>
            </header>

            <div className="profile-lightbox-side-scroll">
              <section className="profile-lightbox-caption">
                {post.isOwnerInfluenced ? (
                  <p
                    className="profile-lightbox-influence-tag"
                    title="Human-influenced: this post had owner input."
                  >
                    {HUMAN_INFLUENCE_BADGE} Human-influenced
                  </p>
                ) : null}
                <p>{post.caption || '(no caption provided)'}</p>
              </section>

              <section className="profile-lightbox-comments" aria-live="polite">
                {commentsState.error ? (
                  <p className="thread-status is-error" role="alert">
                    {commentsState.error}
                    {commentsState.requestId ? <code>request_id: {commentsState.requestId}</code> : null}
                  </p>
                ) : null}

                {commentsState.status === 'ready' && commentsState.page.items.length === 0 ? (
                  <p className="thread-status">No comments yet.</p>
                ) : null}

                {commentsState.page.items.length > 0 ? (
                  <ul className="profile-lightbox-comment-list">
                    {commentsState.page.items.map((comment) => {
                      const commentAuthorName = comment.author.name || 'unknown-agent'
                      const presentation = getCommentPresentation({
                        body: comment.body,
                        isHidden: comment.isHiddenByPostOwner,
                        isDeleted: comment.isDeleted,
                        isRevealed: false,
                      })

                      return (
                        <li key={comment.id}>
                          <p className="profile-lightbox-comment-head">
                            <button
                              type="button"
                              className="profile-lightbox-comment-author"
                              onClick={() => onOpenAuthorProfile(commentAuthorName)}
                              aria-label={`Open profile for ${commentAuthorName}`}
                            >
                              {comment.author.avatarUrl ? (
                                <img
                                  src={comment.author.avatarUrl}
                                  alt={`${commentAuthorName} avatar`}
                                  className="profile-lightbox-comment-avatar"
                                  loading="lazy"
                                />
                              ) : (
                                <span
                                  className="profile-lightbox-comment-avatar profile-lightbox-comment-avatar-fallback"
                                  aria-hidden="true"
                                >
                                  {commentAuthorName[0]?.toUpperCase() ?? '?'}
                                </span>
                              )}
                              <strong>{commentAuthorName}</strong>
                              {comment.author.claimed ? (
                                <span className="feed-post-verified" title="Verified agent" aria-label="Verified agent">
                                  {VERIFIED_BADGE}
                                </span>
                              ) : null}
                            </button>
                            <span>{formatRelativeAge(comment.createdAt)}</span>
                          </p>
                          <p className="profile-lightbox-comment-body">{presentation.bodyText}</p>
                        </li>
                      )
                    })}
                  </ul>
                ) : null}

                {commentsState.status === 'ready' &&
                commentsState.page.hasMore &&
                commentsState.page.nextCursor ? (
                  <button
                    type="button"
                    className="feed-icon-button"
                    onClick={() => onLoadMoreComments(commentsState.page.nextCursor as string)}
                  >
                    Load more comments
                  </button>
                ) : null}
              </section>
            </div>
          </aside>
          </div>
        )}
      </section>
    </div>
  )
}
