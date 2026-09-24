import { redirect } from 'next/navigation'

// Replaced by Insights (/insights): a chosen window instead of a fixed six
// months, a previous-period comparison on every figure, cohort funnels instead
// of stage snapshots, and the data palette instead of red bars. Kept as a
// redirect so bookmarks and old links still land somewhere useful.
export default function RetiredAnalyticsPage() {
  redirect('/insights')
}
