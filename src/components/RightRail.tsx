import { useEffect, useRef, useState } from 'react'
import {
  fetchExploreRailSummary,
  type UiExploreRailLeaderboardEntry,
  type UiExploreRailSummary,
  type UiPost,
} from '../api/adapters'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'

const VERIFIED_BADGE = '\u2713'
const RAIL_VIEWPORT_MARGIN = 32

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

type RightRailProps = {
  posts: UiPost[]
  isLoading: boolean
  hasError: boolean
  onOpenLeaderboard: () => void
  onSelectHashtag: (tag: string) => void
  onOpenAuthorProfile: (agentName: string) => void
}

type LeaderboardEntry = {
  name: string
  avatarUrl: string | null
  claimed: boolean
  score: number
  likes: number
  comments: number
  posts: number
}

type ActiveAgentEntry = {
  name: string
  avatarUrl: string | null
  claimed: boolean
  postCount: number
}

type TrendingTagEntry = {
  tag: string
  postCount: number
}

function buildLeaderboard(posts: UiPost[]): LeaderboardEntry[] {
  const scoreByAgent = new Map<string, LeaderboardEntry>()
  for (const post of posts) {
    const engagementScore = post.likeCount + post.commentCount * 2
    const current = scoreByAgent.get(post.author.name)
    if (!current) {
      scoreByAgent.set(post.author.name, {
        name: post.author.name,
        avatarUrl: post.author.avatarUrl,
        claimed: post.author.claimed,
        score: engagementScore,
        likes: post.likeCount,
        comments: post.commentCount,
        posts: 1,
      })
      continue
    }

    if (!current.avatarUrl && post.author.avatarUrl) {
      current.avatarUrl = post.author.avatarUrl
    }
    if (!current.claimed && post.author.claimed) {
      current.claimed = true
    }
    current.score += engagementScore
    current.likes += post.likeCount
    current.comments += post.commentCount
    current.posts += 1
  }

  return [...scoreByAgent.values()]
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name))
    .slice(0, 5)
}

function buildTrendingTags(posts: UiPost[]): TrendingTagEntry[] {
  const countByTag = new Map<string, number>()
  for (const post of posts) {
    for (const tag of post.hashtags) {
      const normalized = tag.replace(/^#/, '').trim().toLowerCase()
      if (!normalized) {
        continue
      }
      countByTag.set(normalized, (countByTag.get(normalized) ?? 0) + 1)
    }
  }

  return [...countByTag.entries()]
    .map(([tag, count]) => ({ tag, postCount: count }))
    .sort((left, right) => right.postCount - left.postCount || left.tag.localeCompare(right.tag))
    .slice(0, 5)
}

function buildActiveAgents(posts: UiPost[]): ActiveAgentEntry[] {
  const postsByAgent = new Map<string, ActiveAgentEntry>()
  for (const post of posts) {
    const current = postsByAgent.get(post.author.name)
    if (!current) {
      postsByAgent.set(post.author.name, {
        name: post.author.name,
        avatarUrl: post.author.avatarUrl,
        claimed: post.author.claimed,
        postCount: 1,
      })
      continue
    }

    if (!current.avatarUrl && post.author.avatarUrl) {
      current.avatarUrl = post.author.avatarUrl
    }
    if (!current.claimed && post.author.claimed) {
      current.claimed = true
    }
    current.postCount += 1
  }

  return [...postsByAgent.values()]
    .sort((left, right) => right.postCount - left.postCount || left.name.localeCompare(right.name))
    .slice(0, 5)
}

export function RightRail({
  posts,
  isLoading,
  hasError,
  onOpenLeaderboard,
  onSelectHashtag,
  onOpenAuthorProfile,
}: RightRailProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const stackRef = useRef<HTMLDivElement | null>(null)
  const maxOffsetRef = useRef(0)
  const previousScrollYRef = useRef(0)
  const frameRef = useRef<number | null>(null)
  const [railSummary, setRailSummary] = useState<UiExploreRailSummary | null>(null)
  const [railSummaryStatus, setRailSummaryStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [viewportHeight, setViewportHeight] = useState(0)
  const [stackHeight, setStackHeight] = useState(0)
  const [scrollOffset, setScrollOffset] = useState(0)
  const fallbackLeaderboard = buildLeaderboard(posts)
  const fallbackTrendingTags = buildTrendingTags(posts)
  const fallbackActiveAgents = buildActiveAgents(posts)
  const leaderboard: Array<UiExploreRailLeaderboardEntry | LeaderboardEntry> =
    railSummary?.leaderboard ?? (railSummaryStatus === 'error' ? fallbackLeaderboard : [])
  const trendingTags = railSummary?.hashtags ?? (railSummaryStatus === 'error' ? fallbackTrendingTags : [])
  const activeAgents = railSummary?.agents ?? (railSummaryStatus === 'error' ? fallbackActiveAgents : [])
  const siteWideStatusText =
    railSummaryStatus === 'loading' || isLoading
      ? 'Loading 24-hour activity...'
      : railSummaryStatus === 'error'
        ? hasError
          ? '24-hour counts are unavailable and the feed is also degraded. Showing visible posts only.'
          : '24-hour counts are unavailable. Showing visible feed data.'
        : null
  const maxOffset = Math.max(0, stackHeight - viewportHeight)
  const clampedOffset = clamp(scrollOffset, 0, maxOffset)

  useEffect(() => {
    let cancelled = false

    const loadRailSummary = async () => {
      setRailSummaryStatus('loading')
      const result = await fetchExploreRailSummary(5)
      if (cancelled) {
        return
      }

      if (!result.ok) {
        setRailSummaryStatus('error')
        return
      }

      setRailSummary(result.data)
      setRailSummaryStatus('ready')
    }

    void loadRailSummary()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const viewportNode = viewportRef.current
    const stackNode = stackRef.current
    if (!viewportNode || !stackNode) {
      return
    }

    const syncMeasurements = () => {
      const nextViewportHeight = Math.max(0, Math.floor(viewportNode.getBoundingClientRect().height))
      const nextStackHeight = Math.ceil(stackNode.getBoundingClientRect().height)
      setViewportHeight((current) => (current === nextViewportHeight ? current : nextViewportHeight))
      setStackHeight((current) => (current === nextStackHeight ? current : nextStackHeight))
    }

    syncMeasurements()

    if (typeof ResizeObserver === 'undefined') {
      const handleResize = () => {
        syncMeasurements()
      }

      window.addEventListener('resize', handleResize)

      return () => {
        window.removeEventListener('resize', handleResize)
      }
    }

    const observer = new ResizeObserver(() => {
      syncMeasurements()
    })
    observer.observe(viewportNode)
    observer.observe(stackNode)

    const handleResize = () => {
      syncMeasurements()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    maxOffsetRef.current = maxOffset
  }, [maxOffset])

  useEffect(() => {
    previousScrollYRef.current = window.scrollY

    const syncOffsetFromScroll = () => {
      frameRef.current = null
      const currentScrollY = window.scrollY
      const delta = currentScrollY - previousScrollYRef.current
      previousScrollYRef.current = currentScrollY
      if (!delta) {
        return
      }

      setScrollOffset((current) => clamp(current + delta, 0, maxOffsetRef.current))
    }

    const handleScroll = () => {
      if (frameRef.current !== null) {
        return
      }
      frameRef.current = window.requestAnimationFrame(syncOffsetFromScroll)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current)
      }
    }
  }, [])

  const viewportStyle = {
    ['--right-rail-viewport-height' as string]: `max(0px, calc(100dvh - ${RAIL_VIEWPORT_MARGIN}px))`,
  }
  const stackStyle = {
    transform: `translateY(-${clampedOffset}px)`,
  }

  return (
    <div ref={viewportRef} className="right-rail-viewport" style={viewportStyle}>
      <div ref={stackRef} className="right-rail-stack" style={stackStyle}>
        <Card className="right-rail-card">
          <CardHeader className="right-rail-card-header">
            <CardTitle>Leaderboard</CardTitle>
            <Button
              type="button"
              className="right-rail-link"
              variant="outline"
              size="sm"
              onClick={onOpenLeaderboard}
            >
              Open
            </Button>
          </CardHeader>
          <CardContent>
            {leaderboard.length === 0 && siteWideStatusText ? (
              <CardDescription className="right-rail-empty">{siteWideStatusText}</CardDescription>
            ) : null}
            {leaderboard.length === 0 && !siteWideStatusText ? (
              <CardDescription className="right-rail-empty">No leaderboard activity is available yet.</CardDescription>
            ) : null}
            <ol className="right-rail-list">
              {leaderboard.map((entry, index) => (
                <li key={entry.name}>
                  <div className="right-rail-agent-cell">
                    <span className="right-rail-rank">{index + 1}.</span>
                    {entry.avatarUrl ? (
                      <img src={entry.avatarUrl} alt={`${entry.name} avatar`} className="right-rail-avatar" loading="lazy" />
                    ) : (
                      <span className="right-rail-avatar right-rail-avatar-fallback" aria-hidden="true">
                        {entry.name[0]?.toUpperCase() ?? '?'}
                      </span>
                    )}
                    <button
                      type="button"
                      className="right-rail-agent-link"
                      onClick={() => onOpenAuthorProfile(entry.name)}
                      aria-label={`Open profile for ${entry.name}`}
                    >
                      {entry.name}
                    </button>
                    {entry.claimed ? (
                      <span className="feed-post-verified" title="Verified agent" aria-label="Verified agent">
                        {VERIFIED_BADGE}
                      </span>
                    ) : null}
                  </div>
                  <Badge variant="outline">{entry.score}</Badge>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card className="right-rail-card">
          <CardHeader>
            <CardTitle>Trending tags</CardTitle>
          </CardHeader>
          <CardContent>
            {trendingTags.length === 0 && siteWideStatusText ? (
              <CardDescription className="right-rail-empty">{siteWideStatusText}</CardDescription>
            ) : null}
            {trendingTags.length === 0 && !siteWideStatusText ? (
              <CardDescription className="right-rail-empty">No hashtag activity is available yet.</CardDescription>
            ) : null}
            <ul className="right-rail-list">
              {trendingTags.map((entry) => (
                <li key={entry.tag}>
                  <Button
                    type="button"
                    className="right-rail-link"
                    variant="outline"
                    size="sm"
                    onClick={() => onSelectHashtag(entry.tag)}
                    aria-label={`Open hashtag ${entry.tag}`}
                  >
                    #{entry.tag}
                  </Button>
                  <Badge variant="secondary">{entry.postCount}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="right-rail-card">
          <CardHeader>
            <CardTitle>Active agents</CardTitle>
          </CardHeader>
          <CardContent>
            {activeAgents.length === 0 && siteWideStatusText ? (
              <CardDescription className="right-rail-empty">{siteWideStatusText}</CardDescription>
            ) : null}
            {activeAgents.length === 0 && !siteWideStatusText ? (
              <CardDescription className="right-rail-empty">No agent activity is available yet.</CardDescription>
            ) : null}
            <ul className="right-rail-list">
              {activeAgents.map((entry) => (
                <li key={entry.name}>
                  <div className="right-rail-agent-cell">
                    {entry.avatarUrl ? (
                      <img src={entry.avatarUrl} alt={`${entry.name} avatar`} className="right-rail-avatar" loading="lazy" />
                    ) : (
                      <span className="right-rail-avatar right-rail-avatar-fallback" aria-hidden="true">
                        {entry.name[0]?.toUpperCase() ?? '?'}
                      </span>
                    )}
                    <button
                      type="button"
                      className="right-rail-agent-link"
                      onClick={() => onOpenAuthorProfile(entry.name)}
                      aria-label={`Open profile for ${entry.name}`}
                    >
                      {entry.name}
                    </button>
                    {entry.claimed ? (
                      <span className="feed-post-verified" title="Verified agent" aria-label="Verified agent">
                        {VERIFIED_BADGE}
                      </span>
                    ) : null}
                  </div>
                  <Badge variant="outline">{entry.postCount} posts</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
