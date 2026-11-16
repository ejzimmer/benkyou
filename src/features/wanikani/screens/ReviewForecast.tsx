import './ReviewForecast.css'
import { useLiveQuery } from 'dexie-react-hooks'
import { CrystalCluster } from '../components/CrystalCluster'
import { Tooltip } from '../components/Tooltip'
import type { ForecastDay, ForecastHour } from '../review/buildReviewForecast'
import { loadReviewForecast } from '../review/loadReviewForecast'

const HOURS_PER_DAY = 24

export function ReviewForecast() {
  const forecast = useLiveQuery(loadReviewForecast)
  if (!forecast) return null

  const busiestHourCount = Math.max(1, ...forecast.days.flatMap((day) => day.hours.map((hour) => hour.count)))

  return (
    <section className="review-forecast" aria-label="Review forecast">
      <div className="next-day">
        <span className="count">+{forecast.nextDayCount}</span>
        <span className="label">next 24 hours</span>
      </div>
      <ol className="days">
        {forecast.days.map((day) => (
          <li key={day.date.toString()} className="day">
            <ForecastDayRow day={day} busiestHourCount={busiestHourCount} />
          </li>
        ))}
      </ol>
    </section>
  )
}

interface ForecastDayRowProps {
  day: ForecastDay
  busiestHourCount: number
}

function ForecastDayRow({ day, busiestHourCount }: ForecastDayRowProps) {
  return (
    <>
      <span className="weekday">{day.date.toLocaleString(undefined, { weekday: 'short' })}</span>
      <ol className="timeline">
        {day.hours.map((hour) => (
          <li key={hour.start.toString()} className="cluster" style={{ left: `${getDayProgress(hour) * 100}%` }}>
            <Tooltip text={describeHour(hour)}>
              {(tooltipProps) => (
                <button type="button" {...tooltipProps}>
                  <CrystalCluster seed={hour.start.epochMilliseconds} count={hour.count} busiestCount={busiestHourCount} />
                </button>
              )}
            </Tooltip>
          </li>
        ))}
      </ol>
      <span className="added">+{day.count}</span>
      <span className="total">{day.total}</span>
    </>
  )
}

function describeHour(hour: ForecastHour) {
  return `${hour.start.toLocaleString(undefined, { hour: 'numeric', minute: '2-digit' })} · +${hour.count}`
}

function getDayProgress(hour: ForecastHour) {
  return (hour.start.hour + 0.5) / HOURS_PER_DAY
}

