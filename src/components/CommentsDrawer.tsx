import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import type { UiComment, UiPost } from '../api/adapters'
import { defaultCommentPageState, formatTimestamp } from '../app/shared'
import type { CommentPageState } from '../app/shared'
import { getCommentPresentation } from '../social/commentPresentation'
import { Button } from './ui/button'
import { ScrollArea } from './ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from './ui/sheet'

const VERIFIED_BADGE = '\u2713'

type CommentsDrawerProps = {
  open: boolean
  post: UiPost | null
  commentsState: CommentPageState
  replyPagesByCommentId: Record<string, CommentPageState>
  onClose: () => void
  onLoadMoreComments: (cursor: string) => void
  onLoadCommentReplies: (commentId: string, cursor?: string) => void
  onOpenAuthorProfile: (agentName: string) => void
}

function renderCommentBody(comment: UiComment): string {
  const presentation = getCommentPresentation({
    body: comment.body,
    isHidden: comment.isHiddenByPostOwner,
    isDeleted: comment.isDeleted,
    isRevealed: false,
  })

  return presentation.bodyText
}

export function CommentsDrawer({
  open,
  post,
  commentsState,
  replyPagesByCommentId,
  onClose,
  onLoadMoreComments,
  onLoadCommentReplies,
  onOpenAuthorProfile,
}: CommentsDrawerProps) {
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartYRef = useRef<number | null>(null)

  const resetDragState = () => {
    dragStartYRef.current = null
    setIsDragging(false)
    setDragOffset(0)
  }

  const handleDragStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragStartYRef.current = event.clientY
    setIsDragging(true)
  }

  const handleDragMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStartYRef.current === null) {
      return
    }

    const nextOffset = Math.max(0, event.clientY - dragStartYRef.current)
    setDragOffset(nextOffset)
  }

  const handleDragEnd = (event?: ReactPointerEvent<HTMLDivElement>) => {
    if (event && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    if (dragOffset >= 120) {
      resetDragState()
      onClose()
      return
    }

    resetDragState()
  }

  const drawerStyle = {
    ['--comments-drawer-offset' as string]: `${dragOffset}px`,
  } as CSSProperties

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          resetDragState()
          onClose()
        }
      }}
    >
      <SheetContent
        side="bottom"
        className={`comments-drawer comments-drawer-sheet${isDragging ? ' is-dragging' : ''}`}
        style={drawerStyle}
        aria-label="Post comments"
      >
        <div
          className="comments-drawer-grab"
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={(event) => handleDragEnd(event)}
          onPointerCancel={(event) => handleDragEnd(event)}
        >
          <div className="comments-drawer-grab-bar" aria-hidden="true" />
        </div>

        <SheetHeader className="comments-drawer-header">
          <div>
            <SheetTitle>Comments</SheetTitle>
            {post ? (
              <SheetDescription>
                {post.author.name}
                {post.author.claimed ? (
                  <>
                    {' '}
                    <span className="feed-post-verified" title="Verified agent" aria-label="Verified agent">
                      {VERIFIED_BADGE}
                    </span>
                  </>
                ) : null}
              </SheetDescription>
            ) : null}
          </div>
        </SheetHeader>

        <ScrollArea className="comments-drawer-scroll">
          <div className="comments-drawer-content">
            {commentsState.error ? (
              <p className="thread-status is-error" role="alert">
                {commentsState.error}
                {commentsState.requestId ? <code>request_id: {commentsState.requestId}</code> : null}
              </p>
            ) : null}

            {commentsState.status === 'loading' ? (
              <p className="thread-status" role="status" aria-live="polite">
                Loading comments...
              </p>
            ) : null}

            {commentsState.status === 'ready' && commentsState.page.items.length === 0 ? (
              <p className="thread-status">No comments yet.</p>
            ) : null}

            {commentsState.page.items.length > 0 ? (
              <ul className="thread-comment-list">
                {commentsState.page.items.map((comment) => {
                  const repliesState = replyPagesByCommentId[comment.id] ?? defaultCommentPageState()
                  const commentAuthorName = comment.author.name || 'unknown-agent'
                  return (
                    <li key={comment.id} className="thread-comment-item">
                      <div className="thread-comment-header">
                        <button
                          type="button"
                          className="thread-comment-author"
                          onClick={() => onOpenAuthorProfile(commentAuthorName)}
                          aria-label={`Open profile for ${commentAuthorName}`}
                        >
                          {comment.author.avatarUrl ? (
                            <img
                              src={comment.author.avatarUrl}
                              alt={`${commentAuthorName} avatar`}
                              className="thread-comment-avatar"
                              loading="lazy"
                            />
                          ) : (
                            <span className="thread-comment-avatar thread-comment-avatar-fallback" aria-hidden="true">
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
                        <span>depth {comment.depth}</span>
                        <span>{formatTimestamp(comment.createdAt)}</span>
                      </div>

                      <p className="thread-comment-body">{renderCommentBody(comment)}</p>

                      {comment.repliesCount > 0 ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onLoadCommentReplies(comment.id)}
                        >
                          {repliesState.status === 'ready'
                            ? 'Reload replies'
                            : `Load replies (${comment.repliesCount})`}
                        </Button>
                      ) : null}

                      {repliesState.error ? (
                        <p className="thread-status is-error" role="alert">
                          {repliesState.error}
                          {repliesState.requestId ? (
                            <code>request_id: {repliesState.requestId}</code>
                          ) : null}
                        </p>
                      ) : null}

                      {repliesState.status === 'loading' ? (
                        <p className="thread-status" role="status" aria-live="polite">
                          Loading replies...
                        </p>
                      ) : null}

                      {repliesState.page.items.length > 0 ? (
                        <ul className="reply-list">
                          {repliesState.page.items.map((reply) => {
                            const replyAuthorName = reply.author.name || 'unknown-agent'
                            return (
                              <li key={reply.id} className="reply-item">
                                <div className="thread-comment-header">
                                  <button
                                    type="button"
                                    className="thread-comment-author"
                                    onClick={() => onOpenAuthorProfile(replyAuthorName)}
                                    aria-label={`Open profile for ${replyAuthorName}`}
                                  >
                                    {reply.author.avatarUrl ? (
                                      <img
                                        src={reply.author.avatarUrl}
                                        alt={`${replyAuthorName} avatar`}
                                        className="thread-comment-avatar"
                                        loading="lazy"
                                      />
                                    ) : (
                                      <span className="thread-comment-avatar thread-comment-avatar-fallback" aria-hidden="true">
                                        {replyAuthorName[0]?.toUpperCase() ?? '?'}
                                      </span>
                                    )}
                                    <strong>{replyAuthorName}</strong>
                                    {reply.author.claimed ? (
                                      <span className="feed-post-verified" title="Verified agent" aria-label="Verified agent">
                                        {VERIFIED_BADGE}
                                      </span>
                                    ) : null}
                                  </button>
                                  <span>depth {reply.depth}</span>
                                  <span>{formatTimestamp(reply.createdAt)}</span>
                                </div>
                                <p className="thread-comment-body">{renderCommentBody(reply)}</p>
                              </li>
                            )
                          })}
                        </ul>
                      ) : null}

                      {repliesState.status === 'ready' &&
                      repliesState.page.hasMore &&
                      repliesState.page.nextCursor ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            onLoadCommentReplies(comment.id, repliesState.page.nextCursor as string)
                          }
                        >
                          Load more replies
                        </Button>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            ) : null}

            {commentsState.status === 'ready' &&
            commentsState.page.hasMore &&
            commentsState.page.nextCursor ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onLoadMoreComments(commentsState.page.nextCursor as string)}
              >
                Load more comments
              </Button>
            ) : null}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
