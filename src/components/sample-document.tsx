import { Plane, FileText } from "lucide-react";

export function SampleDocument({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`sample-document ${compact ? "compact-document" : ""}`}
      aria-label="Illustrative dummy ticket sample, not a valid reservation"
    >
      <div className="document-top">
        <span>
          <Plane size={17} /> Travel itinerary
        </span>
        <span className="sample-chip">Sample</span>
      </div>
      <div className="document-heading">
        <div>
          <span className="document-label">Prepared for</span>
          <strong>Sample traveller</strong>
        </div>
        <FileText size={27} strokeWidth={1.3} />
      </div>
      <div className="document-route">
        <div>
          <strong>DEL</strong>
          <span>New Delhi</span>
        </div>
        <div className="route-line">
          <span />
          <Plane size={19} />
          <span />
        </div>
        <div>
          <strong>DXB</strong>
          <span>Dubai</span>
        </div>
      </div>
      <div className="document-details">
        <div>
          <span className="document-label">Departure</span>
          <strong>Example travel date</strong>
        </div>
        <div>
          <span className="document-label">Trip type</span>
          <strong>One-way</strong>
        </div>
      </div>
      {!compact && (
        <div className="document-details">
          <div>
            <span className="document-label">Passenger</span>
            <strong>1 adult · Example only</strong>
          </div>
          <div>
            <span className="document-label">Reservation reference</span>
            <strong>Not issued · Sample</strong>
          </div>
        </div>
      )}
      <div className="sample-watermark">
        Illustrative sample — not a valid reservation
      </div>
      <div className="document-bottom">
        <span>Temporary reservation document</span>
        <span>01 / 01</span>
      </div>
    </div>
  );
}

