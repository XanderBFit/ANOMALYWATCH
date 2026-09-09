
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { SightingOps } from '../services/firebaseService';
import { UFOSighting } from '../types';

const TemporalFrequencyChart: React.FC = () => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [data, setData] = useState<UFOSighting[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    
    useEffect(() => {
        const fetchData = async () => {
            try {
                const sightings = await SightingOps.getUFOSightings();
                const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
                const filtered = sightings.filter(s => {
                    const ts = s.timestamp?.seconds ? s.timestamp.seconds * 1000 : s.timestamp;
                    return ts ? new Date(ts) > last24h : false;
                });
                setData(filtered);
            } catch (error) {
                console.error("Failed to load historical temporal frequency:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove(); 

        const width = 600;
        const height = 200;
        const margin = { top: 20, right: 30, bottom: 30, left: 45 };

        // Group by hour (0 to 23)
        const hourlyData = d3.rollup(data, v => v.length, d => {
            const ts = d.timestamp?.seconds ? d.timestamp.seconds * 1000 : d.timestamp;
            return ts ? new Date(ts).getHours() : 0;
        });
        const hourlyArray = Array.from({length: 24}, (_, i) => ({
            hour: i, 
            count: hourlyData.get(i) || 0
        }));

        const maxVal = d3.max(hourlyArray, d => d.count) || 0;
        const yMax = maxVal > 0 ? maxVal : 10;

        const xScale = d3.scaleBand()
            .domain(hourlyArray.map(d => d.hour.toString()))
            .range([margin.left, width - margin.right])
            .padding(0.2);

        const yScale = d3.scaleLinear()
            .domain([0, yMax])
            .range([height - margin.bottom, margin.top]);

        // Add glow filter definitions
        const defs = svg.append("defs");
        
        const filter = defs.append("filter")
            .attr("id", "neon-glow-blue")
            .attr("x", "-20%")
            .attr("y", "-20%")
            .attr("width", "140%")
            .attr("height", "140%");

        filter.append("feGaussianBlur")
            .attr("stdDeviation", "3")
            .attr("result", "blur");
            
        filter.append("feMerge")
            .html(`
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
            `);

        // Subtle Gridlines
        svg.append("g")
            .attr("class", "grid-lines")
            .attr("stroke", "rgba(255, 255, 255, 0.03)")
            .attr("stroke-width", 1)
            .selectAll("line")
            .data(yScale.ticks(4))
            .enter()
            .append("line")
            .attr("x1", margin.left)
            .attr("x2", width - margin.right)
            .attr("y1", d => yScale(d))
            .attr("y2", d => yScale(d));

        // Draw Axes with Cyberpunk styling
        const xAxis = d3.axisBottom(xScale)
            .tickFormat((d) => `${d.padStart(2, '0')}:00`)
            .tickValues(hourlyArray.filter((_, i) => i % 4 === 0).map(d => d.hour.toString()));

        svg.append("g")
            .attr("transform", `translate(0,${height - margin.bottom})`)
            .call(xAxis)
            .attr("color", "rgba(100, 116, 139, 0.4)")
            .selectAll("text")
            .attr("fill", "#64748b")
            .attr("font-family", "JetBrains Mono, monospace")
            .attr("font-size", "8px");

        svg.append("g")
            .attr("transform", `translate(${margin.left},0)`)
            .call(d3.axisLeft(yScale).ticks(4).tickFormat(d3.format("d")))
            .attr("color", "rgba(100, 116, 139, 0.4)")
            .selectAll("text")
            .attr("fill", "#64748b")
            .attr("font-family", "JetBrains Mono, monospace")
            .attr("font-size", "8px");

        if (maxVal > 0) {
            // Bars with neon gradient and active glowing markers
            svg.selectAll(".bar")
                .data(hourlyArray)
                .enter()
                .append("rect")
                .attr("class", "bar")
                .attr("x", d => xScale(d.hour.toString())!)
                .attr("y", d => yScale(d.count))
                .attr("width", xScale.bandwidth())
                .attr("height", d => height - margin.bottom - yScale(d.count))
                .attr("fill", "#00d0ff")
                .attr("opacity", 0.85)
                .attr("filter", "url(#neon-glow-blue)")
                .attr("rx", 1)
                .attr("ry", 1);
        } else {
            // telemetric watermark message strictly displayed when no spikes found
            svg.append("text")
                .attr("x", width / 2 + 10)
                .attr("y", height / 2 + 5)
                .attr("text-anchor", "middle")
                .attr("fill", "#64748b")
                .attr("font-family", "JetBrains Mono, monospace")
                .attr("font-size", "9px")
                .attr("letter-spacing", "1px")
                .attr("class", "animate-pulse")
                .text("📡 [ CHRONO-MONITOR NOMINAL // NO ACTIVE ANOMALIES IN THE LAST 24H ]");
        }

    }, [data]);

    return (
        <div id="chrono-temporal-chart" className="glass-panel p-5 border border-white/[0.08] rounded-3xl bg-black/50 shadow-2xl relative overflow-hidden">
            <div className="absolute top-4 right-4 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping"></div>
                <div className="text-[8px] font-mono text-cyan-500 uppercase tracking-widest font-bold">CHRONO_SWEEP_NOMINAL</div>
            </div>
            
            <h3 className="text-celestial-blue font-display font-black uppercase text-[10px] tracking-widest mb-1">
                TEMPORAL ACTIVITY (24H)
            </h3>
            <p className="text-[9px] font-mono text-slate-500 mb-4 uppercase">
                Hourly frequency correlation of incoming multi-factor anomaly signals
            </p>
            
            <div className="relative min-h-[180px] flex items-center justify-center">
                {loading ? (
                    <div className="text-[10px] font-mono text-slate-500 animate-pulse uppercase">
                        Establishing Chrono-Telemetry connection...
                    </div>
                ) : (
                    <svg ref={svgRef} viewBox="0 0 600 200" className="w-full h-auto select-none"></svg>
                )}
            </div>
        </div>
    );
};

export default TemporalFrequencyChart;
