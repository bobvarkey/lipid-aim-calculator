import { useEffect, useRef, useState, useCallback } from "react";
import mermaid from "mermaid";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

interface MermaidChartProps {
  chart: string;
  className?: string;
}

mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  flowchart: {
    useMaxWidth: false,
    htmlLabels: true,
    curve: "basis",
    nodeSpacing: 30,
    rankSpacing: 40,
  },
  securityLevel: "loose",
});

let chartCounter = 0;

export default function MermaidChart({ chart, className = "" }: MermaidChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState("");
  const [scale, setScale] = useState(1);
  const [initialScale, setInitialScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const idRef = useRef(`mermaid-${++chartCounter}`);

  useEffect(() => {
    const render = async () => {
      try {
        const { svg: renderedSvg } = await mermaid.render(idRef.current, chart);
        setSvg(renderedSvg);
      } catch (e) {
        console.error("Mermaid render error:", e);
      }
    };
    render();
  }, [chart]);

  // Auto-fit: scale chart to fit container width on initial render
  useEffect(() => {
    if (!svg || !containerRef.current || !innerRef.current) return;
    const timer = setTimeout(() => {
      const svgEl = innerRef.current?.querySelector("svg");
      if (!svgEl || !containerRef.current) return;
      const svgWidth = svgEl.getBoundingClientRect().width;
      const containerWidth = containerRef.current.clientWidth;
      if (svgWidth > 0 && containerWidth > 0) {
        const fitScale = Math.min(1, containerWidth / svgWidth);
        setInitialScale(fitScale);
        setScale(fitScale);
        setTranslate({ x: 0, y: 0 });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [svg]);

  const zoom = useCallback((delta: number) => {
    setScale((s) => Math.max(0.1, Math.min(3, s + delta)));
  }, []);

  const resetView = useCallback(() => {
    setScale(initialScale);
    setTranslate({ x: 0, y: 0 });
  }, [initialScale]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      zoom(e.deltaY > 0 ? -0.1 : 0.1);
    }
  }, [zoom]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, tx: translate.x, ty: translate.y };
  }, [translate]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setTranslate({
      x: dragStart.current.tx + (e.clientX - dragStart.current.x),
      y: dragStart.current.ty + (e.clientY - dragStart.current.y),
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  // Touch support for mobile pan
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    setIsDragging(true);
    dragStart.current = { x: touch.clientX, y: touch.clientY, tx: translate.x, ty: translate.y };
  }, [translate]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    e.preventDefault();
    const touch = e.touches[0];
    setTranslate({
      x: dragStart.current.tx + (touch.clientX - dragStart.current.x),
      y: dragStart.current.ty + (touch.clientY - dragStart.current.y),
    });
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => setIsDragging(false), []);

  return (
    <div className={`relative ${className}`}>
      <div className="absolute top-2 right-2 z-10 flex gap-1 no-print">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => zoom(0.15)}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => zoom(-0.15)}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={resetView}>
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="text-[10px] text-muted-foreground absolute bottom-1 right-2 z-10 no-print">
        {Math.round(scale * 100)}% · Pinch/Ctrl+scroll to zoom · Drag to pan
      </div>
      <div
        ref={containerRef}
        className="overflow-hidden rounded-lg border border-border bg-background cursor-grab active:cursor-grabbing touch-none"
        style={{ minHeight: "600px" }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          ref={innerRef}
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: "top left",
            transition: isDragging ? "none" : "transform 0.2s ease",
          }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
    </div>
  );
}
