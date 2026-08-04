import { db } from "../../lib/db/schema"
import { useDebouncedQuery } from "../../lib/useDebouncedQuery"
import { PageHeading } from "../../ui/PageHeading"
import { UserMenu } from "../../ui/UserMenu"
import { SyncButton } from "../../ui/SyncButton"
import { REVIEW_MODE_LABELS } from "../review/reviewFlowHelpers"
import { REVEAL_THRESHOLDS_SEC } from "../../lib/srs/time-to-rating"
import { computeTimingStats } from "./timingStats"

function formatSeconds(ms: number | null): string {
  if (ms == null) return "—"
  return `${(ms / 1000).toFixed(1)}秒`
}

function formatRate(rate: number | null): string {
  if (rate == null) return "—"
  return `${Math.round(rate * 100)}%`
}

export function StatsPage() {
  const samples = useDebouncedQuery(() => db.timingSamples.toArray(), [])

  return (
    <div className="page">
      <header className="header app-header">
        <PageHeading backTo="/" backLabel="デッキ一覧に戻る">
          解答時間の統計
        </PageHeading>
        <div className="header-actions">
          <UserMenu />
          <SyncButton />
        </div>
      </header>

      <section className="panel">
        {samples === undefined ? (
          <p className="muted">読み込み中</p>
        ) : samples.length === 0 ? (
          <p className="muted">まだデータがありません。復習をすると記録されます。</p>
        ) : (
          <>
            <p className="muted small">合計{samples.length}件のサンプル</p>
            <div className="table-scroll">
              <table className="stats-table">
                <thead>
                  <tr>
                    <th>モード</th>
                    <th>件数</th>
                    <th>正解率</th>
                    <th>中央値（正解時）</th>
                    <th>平均（正解時）</th>
                    <th>現在の基準</th>
                  </tr>
                </thead>
                <tbody>
                  {computeTimingStats(samples).map((s) => (
                    <tr key={s.modeId}>
                      <td>{REVIEW_MODE_LABELS[s.modeId]}</td>
                      <td>{s.count}</td>
                      <td>{formatRate(s.correctRate)}</td>
                      <td>{formatSeconds(s.medianCorrectMs)}</td>
                      <td>{formatSeconds(s.meanCorrectMs)}</td>
                      <td className="muted small">
                        Easy&lt;{REVEAL_THRESHOLDS_SEC[s.modeId].easyBelow}秒 / Good&lt;
                        {REVEAL_THRESHOLDS_SEC[s.modeId].goodBelow}秒
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
