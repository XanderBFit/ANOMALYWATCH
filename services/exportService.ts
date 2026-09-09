import { jsPDF } from 'jspdf';
import { UFOSighting, SeismicEvent } from '../types';
import { PredictiveCorridor } from './spatialPredictorService';

export class ExportService {
  /**
   * Export anomalies and predictive corridors to RFC 7946 GeoJSON
   */
  public static exportToGeoJSON(
    sightings: UFOSighting[],
    seismicEvents: SeismicEvent[] = [],
    corridors: PredictiveCorridor[] = [],
    filename: string = 'anomaly_watch_geospatial.geojson'
  ) {
    const features: any[] = [];

    // Add sightings as Point features
    sightings.forEach(s => {
      let lat = 0;
      let lng = 0;
      const sAny = s as any;
      if (typeof sAny.lat === 'number' && typeof sAny.lng === 'number') {
        lat = sAny.lat;
        lng = sAny.lng;
      } else if (typeof sAny.latitude === 'number' && typeof sAny.longitude === 'number') {
        lat = sAny.latitude;
        lng = sAny.longitude;
      } else if (s.location) {
        const hash = s.location.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        lat = ((hash * 13) % 120) - 60;
        lng = ((hash * 29) % 320) - 160;
      }

      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        },
        properties: {
          id: s.id,
          title: s.title,
          category: s.category,
          severity: s.severity,
          location: s.location,
          description: s.description,
          timestamp: s.timestamp,
          operative: s.operative || 'OPERATIVE_UNSPECIFIED'
        }
      });
    });

    // Add seismic events
    seismicEvents.forEach((se, idx) => {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [se.longitude, se.latitude]
        },
        properties: {
          id: se.id || `seis-${idx}`,
          title: `Seismic M${se.mag} - ${se.place}`,
          magnitude: se.mag,
          depthKm: se.depth,
          category: 'Seismic / Geological',
          timestamp: se.time
        }
      });
    });

    // Add predictive corridors as LineString features
    corridors.forEach(c => {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: c.corridorPolyline.map(([lat, lng]) => [lng, lat])
        },
        properties: {
          id: c.id,
          clusterName: c.clusterName,
          bearingDegrees: c.bearingDegrees,
          estimatedSpeedKnots: c.estimatedSpeedKnots,
          densityScore: c.densityScore,
          threatLevel: c.threatLevel,
          type: 'Predictive 24h Corridor Vector'
        }
      });
    });

    const geoJsonObject = {
      type: 'FeatureCollection',
      metadata: {
        generatedAt: new Date().toISOString(),
        system: 'ANOMALY_WATCH_TACTICAL_GIS_UPLINK',
        featureCount: features.length
      },
      features
    };

    const blob = new Blob([JSON.stringify(geoJsonObject, null, 2)], { type: 'application/geo+json' });
    this.triggerDownload(blob, filename);
  }

  /**
   * Export anomalies and predictive corridors to Keyhole Markup Language (KML)
   */
  public static exportToKML(
    sightings: UFOSighting[],
    corridors: PredictiveCorridor[] = [],
    filename: string = 'anomaly_watch_vectors.kml'
  ) {
    let kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Anomaly Watch Geospatial Intelligence Uplink</name>
    <description>Tactical Spatial Anomalies &amp; 24-Hour Projected Vector Corridors</description>
    <Style id="uapMarker">
      <IconStyle>
        <scale>1.1</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/paddle/red-circle.png</href>
        </Icon>
      </IconStyle>
    </Style>
    <Style id="corridorLine">
      <LineStyle>
        <color>ff00ff00</color>
        <width>4</width>
      </LineStyle>
    </Style>
    <Folder>
      <name>Active Anomaly Locations</name>`;

    sightings.forEach(s => {
      let lat = 0;
      let lng = 0;
      const sAny = s as any;
      if (typeof sAny.lat === 'number' && typeof sAny.lng === 'number') {
        lat = sAny.lat;
        lng = sAny.lng;
      } else if (typeof sAny.latitude === 'number' && typeof sAny.longitude === 'number') {
        lat = sAny.latitude;
        lng = sAny.longitude;
      } else if (s.location) {
        const hash = s.location.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        lat = ((hash * 13) % 120) - 60;
        lng = ((hash * 29) % 320) - 160;
      }

      kmlContent += `
      <Placemark>
        <name>${this.escapeXml(s.title || 'Anomaly Contact')}</name>
        <description>${this.escapeXml(s.description || '')} | Category: ${s.category} | Severity: ${s.severity}</description>
        <styleUrl>#uapMarker</styleUrl>
        <Point>
          <coordinates>${lng},${lat},0</coordinates>
        </Point>
      </Placemark>`;
    });

    kmlContent += `
    </Folder>
    <Folder>
      <name>Predictive 24-Hour Trajectory Corridors</name>`;

    corridors.forEach(c => {
      const coordString = c.corridorPolyline.map(([lat, lng]) => `${lng},${lat},0`).join(' ');
      kmlContent += `
      <Placemark>
        <name>${this.escapeXml(c.clusterName)} (Speed: ${c.estimatedSpeedKnots} kts)</name>
        <description>Bearing: ${c.bearingDegrees}° | Density Score: ${c.densityScore}/100 | Threat: ${c.threatLevel}</description>
        <styleUrl>#corridorLine</styleUrl>
        <LineString>
          <extrude>1</extrude>
          <tessellate>1</tessellate>
          <coordinates>${coordString}</coordinates>
        </LineString>
      </Placemark>`;
    });

    kmlContent += `
    </Folder>
  </Document>
</kml>`;

    const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' });
    this.triggerDownload(blob, filename);
  }

  /**
   * Export an Anomaly to a PDF Intelligence Briefing Document
   */
  public static exportToPDFBrief(
    anomaly: UFOSighting,
    deepDiveData?: any,
    filename: string = `intelligence_brief_${anomaly.id || Date.now()}.pdf`
  ) {
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4'
    });

    // Dark High-Tech Header Styling
    doc.setFillColor(10, 15, 30);
    doc.rect(0, 0, 210, 35, 'F');

    doc.setTextColor(34, 211, 238); // Cyan
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('ANOMALY WATCH // INTELLIGENCE BRIEFING', 14, 16);

    doc.setTextColor(148, 163, 184); // Slate
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`CLASSIFICATION: TOP SECRET // DISCLOSURE PROTOCOL LEVEL 4`, 14, 24);
    doc.text(`GENERATED: ${new Date().toUTCString()} | REF: ${anomaly.id}`, 14, 29);

    // Section 1: Target Anomaly Overview
    let y = 45;
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, 182, 32, 'F');

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(anomaly.title || 'Unclassified Telemetry Contact', 18, y + 9);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(`Category: ${anomaly.category || 'N/A'} | Severity: ${anomaly.severity || 'MEDIUM'} | Location: ${anomaly.location || 'Unknown Sector'}`, 18, y + 17);
    doc.text(`Recorded Date/Timestamp: ${anomaly.date || new Date().toISOString()}`, 18, y + 24);

    y += 42;

    // Section 2: Narrative Telemetry Description
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('1.0 FIELD OBSERVATION & TELEMETRY LOGS', 14, y);
    y += 6;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    
    const splitDesc = doc.splitTextToSize(anomaly.description || 'No descriptive logs recorded.', 182);
    doc.text(splitDesc, 14, y);
    y += (splitDesc.length * 5) + 8;

    // Section 3: Deep Dive & Root Cause Analysis (if present)
    if (deepDiveData) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('2.0 AI DEEP-DIVE ASSESSMENT & CAUSAL ANALYSIS', 14, y);
      y += 6;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);

      if (deepDiveData.contributingFactorsAndCauses) {
        const primary = deepDiveData.contributingFactorsAndCauses.primaryProbableCause || 'Under investigation';
        doc.text(`Primary Probable Cause: ${primary}`, 14, y);
        y += 6;
      }

      if (deepDiveData.strategicImplications) {
        doc.text('Strategic Implications:', 14, y);
        y += 5;
        const implText = doc.splitTextToSize(deepDiveData.strategicImplications.shortTerm || 'No immediate threat.', 178);
        doc.text(implText, 18, y);
        y += (implText.length * 5) + 6;
      }
    }

    // Section 4: Operational Security Directives
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('3.0 OPERATIONAL SECURITY DIRECTIVES', 14, y);
    y += 6;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text('• Maintain continuous passive RF spectrum scanning across 14.2 kHz and 2.4 GHz bands.', 14, y);
    y += 5;
    doc.text('• Cross-reference ground radar vectors with ADS-B transponder telemetry in sector.', 14, y);
    y += 5;
    doc.text('• Report secondary signal variations directly to global operative uplink.', 14, y);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('CONFIDENTIAL // FOR AUTHORIZED OPERATIVE USE ONLY // ANOMALY WATCH GLOBAL NETWORK', 14, 285);

    doc.save(filename);
  }

  /**
   * Helper to escape XML special chars
   */
  private static escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }

  /**
   * Triggers browser download of blob
   */
  private static triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
