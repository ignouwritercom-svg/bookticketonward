import { Plane, FileText } from "lucide-react";

export function SampleDocument({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`sample-document ${compact ? "compact-document" : ""}`}
      aria-label="Illustrative dummy ticket sample, not a valid reservation"
    >
      <div className="document-top">
        <span>
          <Plane size={17} /> TRAVEL ITINERARY
        </span>
        <span className="sample-chip">SAMPLE</span>
      </div>
      <div className="document-heading">
        <div>
          <span className="document-label">PREPARED FOR</span>
          <strong>Sample Traveller</strong>
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
          <span className="document-label">DEPARTURE</span>
          <strong>Example travel date</strong>
        </div>
        <div>
          <span className="document-label">TRIP TYPE</span>
          <strong>One-way</strong>
        </div>
      </div>
      {!compact && (
        <div className="document-details">
          <div>
            <span className="document-label">PASSENGER</span>
            <strong>1 adult · Example only</strong>
          </div>
          <div>
            <span className="document-label">RESERVATION REFERENCE</span>
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

