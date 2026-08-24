import { inspectionCenters } from './api'
import { CENTERS } from './site'

export type DisplayCenter = {
  id: string
  name: string
  area: string
  address: string
  hours: string
}

/**
 * One fail-soft source for every public center surface. Operational activation,
 * names and addresses come from the backend; opening hours fall back to the
 * reviewed marketing metadata until the center schema owns a schedule.
 */
export async function getDisplayCenters(): Promise<DisplayCenter[]> {
  const live = await inspectionCenters.active().catch(() => null)
  if (!live?.length) return [...CENTERS]

  return live.map((center) => {
    const known = CENTERS.find((item) => item.id === center.id)
    return {
      id: center.id,
      name: center.name,
      area: center.area || known?.area || 'Kigali',
      address: center.address || known?.address || 'Contact us for directions',
      hours: known?.hours || 'Contact us for opening hours',
    }
  })
}
