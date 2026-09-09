import React, { useState, useRef, useLayoutEffect } from 'react';
import { ResponsiveContainer } from 'recharts';

interface SafeResponsiveContainerProps {
  children: React.ReactElement;
  width?: number | `${number}%`;
  height?: number | `${number}%`;
  minWidth?: number;
  minHeight?: number;
  aspect?: number;
  className?: string;
  debounce?: number;
}

export const SafeResponsiveContainer: React.FC<SafeResponsiveContainerProps> = ({
  children,
  width = "100%",
  height = "100%",
  minWidth = 100,
  minHeight = 200,
  aspect,
  className = "",
  debounce = 50
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 600,
    height: Math.max(minHeight, 200)
  });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let timeoutId: NodeJS.Timeout;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setDimensions({
          width: Math.floor(rect.width),
          height: Math.floor(rect.height)
        });
      }
    };

    measure();

    const observer = new ResizeObserver((entries) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
            setDimensions({
              width: Math.floor(entry.contentRect.width),
              height: Math.floor(entry.contentRect.height)
            });
          }
        }
      }, debounce);
    });

    observer.observe(el);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [debounce]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full min-w-0 flex-1 relative ${className}`}
      style={{ minWidth: '100%', minHeight: `${minHeight}px`, width: '100%', height: '100%' }}
    >
      <div style={{ minWidth: '100%', minHeight: `${minHeight}px`, width: '100%', height: '100%', position: 'relative' }}>
        <ResponsiveContainer
          width={width}
          height={height}
          minWidth={minWidth}
          minHeight={minHeight}
          aspect={aspect}
          initialDimension={dimensions}
        >
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SafeResponsiveContainer;
