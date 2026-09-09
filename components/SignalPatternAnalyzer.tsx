import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { SightingOps } from '../services/firebaseService';
import { Activity, Radio, Compass, ShieldAlert, CheckCircle, MapPin, Sparkles } from 'lucide-react';
import { AnomalyCategory } from '../types';
import { ProgressionService } from '../services/progressionService';

interface TelemetryPoint {
  time: Date;
  val: number;
  rawObj: any;
}

const SignalPatternAnalyzer: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [datasetType, setDatasetType] = useState<'MAGNETIC' | 'SOLAR_FLUX'>('MAGNETIC');
  const [magComponent, setMagComponent] = useState<'hp' | 'he' | 'hn'>('hp');
  const [telemetry, setTelemetry] = useState<TelemetryPoint[]>([]);
  const [info, setInfo] = useState({
    source: 'Acquiring NOAA SWPC Stream...',
    status: 'POLLING',
    timestamp: Date.now()
  });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active Selected Point from Interactive Chart
  const [selectedPoint, setSelectedPoint] = useState<TelemetryPoint | null>(null);
  const [triangulating, setTriangulating] = useState(false);
  const [calculationResult, setCalculationResult] = useState<{
    lat: number;
    lng: number;
    deviation: string;
    resolvedLocation: string;
  } | null>(null);
  const [successLogged, setSuccessLogged] = useState(false);

  // Fetch true telemetry proxy datasets
  useEffect(() => {
    let active = true;
    const fetchTelemetry = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const endpoint = datasetType === 'MAGNETIC' ? '/api/sensory/magnetometer' : '/api/sensory/space-weather';
        const res = await fetch(endpoint);
        if (!res.ok) throw new Error(`Telemetry gateway responded with: ${res.status}`);
        const json = await res.json();
        
        if (!active) return;

        setInfo({
          source: json.source,
          status: json.status,
          timestamp: json.timestamp
        });

        // Parse array raw entries to standard visual grid format
        if (json.data && Array.isArray(json.data)) {
          const parsedPoints: TelemetryPoint[] = json.data.map((item: any) => {
            const timeVal = item.time_tag ? new Date(item.time_tag) : new Date();
            let metricVal = 0;
            if (datasetType === 'MAGNETIC') {
              metricVal = parseFloat(item[magComponent]) || 0;
            } else {
              metricVal = parseFloat(item.flux) || 0;
              // Amplify solar flux coefficients to render correctly on chart scales
              if (metricVal < 1e-5) metricVal = metricVal * 1e7; 
            }
            return {
              time: timeVal,
              val: metricVal,
              rawObj: item
            };
          }).filter(p => !isNaN(p.val));

          setTelemetry(parsedPoints);
          if (parsedPoints.length > 0 && !selectedPoint) {
            // Select the most recent peak or end point by default
            setSelectedPoint(parsedPoints[parsedPoints.length - 1]);
          }
        } else {
          throw new Error('Malformed telemetry buffer list');
        }
      } catch (error: any) {
        if (active) {
          console.error("Sensory fetch stalled:", error);
          setErrorMsg(error.message || "Failed to establish downlink connection");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 30000); // 30s poll interval
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [datasetType, magComponent]);

  // Handle geographic triangulation calculations based on physical metrics
  useEffect(() => {
    if (!selectedPoint) {
      setCalculationResult(null);
      return;
    }

    setTriangulating(true);
    setSuccessLogged(false);
    
    // Simulate high-cadence coordinate resolution
    const timeout = setTimeout(() => {
      const v = selectedPoint.val;
      
      // Seed GPS Coordinates from real physical values
      // Centralized Northwest Pacific Trench & Cascade anomalies
      const refLat = 46.3190;
      const refLng = -123.6750;
      
      const latOffset = Math.sin(v * 15.31) * 2.45 + (v % 1 === 0 ? 0 : 0.024);
      const lngOffset = Math.cos(v * 8.94) * 3.12 - (v % 1 === 0 ? 0 : 0.052);
      
      const solvedLat = parseFloat((refLat + latOffset).toFixed(4));
      const solvedLng = parseFloat((refLng + lngOffset).toFixed(4));
      
      // Compute scalar deviance vector
      const calculatedDeviation = (Math.abs(latOffset * lngOffset) * 14.5).toFixed(2);
      
      let clusterSector = 'Interstellar Drift Sector Alpha';
      if (solvedLat > 47) clusterSector = 'Mount Rainier Geothermal Rift Node';
      else if (solvedLat < 45) clusterSector = 'Willamette Valley Sub-Crustal Anomaly';
      else if (solvedLng < -124) clusterSector = 'Juan de Fuca Plate Subduction Boundary';
      
      setCalculationResult({
        lat: solvedLat,
        lng: solvedLng,
        deviation: `${calculatedDeviation}nT/fW`,
        resolvedLocation: clusterSector
      });
      setTriangulating(false);
    }, 400);

    return () => clearTimeout(timeout);
  }, [selectedPoint]);

  // Draw dynamic D3 Line Chart
  useEffect(() => {
    if (!svgRef.current || telemetry.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); 

    // Retrieve container width dynamically
    const containerWidth = containerRef.current?.getBoundingClientRect().width || 600;
    const width = containerWidth;
    const height = 180;
    const margin = { top: 15, right: 35, bottom: 25, left: 45 };

    // Scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(telemetry, d => d.time) as [Date, Date])
      .range([margin.left, width - margin.right]);

    const yMin = d3.min(telemetry, d => d.val) || 0;
    const yMax = d3.max(telemetry, d => d.val) || 100;
    const yPad = (yMax - yMin) * 0.15 || 5;

    const yScale = d3.scaleLinear()
      .domain([yMin - yPad, yMax + yPad])
      .range([height - margin.bottom, margin.top]);

    // Grid lines - Horizontal only
    svg.append("g")
      .attr("class", "grid-axis text-slate-800 opacity-20")
      .attr("transform", `translate(0,0)`)
      .call(d3.axisLeft(yScale)
        .tickSize(-width + margin.left + margin.right)
        .tickFormat(() => "")
      )
      .call(g => g.select(".domain").remove());

    // Axes Layout
    const xAxis = d3.axisBottom(xScale)
      .ticks(Math.max(3, Math.floor(width / 130)))
      .tickFormat(d3.timeFormat("%H:%M:%S") as any);

    const yAxis = d3.axisLeft(yScale)
      .ticks(5)
      .tickFormat(d => {
        if (datasetType === 'SOLAR_FLUX') {
          return `${(+d).toFixed(1)}f`;
        }
        return `${(+d).toFixed(0)}nT`;
      });

    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .attr("class", "text-[9px] font-mono")
      .call(xAxis)
      .attr("color", "#475569")
      .call(g => g.select(".domain").classed("stroke-slate-700/60", true));
    
    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .attr("class", "text-[9px] font-mono")
      .call(yAxis)
      .attr("color", "#475569")
      .call(g => g.select(".domain").classed("stroke-slate-700/60", true));

    // Plot Line
    const lineGenerator = d3.line<TelemetryPoint>()
      .x(d => xScale(d.time))
      .y(d => yScale(d.val))
      .curve(d3.curveMonotoneX);

    // Dynamic color matching
    const strokeColor = datasetType === 'MAGNETIC' ? '#38bdf8' : '#eab308';
    const areaColor = datasetType === 'MAGNETIC' ? 'rgba(56, 189, 248, 0.03)' : 'rgba(234, 179, 8, 0.03)';

    // Filled Area below line
    const areaGenerator = d3.area<TelemetryPoint>()
      .x(d => xScale(d.time))
      .y0(height - margin.bottom)
      .y1(d => yScale(d.val))
      .curve(d3.curveMonotoneX);

    svg.append("path")
      .datum(telemetry)
      .attr("fill", areaColor)
      .attr("d", areaGenerator);

    // Line Path
    svg.append("path")
      .datum(telemetry)
      .attr("fill", "none")
      .attr("stroke", strokeColor)
      .attr("stroke-width", 1.8)
      .attr("d", lineGenerator);

    // Scatter Hotspots
    svg.selectAll(".dot")
      .data(telemetry)
      .enter()
      .append("circle")
      .attr("class", "dot cursor-pointer transition-all hover:scale-150 duration-100")
      .attr("cx", d => xScale(d.time))
      .attr("cy", d => yScale(d.val))
      .attr("r", d => d.time === selectedPoint?.time ? 5 : 2.5)
      .attr("fill", d => d.time === selectedPoint?.time ? strokeColor : "#0f172a")
      .attr("stroke", strokeColor)
      .attr("stroke-width", d => d.time === selectedPoint?.time ? 2.5 : 1)
      .on("click", (event, d) => {
        setSelectedPoint(d);
      });

  }, [telemetry, selectedPoint, datasetType, magComponent]);

  const handleLogSighting = async () => {
    if (!selectedPoint || !calculationResult) return;
    try {
      const telemetryName = datasetType === 'MAGNETIC' ? `NOAA GOES Mag Vector (${magComponent.toUpperCase()})` : "NOAA GOES Solar Flux Probe";
      const devVal = selectedPoint.val;
      
      const uapSighting = {
        title: `Telemetry Intercept: ${datasetType} Anomalous Pulse`,
        date: new Date().toISOString().split('T')[0],
        location: `${calculationResult.lat}°N, ${calculationResult.lng}°W (${calculationResult.resolvedLocation})`,
        description: `Resolved tri-axial telemetry intercept of ${telemetryName}. Hard value registration deviation of ${devVal.toFixed(3)} detected by geostationary receptors. Target spatial cluster: ${calculationResult.resolvedLocation}.`,
        category: 'Phenomena' as AnomalyCategory,
        severity: 'HIGH' as const
      };
      
      await SightingOps.reportSighting(uapSighting);
      setSuccessLogged(true);
    } catch (e) {
      console.error("Downlink filing error:", e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/70 border border-white/10 rounded-2xl overflow-hidden shadow-2xl p-4">
      {/* Header telemetry selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 border-b border-white/5 pb-3">
        <div className="flex items-center gap-3">
          <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
            Cosmic Waveform Integrator
          </h3>

          {/* Secret Quantum Artifact Treasure Node */}
          <button
            onClick={() => ProgressionService.discoverArtifact('ARTIFACT_QUANTUM_FREQ_432')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[9px] font-mono font-bold hover:bg-amber-500 hover:text-black transition-all cursor-pointer shadow-[0_0_10px_rgba(245,158,11,0.2)]"
            title="Hidden Quantum Signal Spike - Click to Decode Intel"
          >
            <Sparkles className="w-3 h-3 animate-spin text-amber-400 hover:text-black" />
            <span>QN-432-HERTZ</span>
          </button>
        </div>
        
        {/* Toggle selectors */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => { setDatasetType('MAGNETIC'); setSelectedPoint(null); }}
            className={`px-3 py-1 text-[10px] font-mono font-bold rounded-lg transition-all border ${
              datasetType === 'MAGNETIC'
                ? 'bg-sky-950/50 border-sky-500/40 text-sky-400'
                : 'bg-slate-905 border-white/5 text-slate-400 hover:text-white'
            }`}
          >
            MAGNETOMETER SENSORS (NOAA)
          </button>
          <button
            onClick={() => { setDatasetType('SOLAR_FLUX'); setSelectedPoint(null); }}
            className={`px-3 py-1 text-[10px] font-mono font-bold rounded-lg transition-all border ${
              datasetType === 'SOLAR_FLUX'
                ? 'bg-amber-950/50 border-amber-500/40 text-amber-400'
                : 'bg-slate-905 border-white/5 text-slate-400 hover:text-white'
            }`}
          >
            SOLAR X-RAY FLUX (GOES)
          </button>
        </div>
      </div>

      {/* Sensor information bar */}
      <div className="flex justify-between items-center text-[9px] font-mono mb-3 bg-slate-900/50 p-2 rounded-lg border border-white/5">
        <div className="text-slate-400 truncate max-w-[280px]">
          UPLINK: <span className="text-white">{info.source}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-slate-500">T: {new Date(info.timestamp).toLocaleTimeString()}</span>
          <span className="px-1.5 py-0.5 bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 rounded-sm font-bold">
            {info.status}
          </span>
        </div>
      </div>

      {/* Sub components for magnetic dimensions */}
      {datasetType === 'MAGNETIC' && (
        <div className="flex items-center gap-2 mb-3 bg-slate-900/10 p-1.5 rounded-lg border border-white/5">
          <span className="text-[9px] font-mono text-slate-500 ml-1">VECTOR PLANE:</span>
          {(['hp', 'he', 'hn'] as const).map(comp => (
            <button
              key={comp}
              onClick={() => { setMagComponent(comp); setSelectedPoint(null); }}
              className={`px-2 py-0.5 text-[8px] font-mono rounded ${
                magComponent === comp
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-400/30'
                  : 'bg-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              {comp.toUpperCase()} ({comp === 'hp' ? 'Parallel' : comp === 'he' ? 'Earthward' : 'Normal'})
            </button>
          ))}
        </div>
      )}

      {/* Chart container */}
      <div className="flex-1 min-h-[180px] relative bg-slate-950/40 border border-white/5 rounded-xl p-2 mb-4" ref={containerRef}>
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400 animate-spin" />
            <span className="text-[9px] font-mono text-slate-500">ESTABLISHING GEOSPATIAL DOWNLINK...</span>
          </div>
        ) : errorMsg ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
            <ShieldAlert className="w-6 h-6 text-red-400 mb-1" />
            <span className="text-xs font-mono text-red-400 font-bold">DOWNLINK CONGESTED</span>
            <span className="text-[9px] font-mono text-slate-500 mt-1 max-w-xs">{errorMsg}</span>
          </div>
        ) : (
          <svg ref={svgRef} className="w-full h-full" />
        )}
      </div>

      {/* Interactive triangulation solver pane */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/40 border border-white/5 rounded-xl p-3 text-xs font-mono text-slate-300">
        <div>
          <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2 flex items-center gap-1.5">
            <Compass className="w-3 h-3 text-violet-400" /> SELECTED INTERCEPT POINT
          </div>
          {selectedPoint ? (
            <div className="space-y-1 text-slate-300">
              <div className="flex justify-between border-b border-white/5 pb-1 text-[11px]">
                <span className="text-slate-500">TIMESTAMP:</span>
                <span className="text-slate-200 font-bold">{selectedPoint.time.toLocaleTimeString()} ({selectedPoint.time.toLocaleDateString()})</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1 text-[11px]">
                <span className="text-slate-500">READINGS:</span>
                <span className="text-sky-400 font-bold">
                  {selectedPoint.val.toFixed(4)} {datasetType === 'MAGNETIC' ? 'nT (Nanotesla)' : 'fW (Watts/m² scaled)'}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">ORBITAL ID:</span>
                <span className="text-slate-400 font-bold">GOES-EAST (PRO-PRIMARY)</span>
              </div>
            </div>
          ) : (
            <div className="text-[10px] text-slate-500 italic flex items-center justify-center h-16 bg-slate-950/20 rounded-md border border-dashed border-white/5">
              Click any node on the line metric above...
            </div>
          )}
        </div>

        <div>
          <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2 flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-emerald-400" /> TRIPHASIC VECTOR SOLVER
          </div>
          {triangulating ? (
            <div className="flex flex-col items-center justify-center h-16 gap-1 bg-slate-950/20 rounded-md border border-white/5">
              <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="text-[8px] text-emerald-500 animate-pulse">SOLVING ATMOSPHERIC DEVIATIONS...</span>
            </div>
          ) : calculationResult ? (
            <div className="space-y-1">
              <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                Resolved Sector: <span className="text-slate-200">{calculationResult.resolvedLocation}</span>
              </div>
              <div className="flex justify-between text-[11px] mt-1.5">
                <span className="text-slate-500">TRI-AX GRID:</span>
                <span className="text-emerald-400 font-bold bg-emerald-950/30 border border-emerald-500/20 px-1 py-0.5 rounded">
                  {calculationResult.lat}°N, {Math.abs(calculationResult.lng)}°W
                </span>
              </div>
              {successLogged ? (
                <div className="mt-2 py-1 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 font-bold text-[9px] rounded-md text-center flex items-center justify-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  FILED SIGHTING MARKER TO SHARED NEXUS FEED
                </div>
              ) : (
                <button
                  onClick={handleLogSighting}
                  className="w-full mt-2 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-[9px] uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-1"
                >
                  <MapPin className="w-3.5 h-3.5 text-slate-950" />
                  Log Target coordinates to map
                </button>
              )}
            </div>
          ) : (
            <div className="text-[10px] text-slate-500 italic flex items-center justify-center h-16 bg-slate-950/20 rounded-md border border-dashed border-white/5">
              Select telemetry timestamp node...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SignalPatternAnalyzer;
