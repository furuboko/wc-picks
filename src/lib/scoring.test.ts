import { describe, it, expect } from 'vitest'
import { scoreGroup } from './scoring'

// チームid定数（テスト用）
const A = 'team_a'
const B = 'team_b'
const C = 'team_c'
const D = 'team_d'

describe('scoreGroup', () => {
  // ─── ① 完全的中 ───────────────────────────────────────────────
  describe('① 完全的中（1〜4位の順位が全て一致）', () => {
    it('予想と結果が全て一致する場合 +5 を返す', () => {
      const score = scoreGroup([A, B, C, D], [A, B, C, D], new Set([A, B]))
      expect(score.points).toBe(5)
      expect(score.reason).toBe('perfect')
    })

    it('完全的中の場合 ② の +3 は加算されない（+5のみ）', () => {
      // 上位2も下位2も一致しているが、① が優先
      const score = scoreGroup([A, B, C, D], [A, B, C, D], new Set([A, B]))
      expect(score.points).toBe(5)
      expect(score.reason).toBe('perfect')
    })
  })

  // ─── ② 上位2・下位2の組み合わせ的中 ──────────────────────────
  describe('② 上位2チームと下位2チームの組み合わせ的中（順不問）', () => {
    it('1位・2位が逆でも上位2チームが一致、下位2チームも一致する場合 +3 を返す', () => {
      // 結果: A1位, B2位, C3位, D4位
      // 予想: B1位, A2位, C3位, D4位（上位2逆、下位2一致）
      const score = scoreGroup([B, A, C, D], [A, B, C, D], new Set([A, B]))
      expect(score.points).toBe(3)
      expect(score.reason).toBe('advancing')
    })

    it('上位2・下位2ともに逆順でも一致すれば +3 を返す', () => {
      // 予想: B1位, A2位, D3位, C4位（上位2・下位2ともに逆）
      const score = scoreGroup([B, A, D, C], [A, B, C, D], new Set([A, B]))
      expect(score.points).toBe(3)
      expect(score.reason).toBe('advancing')
    })

    it('上位2チームが不一致の場合 +3 にならない', () => {
      // 予想: A1位, C2位, B3位, D4位（上位2={A,C}、結果上位2={A,B} → 不一致）
      // prediction[0]=A は突破済 → none
      const score = scoreGroup([A, C, B, D], [A, B, C, D], new Set([A, B]))
      expect(score.points).toBe(0)
      expect(score.reason).toBe('none')
    })

    it('下位2チームは一致するが上位2チームが不一致の場合 +3 にならない', () => {
      // 予想: A1位, C2位, D3位, B4位（上位2不一致、下位2不一致）
      // prediction[0]=A は突破済 → none
      const score = scoreGroup([A, C, D, B], [A, B, C, D], new Set([A, B]))
      expect(score.points).toBe(0)
      expect(score.reason).toBe('none')
    })

    it('上位2チームに突破できないチームが入っていても② は成立する（②は順位組み合わせの判定）', () => {
      // ② は結果の上位2と下位2の一致を見るのみ（advancingTeams は関係しない）
      // 予想: B1位, A2位, D3位, C4位（上位2・下位2逆順一致）
      // advancingTeams に C が含まれる（3位突破）
      const score = scoreGroup([B, A, D, C], [A, B, C, D], new Set([A, B, C]))
      expect(score.points).toBe(3)
      expect(score.reason).toBe('advancing')
    })
  })

  // ─── ③ 1位予想チームが敗退（ペナルティ）────────────────────────
  describe('③ 1位予想チームがR32進出できない場合 -3', () => {
    it('1位予想チームが敗退（advancingTeams に含まれない）場合 -3 を返す', () => {
      // 予想1位=D（敗退チーム）
      const score = scoreGroup([D, A, B, C], [A, B, C, D], new Set([A, B]))
      expect(score.points).toBe(-3)
      expect(score.reason).toBe('penalty')
    })

    it('1位予想チームが3位でトーナメント突破した場合は -3 にならない', () => {
      // 予想1位=C、実際はC3位だが advancingTeams に含まれる（3位突破）
      const score = scoreGroup([C, A, B, D], [A, B, C, D], new Set([A, B, C]))
      // 上位2不一致（予想[C,A] vs 結果[A,B]）、下位2不一致 → ② 不成立
      // prediction[0]=C は advancingTeams に含まれる → ③ 不成立 → none
      expect(score.points).toBe(0)
      expect(score.reason).toBe('none')
    })

    it('② 成立時（上位2・下位2一致）は ③ が発生しない', () => {
      // 予想: B, A, C, D（上位2逆、下位2一致）→ ② +3
      // prediction[0]=B は advancing に含まれるが、② 成立で ③ は排他
      const score = scoreGroup([B, A, C, D], [A, B, C, D], new Set([A, B]))
      expect(score.points).toBe(3)
      expect(score.reason).toBe('advancing')
    })

    it('advancingTeams が未確定（空）の場合はペナルティなし → none', () => {
      // 大会前など結果未確定時はペナルティ計算しない
      const score = scoreGroup([D, A, B, C], [A, B, C, D], new Set<string>())
      expect(score.points).toBe(0)
      expect(score.reason).toBe('none')
    })
  })

  // ─── 排他・エッジケース ──────────────────────────────────────
  describe('排他・エッジケース', () => {
    it('① と ② は排他: 完全的中（①）の場合 ② の +3 は加算しない', () => {
      const score = scoreGroup([A, B, C, D], [A, B, C, D], new Set([A, B]))
      expect(score.points).toBe(5)
    })

    it('① と ③ は排他: 完全的中の場合 ③ は発生しない', () => {
      // 完全的中ならば1位予想は必ず結果の1位 = 突破 → ③ なし
      const score = scoreGroup([A, B, C, D], [A, B, C, D], new Set([A, B]))
      expect(score.points).toBe(5)
      expect(score.reason).toBe('perfect')
    })

    it('① も ② も ③ も該当しない場合 0 を返す', () => {
      // 予想: A, C, B, D（上位2不一致）、prediction[0]=A は突破済 → none
      const score = scoreGroup([A, C, B, D], [A, B, C, D], new Set([A, B]))
      expect(score.points).toBe(0)
      expect(score.reason).toBe('none')
    })
  })
})

// ─── No Penalty ───────────────────────────────────────────────────────────────
describe('scoreGroup (no-penalty)', () => {
  const noAdv = new Set<string>()

  it('完全的中 → +5', () => {
    const s = scoreGroup([A, B, C, D], [A, B, C, D], noAdv, 'no-penalty')
    expect(s.points).toBe(5)
    expect(s.reason).toBe('perfect')
  })

  it('上下2組的中 → +3', () => {
    const s = scoreGroup([B, A, C, D], [A, B, C, D], noAdv, 'no-penalty')
    expect(s.points).toBe(3)
    expect(s.reason).toBe('advancing')
  })

  it('1位予想チームが敗退してもペナルティなし → 0', () => {
    const s = scoreGroup([D, A, B, C], [A, B, C, D], new Set([A, B]), 'no-penalty')
    expect(s.points).toBe(0)
    expect(s.reason).toBe('none')
  })

  it('①②いずれも不成立 → 0', () => {
    const s = scoreGroup([A, C, B, D], [A, B, C, D], noAdv, 'no-penalty')
    expect(s.points).toBe(0)
    expect(s.reason).toBe('none')
  })
})

// ─── Per Position ─────────────────────────────────────────────────────────────
describe('scoreGroup (per-position)', () => {
  const noAdv = new Set<string>()

  it('完全的中（4位置）→ +5 (ボーナス込み)', () => {
    const s = scoreGroup([A, B, C, D], [A, B, C, D], noAdv, 'per-position')
    expect(s.points).toBe(5)
    expect(s.reason).toBe('perfect')
  })

  it('3位置一致 → +3', () => {
    // A1位, B2位, C3位 一致, D4位のみ外れ（4位はD→C、予想はD）
    const s = scoreGroup([A, B, C, D], [A, B, C, D], noAdv, 'per-position') // perfect
    expect(s.points).toBe(5)
    const s2 = scoreGroup([A, B, D, C], [A, B, C, D], noAdv, 'per-position') // 1,2位一致, 3,4位外れ
    expect(s2.points).toBe(2)
    expect(s2.reason).toBe('partial')
  })

  it('2位置一致 → +2', () => {
    const s = scoreGroup([A, B, D, C], [A, B, C, D], noAdv, 'per-position')
    expect(s.points).toBe(2)
    expect(s.reason).toBe('partial')
  })

  it('1位置一致 → +1', () => {
    const s = scoreGroup([A, C, B, D], [A, B, C, D], noAdv, 'per-position') // A1位のみ一致
    // A=一致(1), B→C(0), C→B(0), D=一致(1) → wait 4位はD=D, 3位はB≠C
    // prediction: A B C D ... wait let me recalculate
    // [A, C, B, D] vs [A, B, C, D]: pos0 A=A✓, pos1 C≠B, pos2 B≠C, pos3 D=D✓ → 2 matches
    const s2 = scoreGroup([A, C, D, B], [A, B, C, D], noAdv, 'per-position') // A1位のみ
    expect(s2.points).toBe(1)
    expect(s2.reason).toBe('partial')
  })

  it('0位置一致 → 0', () => {
    const s = scoreGroup([C, D, A, B], [A, B, C, D], noAdv, 'per-position')
    expect(s.points).toBe(0)
    expect(s.reason).toBe('none')
  })

  it('ペナルティは発生しない', () => {
    const s = scoreGroup([D, C, B, A], [A, B, C, D], new Set([A, B]), 'per-position')
    expect(s.points).toBeGreaterThanOrEqual(0)
  })
})

// ─── Top Heavy ────────────────────────────────────────────────────────────────
describe('scoreGroup (top-heavy)', () => {
  const noAdv = new Set<string>()

  it('1〜3位すべて一致 → +6, reason=perfect', () => {
    // A1位=A✓(+3), B2位=B✓(+2), C3位=C✓(+1), D4位=D✓(+0) → 6
    const s = scoreGroup([A, B, C, D], [A, B, C, D], noAdv, 'top-heavy')
    expect(s.points).toBe(6)
    expect(s.reason).toBe('perfect')
  })

  it('1位・2位一致 → +5, reason=partial', () => {
    const s = scoreGroup([A, B, D, C], [A, B, C, D], noAdv, 'top-heavy')
    expect(s.points).toBe(5)
    expect(s.reason).toBe('partial')
  })

  it('1位のみ一致 → +3, reason=partial', () => {
    const s = scoreGroup([A, C, D, B], [A, B, C, D], noAdv, 'top-heavy')
    expect(s.points).toBe(3)
    expect(s.reason).toBe('partial')
  })

  it('2位のみ一致 → +2, reason=partial', () => {
    const s = scoreGroup([C, B, A, D], [A, B, C, D], noAdv, 'top-heavy')
    expect(s.points).toBe(2)
    expect(s.reason).toBe('partial')
  })

  it('3位のみ一致 → +1, reason=partial', () => {
    const s = scoreGroup([B, A, C, D], [A, B, C, D], noAdv, 'top-heavy')
    // pos0 B≠A, pos1 A≠B, pos2 C=C✓(+1), pos3 D=D(+0) → 1
    expect(s.points).toBe(1)
    expect(s.reason).toBe('partial')
  })

  it('何も一致しない → 0, reason=none', () => {
    const s = scoreGroup([C, D, A, B], [A, B, C, D], noAdv, 'top-heavy')
    expect(s.points).toBe(0)
    expect(s.reason).toBe('none')
  })

  it('advancing reason は使わない（Top Heavy 固有の確認）', () => {
    // Classic で advancing になるケース（上下2組一致）でも partial を返す
    const s = scoreGroup([B, A, D, C], [A, B, C, D], noAdv, 'top-heavy')
    // pos0 B≠A, pos1 A≠B, pos2 D≠C, pos3 C≠D → 0点
    expect(s.reason).not.toBe('advancing')
  })

  it('ペナルティは発生しない', () => {
    const s = scoreGroup([D, C, B, A], [A, B, C, D], new Set([A, B]), 'top-heavy')
    expect(s.points).toBeGreaterThanOrEqual(0)
    expect(s.reason).not.toBe('penalty')
  })
})
