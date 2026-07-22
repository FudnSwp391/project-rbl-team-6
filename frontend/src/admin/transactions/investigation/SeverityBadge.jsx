// Thin wrapper over the shared StatusBadge/STATUS_CONFIG system (components.jsx)
// instead of a second parallel severity color scheme — STATUS_CONFIG already
// carries INFO/LOW/MEDIUM/HIGH/CRITICAL keys (see Batch 39 addition).
import { StatusBadge } from '../components'

export default function SeverityBadge({ severity }) {
  return <StatusBadge status={severity} />
}
