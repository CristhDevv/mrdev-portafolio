import React, { useState } from 'react';
import { History } from 'lucide-react';
import { OpsActivityEvent } from '../types/ops';

interface HistoryViewProps {
  events: OpsActivityEvent[];
}

export const HistoryView: React.FC<HistoryViewProps> = ({ events }) => {
  const [filter, setFilter] = useState('');
  const filtered = events.filter(
    (e) =>
      e.summary.toLowerCase().includes(filter.toLowerCase()) ||
      e.event_type.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div className="ops-stack">
      <div className="ops-panel">
        <div className="ops-panel-head">
          <strong><History size={16} /> Historial Cronológico</strong>
          <input
            type="search"
            placeholder="Filtrar eventos..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="ops-search-input"
          />
        </div>
        <div className="ops-list">
          {filtered.map((ev) => (
            <div key={ev.id} className="ops-list-row">
              <div>
                <span className={`ops-sev ${ev.severity}`}>{ev.severity}</span>
                <strong>{ev.event_type}</strong> — <span>{ev.summary}</span>
              </div>
              <time>{new Date(ev.created_at).toLocaleString()}</time>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
