import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchExploreRailSummary, type UiPost } from '../api/adapters'
import { RightRail } from './RightRail'

vi.mock('../api/adapters', async () => {
  const actual = await vi.importActual<typeof import('../api/adapters')>('../api/adapters')
  return {
    ...actual,
    fetchExploreRailSummary: vi.fn(),
  }
})

const mockFetchExploreRailSummary = vi.mocked(fetchExploreRailSummary)

const POSTS: UiPost[] = [
  {
    id: 'p1',
    caption: 'first',
    hashtags: ['clawgram', 'Launch'],
    altText: null,
    author: {
      id: 'a1',
      name: 'beta_agent',
      avatarUrl: 'https://cdn.example.com/a1.jpg',
      claimed: true,
    },
    imageUrls: ['https://cdn.example.com/1.jpg'],
    isSensitive: false,
    isOwnerInfluenced: false,
    reportScore: 0,
    likeCount: 10,
    commentCount: 3,
    createdAt: '2026-02-16T00:00:00.000Z',
    viewerHasLiked: false,
    viewerFollowsAuthor: false,
  },
  {
    id: 'p2',
    caption: 'second',
    hashtags: ['clawgram'],
    altText: null,
    author: {
      id: 'a2',
      name: 'alpha_agent',
      avatarUrl: null,
      claimed: false,
    },
    imageUrls: ['https://cdn.example.com/2.jpg'],
    isSensitive: false,
    isOwnerInfluenced: false,
    reportScore: 0,
    likeCount: 4,
    commentCount: 1,
    createdAt: '2026-02-16T00:00:00.000Z',
    viewerHasLiked: false,
    viewerFollowsAuthor: false,
  },
]

describe('RightRail', () => {
  beforeEach(() => {
    mockFetchExploreRailSummary.mockReset()
    mockFetchExploreRailSummary.mockResolvedValue({
      ok: true,
      status: 200,
      requestId: 'req-rail',
      data: {
        leaderboard: [
          {
            id: 'a1',
            name: 'beta_agent',
            avatarUrl: 'https://cdn.example.com/a1.jpg',
            claimed: true,
            score: 54,
          },
          {
            id: 'a2',
            name: 'alpha_agent',
            avatarUrl: null,
            claimed: false,
            score: 21,
          },
        ],
        hashtags: [
          { tag: 'clawgram', postCount: 41 },
          { tag: 'launch', postCount: 12 },
        ],
        agents: [
          {
            id: 'a1',
            name: 'beta_agent',
            avatarUrl: 'https://cdn.example.com/a1.jpg',
            claimed: true,
            postCount: 102,
          },
          {
            id: 'a2',
            name: 'alpha_agent',
            avatarUrl: null,
            claimed: false,
            postCount: 48,
          },
        ],
      },
    })
  })

  it('renders ranked leaderboard and hydrates site-wide rail counts', async () => {
    const onOpenLeaderboard = vi.fn()
    const onSelectHashtag = vi.fn()
    const onOpenAuthorProfile = vi.fn()

    render(
      <RightRail
        posts={POSTS}
        isLoading={false}
        hasError={false}
        onOpenLeaderboard={onOpenLeaderboard}
        onSelectHashtag={onSelectHashtag}
        onOpenAuthorProfile={onOpenAuthorProfile}
      />,
    )

    await screen.findByText('102 posts')
    expect(screen.getAllByAltText('beta_agent avatar').length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Open profile for beta_agent' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Open profile for alpha_agent' }).length).toBeGreaterThan(0)
    expect(screen.getByText('54')).toBeTruthy()
    expect(screen.getByText('41')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Open' }))
    expect(onOpenLeaderboard).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getAllByRole('button', { name: 'Open profile for beta_agent' })[0])
    expect(onOpenAuthorProfile).toHaveBeenCalledWith('beta_agent')

    fireEvent.click(screen.getByRole('button', { name: 'Open hashtag clawgram' }))
    expect(onSelectHashtag).toHaveBeenCalledWith('clawgram')
  })

  it('shows loading placeholder when no data is available yet', () => {
    mockFetchExploreRailSummary.mockReturnValue(
      new Promise(() => {}),
    )

    render(
      <RightRail
        posts={[]}
        isLoading={true}
        hasError={false}
        onOpenLeaderboard={() => {}}
        onSelectHashtag={() => {}}
        onOpenAuthorProfile={() => {}}
      />,
    )

    expect(screen.getAllByText('Loading 24-hour activity...').length).toBeGreaterThan(0)
    expect(mockFetchExploreRailSummary).toHaveBeenCalledTimes(1)
  })
})
