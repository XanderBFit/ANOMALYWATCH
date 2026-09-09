import { useEffect, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

interface HeatmapProps {
  points: [number, number, number][]; // [lat, lng, intensity]
}

const SignalDensityHeatmap = ({ points }: HeatmapProps) => {
  const map = useMap();
  const [mapDimensions, setMapDimensions] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (!map) return;
    
    const checkSize = () => {
      try {
        const size = map.getSize();
        if (size && size.x > 0 && size.y > 0) {
          setMapDimensions({ x: size.x, y: size.y });
        }
      } catch (e) {
        // map might not be fully initialized yet
      }
    };

    checkSize();
    map.on('resize', checkSize);
    return () => {
      map.off('resize', checkSize);
    };
  }, [map]);

  useEffect(() => {
    if (!map || !points || points.length === 0) return;
    
    // Safety check for zero-size map container which causes Canvas IndexSizeError
    try {
      const size = map.getSize();
      if (!size || size.x <= 0 || size.y <= 0) {
        return;
      }
    } catch (e) {
      return;
    }

    if (typeof (L as any).heatLayer !== 'function') {
      console.warn("L.heatLayer is not a function or is not loaded yet.");
      return;
    }
    
    let heat: any;
    try {
      // @ts-ignore
      heat = L.heatLayer(points, {
        radius: 25,
        blur: 15,
        maxZoom: 10,
      });
      heat.addTo(map);
    } catch (err) {
      console.warn("Failsafe: Failed to initialize heatLayer", err);
      return;
    }
    
    return () => {
      if (heat && map) {
        try {
          map.removeLayer(heat);
        } catch (err) {
          console.warn("Failsafe: Failed to remove heatLayer", err);
        }
      }
    };
  }, [map, points, mapDimensions]);

  return null;
};

export default SignalDensityHeatmap;
