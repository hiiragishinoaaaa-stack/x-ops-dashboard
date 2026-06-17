// ============================================================
// X (Twitter) API Service  ─  現在: MOCK実装
// ------------------------------------------------------------
// 本番X APIへの差し替え方法:
//   npm install twitter-api-v2
//   各メソッド内のMOCKコメントを参照して実装を入れ替える
// ============================================================

export interface ActionResult {
  success: boolean
  tweetId?: string
  error?: string
}

export interface TweetMetrics {
  impressions: number
  likes: number
  retweets: number
  replies: number
}

export class XService {
  private credentials: {
    apiKey: string
    apiSecret: string
    accessToken: string
    accessSecret: string
  }

  constructor(credentials: {
    apiKey: string
    apiSecret: string
    accessToken: string
    accessSecret: string
  }) {
    this.credentials = credentials
  }

  // MOCK → 本番: await client.v2.tweet(content)
  async postTweet(content: string): Promise<ActionResult> {
    console.log(`[XService MOCK] postTweet: "${content.slice(0, 50)}"`)
    await delay(300)
    if (Math.random() < 0.05) return { success: false, error: 'Rate limit exceeded (mock)' }
    return { success: true, tweetId: mockId('tweet') }
  }

  // MOCK → 本番: await client.v2.like(userId, tweetId)
  async likeTweet(tweetId: string): Promise<ActionResult> {
    console.log(`[XService MOCK] likeTweet: ${tweetId}`)
    await delay(250)
    if (Math.random() < 0.05) return { success: false, error: 'Rate limit exceeded (mock)' }
    return { success: true }
  }

  // MOCK → 本番: await client.v2.retweet(userId, tweetId)
  async retweet(tweetId: string): Promise<ActionResult> {
    console.log(`[XService MOCK] retweet: ${tweetId}`)
    await delay(250)
    if (Math.random() < 0.05) return { success: false, error: 'Rate limit exceeded (mock)' }
    return { success: true }
  }

  // MOCK → 本番: await client.v2.reply(content, tweetId)
  async replyToTweet(tweetId: string, content: string): Promise<ActionResult> {
    console.log(`[XService MOCK] reply: ${tweetId} → "${content.slice(0, 40)}"`)
    await delay(350)
    if (!content.trim()) return { success: false, error: '返信内容が空です' }
    return { success: true, tweetId: mockId('reply') }
  }

  // MOCK → 本番: client.v2.tweetById(id, { 'tweet.fields': ['public_metrics'] })
  async getTweetMetrics(tweetId: string): Promise<TweetMetrics> {
    console.log(`[XService MOCK] getTweetMetrics: ${tweetId}`)
    await delay(200)
    return {
      impressions: Math.floor(Math.random() * 15000),
      likes: Math.floor(Math.random() * 600),
      retweets: Math.floor(Math.random() * 120),
      replies: Math.floor(Math.random() * 60),
    }
  }

  // MOCK → 本番: await client.v1.verifyCredentials()
  async verifyCredentials(): Promise<{ valid: boolean; username?: string }> {
    await delay(300)
    return { valid: true, username: 'mock_verified_user' }
  }
}

export function createXService(account: {
  api_key?: string | null
  api_secret?: string | null
  access_token?: string | null
  access_secret?: string | null
}): XService {
  return new XService({
    apiKey:       account.api_key       || 'mock',
    apiSecret:    account.api_secret    || 'mock',
    accessToken:  account.access_token  || 'mock',
    accessSecret: account.access_secret || 'mock',
  })
}

function mockId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
