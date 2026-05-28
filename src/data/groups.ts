import type { GroupId, Team } from '@/types'

export const GROUPS: GroupId[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

export const TEAMS: Team[] = [
  // Group A
  { id: 'mexico', name: 'メキシコ', flag: '🇲🇽', iso: 'mx', groupId: 'A' },
  { id: 'south_africa', name: '南アフリカ', flag: '🇿🇦', iso: 'za', groupId: 'A' },
  { id: 'south_korea', name: '韓国', flag: '🇰🇷', iso: 'kr', groupId: 'A' },
  { id: 'czechia', name: 'チェコ', flag: '🇨🇿', iso: 'cz', groupId: 'A' },
  // Group B
  { id: 'canada', name: 'カナダ', flag: '🇨🇦', iso: 'ca', groupId: 'B' },
  { id: 'switzerland', name: 'スイス', flag: '🇨🇭', iso: 'ch', groupId: 'B' },
  { id: 'qatar', name: 'カタール', flag: '🇶🇦', iso: 'qa', groupId: 'B' },
  { id: 'bosnia_herzegovina', name: 'ボスニア・ヘルツェゴビナ', flag: '🇧🇦', iso: 'ba', groupId: 'B' },
  // Group C
  { id: 'brazil', name: 'ブラジル', flag: '🇧🇷', iso: 'br', groupId: 'C' },
  { id: 'morocco', name: 'モロッコ', flag: '🇲🇦', iso: 'ma', groupId: 'C' },
  { id: 'scotland', name: 'スコットランド', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', iso: 'gb-sct', groupId: 'C' },
  { id: 'haiti', name: 'ハイチ', flag: '🇭🇹', iso: 'ht', groupId: 'C' },
  // Group D
  { id: 'usa', name: 'アメリカ', flag: '🇺🇸', iso: 'us', groupId: 'D' },
  { id: 'paraguay', name: 'パラグアイ', flag: '🇵🇾', iso: 'py', groupId: 'D' },
  { id: 'australia', name: 'オーストラリア', flag: '🇦🇺', iso: 'au', groupId: 'D' },
  { id: 'turkey', name: 'トルコ', flag: '🇹🇷', iso: 'tr', groupId: 'D' },
  // Group E
  { id: 'germany', name: 'ドイツ', flag: '🇩🇪', iso: 'de', groupId: 'E' },
  { id: 'curacao', name: 'キュラソー', flag: '🇨🇼', iso: 'cw', groupId: 'E' },
  { id: 'ivory_coast', name: 'コートジボワール', flag: '🇨🇮', iso: 'ci', groupId: 'E' },
  { id: 'ecuador', name: 'エクアドル', flag: '🇪🇨', iso: 'ec', groupId: 'E' },
  // Group F
  { id: 'netherlands', name: 'オランダ', flag: '🇳🇱', iso: 'nl', groupId: 'F' },
  { id: 'japan', name: '日本', flag: '🇯🇵', iso: 'jp', groupId: 'F' },
  { id: 'tunisia', name: 'チュニジア', flag: '🇹🇳', iso: 'tn', groupId: 'F' },
  { id: 'sweden', name: 'スウェーデン', flag: '🇸🇪', iso: 'se', groupId: 'F' },
  // Group G
  { id: 'belgium', name: 'ベルギー', flag: '🇧🇪', iso: 'be', groupId: 'G' },
  { id: 'egypt', name: 'エジプト', flag: '🇪🇬', iso: 'eg', groupId: 'G' },
  { id: 'iran', name: 'イラン', flag: '🇮🇷', iso: 'ir', groupId: 'G' },
  { id: 'new_zealand', name: 'ニュージーランド', flag: '🇳🇿', iso: 'nz', groupId: 'G' },
  // Group H
  { id: 'spain', name: 'スペイン', flag: '🇪🇸', iso: 'es', groupId: 'H' },
  { id: 'cape_verde', name: 'カーボベルデ', flag: '🇨🇻', iso: 'cv', groupId: 'H' },
  { id: 'saudi_arabia', name: 'サウジアラビア', flag: '🇸🇦', iso: 'sa', groupId: 'H' },
  { id: 'uruguay', name: 'ウルグアイ', flag: '🇺🇾', iso: 'uy', groupId: 'H' },
  // Group I
  { id: 'france', name: 'フランス', flag: '🇫🇷', iso: 'fr', groupId: 'I' },
  { id: 'senegal', name: 'セネガル', flag: '🇸🇳', iso: 'sn', groupId: 'I' },
  { id: 'norway', name: 'ノルウェー', flag: '🇳🇴', iso: 'no', groupId: 'I' },
  { id: 'iraq', name: 'イラク', flag: '🇮🇶', iso: 'iq', groupId: 'I' },
  // Group J
  { id: 'argentina', name: 'アルゼンチン', flag: '🇦🇷', iso: 'ar', groupId: 'J' },
  { id: 'algeria', name: 'アルジェリア', flag: '🇩🇿', iso: 'dz', groupId: 'J' },
  { id: 'austria', name: 'オーストリア', flag: '🇦🇹', iso: 'at', groupId: 'J' },
  { id: 'jordan', name: 'ヨルダン', flag: '🇯🇴', iso: 'jo', groupId: 'J' },
  // Group K
  { id: 'portugal', name: 'ポルトガル', flag: '🇵🇹', iso: 'pt', groupId: 'K' },
  { id: 'colombia', name: 'コロンビア', flag: '🇨🇴', iso: 'co', groupId: 'K' },
  { id: 'uzbekistan', name: 'ウズベキスタン', flag: '🇺🇿', iso: 'uz', groupId: 'K' },
  { id: 'dr_congo', name: 'コンゴ民主共和国', flag: '🇨🇩', iso: 'cd', groupId: 'K' },
  // Group L
  { id: 'england', name: 'イングランド', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', iso: 'gb-eng', groupId: 'L' },
  { id: 'croatia', name: 'クロアチア', flag: '🇭🇷', iso: 'hr', groupId: 'L' },
  { id: 'ghana', name: 'ガーナ', flag: '🇬🇭', iso: 'gh', groupId: 'L' },
  { id: 'panama', name: 'パナマ', flag: '🇵🇦', iso: 'pa', groupId: 'L' },
]

export const TEAMS_BY_GROUP: Record<GroupId, Team[]> = GROUPS.reduce(
  (acc, groupId) => {
    acc[groupId] = TEAMS.filter((t) => t.groupId === groupId)
    return acc
  },
  {} as Record<GroupId, Team[]>
)
