import * as admin from 'firebase-admin'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions/v2'
import fetch from 'node-fetch'

admin.initializeApp()
const db = admin.firestore()

// チームid -> 日本語名マッピング（フロントと同一）
const TEAM_NAME_MAP: Record<string, string> = {
  mexico: 'メキシコ', south_africa: '南アフリカ', south_korea: '韓国', czechia: 'チェコ',
  canada: 'カナダ', switzerland: 'スイス', qatar: 'カタール', bosnia_and_herzegovina: 'ボスニア・ヘルツェゴビナ',
  brazil: 'ブラジル', morocco: 'モロッコ', scotland: 'スコットランド', haiti: 'ハイチ',
  usa: 'アメリカ', paraguay: 'パラグアイ', australia: 'オーストラリア', turkey: 'トルコ',
  germany: 'ドイツ', curacao: 'キュラソー', costa_rica: 'コスタリカ', ecuador: 'エクアドル',
  netherlands: 'オランダ', japan: '日本', tunisia: 'チュニジア', sweden: 'スウェーデン',
  belgium: 'ベルギー', egypt: 'エジプト', iran: 'イラン', new_zealand: 'ニュージーランド',
  spain: 'スペイン', cape_verde: 'カーボベルデ', saudi_arabia: 'サウジアラビア', uruguay: 'ウルグアイ',
  france: 'フランス', senegal: 'セネガル', norway: 'ノルウェー', iraq: 'イラク',
  argentina: 'アルゼンチン', algeria: 'アルジェリア', austria: 'オーストリア', jordan: 'ヨルダン',
  portugal: 'ポルトガル', colombia: 'コロンビア', uzbekistan: 'ウズベキスタン', dr_congo: 'コンゴ民主共和国',
  england: 'イングランド', croatia: 'クロアチア', ghana: 'ガーナ', panama: 'パナマ',
}

// OpenFootball の国名 → チームid マッピング
const OPENFOOTBALL_NAME_MAP: Record<string, string> = {
  'Mexico': 'mexico', 'South Africa': 'south_africa', 'Korea Republic': 'south_korea',
  'Korea DPR': 'south_korea', 'Czech Republic': 'czechia', 'Czechia': 'czechia',
  'Canada': 'canada', 'Switzerland': 'switzerland', 'Qatar': 'qatar',
  'Bosnia-Herzegovina': 'bosnia_and_herzegovina', 'Bosnia and Herzegovina': 'bosnia_and_herzegovina',
  'Brazil': 'brazil', 'Morocco': 'morocco', 'Scotland': 'scotland', 'Haiti': 'haiti',
  'USA': 'usa', 'United States': 'usa', 'Paraguay': 'paraguay',
  'Australia': 'australia', 'Turkey': 'turkey', 'Türkiye': 'turkey',
  'Germany': 'germany', 'Curaçao': 'curacao', 'Curacao': 'curacao',
  'Costa Rica': 'costa_rica', 'Ecuador': 'ecuador',
  'Netherlands': 'netherlands', 'Japan': 'japan', 'Tunisia': 'tunisia', 'Sweden': 'sweden',
  'Belgium': 'belgium', 'Egypt': 'egypt', 'IR Iran': 'iran', 'Iran': 'iran',
  'New Zealand': 'new_zealand',
  'Spain': 'spain', 'Cape Verde': 'cape_verde', 'Saudi Arabia': 'saudi_arabia', 'Uruguay': 'uruguay',
  'France': 'france', 'Senegal': 'senegal', 'Norway': 'norway', 'Iraq': 'iraq',
  'Argentina': 'argentina', 'Algeria': 'algeria', 'Austria': 'austria', 'Jordan': 'jordan',
  'Portugal': 'portugal', 'Colombia': 'colombia', 'Uzbekistan': 'uzbekistan',
  'DR Congo': 'dr_congo', 'Congo DR': 'dr_congo', 'Democratic Republic of Congo': 'dr_congo',
  'England': 'england', 'Croatia': 'croatia', 'Ghana': 'ghana', 'Panama': 'panama',
}

// グループid -> グループ文字 マッピング
const GROUP_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

interface OpenFootballGroup {
  name: string
  teams: Array<{ name: string; pts?: number; w?: number; d?: number; l?: number; gf?: number; ga?: number }>
}

interface OpenFootballData {
  name?: string
  groups?: OpenFootballGroup[]
}

/**
 * OpenFootball worldcup.json からGL順位を取得し Firestore に書き込む
 * Cloud Scheduler から毎日 09:00 JST に呼び出される
 */
export const fetchWorldCupResults = onSchedule(
  { schedule: '0 0 * * *', timeZone: 'UTC', region: 'asia-northeast1' },
  async () => {
    logger.info('fetchWorldCupResults: 開始')

    const url =
      'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json'

    let data: OpenFootballData
    try {
      const res = await fetch(url, { timeout: 10000 } as Parameters<typeof fetch>[1])
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      data = (await res.json()) as OpenFootballData
    } catch (err) {
      logger.error('fetchWorldCupResults: データ取得失敗', err)
      // 通知フック: 将来的にここで Slack / LINE / メール通知を追加
      await triggerNotification('error', 'OpenFootball データ取得失敗', String(err))
      return
    }

    if (!data.groups || !Array.isArray(data.groups)) {
      logger.warn('fetchWorldCupResults: groups データなし（大会前の可能性）')
      return
    }

    const batch = db.batch()
    let updatedCount = 0

    for (let i = 0; i < data.groups.length; i++) {
      const group = data.groups[i]
      const groupId = GROUP_LABELS[i]
      if (!groupId) continue

      // チームを pts（勝点）→ gd（得失点差）→ gf（得点）の順でソート
      const sorted = [...group.teams].sort((a, b) => {
        const ptsA = a.pts ?? 0, ptsB = b.pts ?? 0
        if (ptsA !== ptsB) return ptsB - ptsA
        const gdA = (a.gf ?? 0) - (a.ga ?? 0), gdB = (b.gf ?? 0) - (b.ga ?? 0)
        if (gdA !== gdB) return gdB - gdA
        return (b.gf ?? 0) - (a.gf ?? 0)
      })

      // 全チームが pts=0（大会前 or 全未開催）ならスキップ
      const hasResults = sorted.some(t => (t.pts ?? 0) > 0 || (t.w ?? 0) > 0 || (t.d ?? 0) > 0 || (t.l ?? 0) > 0)
      if (!hasResults) continue

      const ranking = sorted.map(t => {
        const teamId = OPENFOOTBALL_NAME_MAP[t.name]
        if (!teamId) logger.warn(`未知のチーム名: ${t.name}`)
        return teamId ?? t.name.toLowerCase().replace(/\s+/g, '_')
      })

      const ref = db.collection('results').doc(groupId)
      batch.set(ref, {
        groupId,
        ranking,
        // advancingTeams は管理者が確定後に手動設定（3位突破チームが確定してから）
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        source: 'openfootball',
      }, { merge: true })

      updatedCount++
    }

    await batch.commit()
    logger.info(`fetchWorldCupResults: ${updatedCount}グループ更新完了`)

    // 通知フック: 将来的にここで更新完了通知を追加
    if (updatedCount > 0) {
      await triggerNotification('success', 'GL結果更新', `${updatedCount}グループ更新`)
    }
  })

/**
 * 通知の抽象レイヤー
 * 現状は Firestore にログを書くだけ。
 * 将来: case 'slack' → Slack Webhook / case 'line' → LINE Notify 等を追加
 */
async function triggerNotification(
  type: 'success' | 'error' | 'info',
  title: string,
  body: string
): Promise<void> {
  try {
    await db.collection('notifications_log').add({
      type,
      title,
      body,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })
    // TODO: 通知チャネルを追加する場合はここに実装
    //例: await sendSlackMessage({ text: `[${type}] ${title}: ${body}` })
    // 例: await sendLineNotify(`[${type}] ${title}: ${body}`)
  } catch (err) {
    logger.error('通知ログ書き込み失敗', err)
  }
}

// 型チェック用エクスポート
export { TEAM_NAME_MAP }
