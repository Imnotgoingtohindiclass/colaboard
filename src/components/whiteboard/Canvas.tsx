'use client';

import React, {
  useRef,
  useEffect,
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { Point, Stroke, DrawingConfig } from '@/lib/whiteboard/types';
import { interpolatePoints, generateId } from '@/lib/whiteboard/utils';

export interface CanvasHandle {
  exportAsPng: () => string;
  exportAsSvg: () => string;
  clearDisplay: () => void;
  getViewport: () => { x: number; y: number; scale: number };
  setViewport: (x: number, y: number, scale: number) => void;
}

interface CanvasProps {
  strokes: Stroke[];
  config: DrawingConfig;
  userId: string;
  onAddStroke: (stroke: Stroke) => void;
  onDrawingChange?: (isDrawing: boolean) => void;
  onCursorMove?: (point: { x: number; y: number } | null) => void;
  className?: string;
}

const INTERPOLATION_SPACING = 2;

const Canvas = forwardRef<CanvasHandle, CanvasProps>(function Canvas(
  { strokes, config, userId, onAddStroke, onDrawingChange, onCursorMove, className = '' },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const isDrawingRef = useRef(false);
  const viewportRef = useRef({ x: 0, y: 0, scale: 1 });
  const lastPanPointRef = useRef<{ x: number; y: number } | null>(null);
  const isPanningRef = useRef(false);
  const animationFrameRef = useRef<number>(0);
  const renderDirtyRef = useRef(false);
  const lastRenderedLengthRef = useRef(0);

  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const vp = viewportRef.current;
    return {
      x: (screenX - vp.x) / vp.scale,
      y: (screenY - vp.y) / vp.scale,
    };
  }, []);

  const renderStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: Stroke, vp: { x: number; y: number; scale: number }) => {
    if (stroke.points.length === 0) return;

    ctx.save();
    ctx.translate(vp.x, vp.y);
    ctx.scale(vp.scale, vp.scale);

    if (stroke.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = stroke.color;
    }

    ctx.lineWidth = stroke.thickness;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (stroke.points.length === 1) {
      const p = stroke.points[0];
      ctx.beginPath();
      ctx.arc(p.x, p.y, stroke.thickness / 2, 0, Math.PI * 2);
      ctx.fillStyle = stroke.tool === 'eraser' ? 'rgba(0,0,0,1)' : stroke.color;
      if (stroke.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
      }
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }

    ctx.restore();
  }, []);

  const drawGrid = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, vp: { x: number; y: number; scale: number }) => {
    const gridSize = 20 * vp.scale;
    if (gridSize < 8) return;

    const offsetX = vp.x % gridSize;
    const offsetY = vp.y % gridSize;

    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 0.5;
    ctx.beginPath();

    for (let x = offsetX; x < w; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = offsetY; y < h; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
  }, []);

  const renderAllStrokes = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const vp = viewportRef.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx, canvas.width, canvas.height, vp);

    for (const stroke of strokes) {
      renderStroke(ctx, stroke, vp);
    }

    if (currentStrokeRef.current) {
      renderStroke(ctx, currentStrokeRef.current, vp);
    }

    lastRenderedLengthRef.current = strokes.length;
  }, [strokes, renderStroke, drawGrid]);

  const renderIncremental = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const lastLength = lastRenderedLengthRef.current;

    if (strokes.length < lastLength) {
      renderAllStrokes();
      return;
    }

    const vp = viewportRef.current;

    for (let i = lastLength; i < strokes.length; i++) {
      renderStroke(ctx, strokes[i], vp);
    }

    lastRenderedLengthRef.current = strokes.length;

    if (currentStrokeRef.current) {
      renderStroke(ctx, currentStrokeRef.current, vp);
    }
  }, [strokes, renderStroke, renderAllStrokes]);

  const scheduleRender = useCallback(() => {
    cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = requestAnimationFrame(() => {
      renderIncremental();
    });
  }, [renderIncremental]);

  const scheduleFullRender = useCallback(() => {
    cancelAnimationFrame(animationFrameRef.current);
    renderDirtyRef.current = false;
    renderAllStrokes();
  }, [renderAllStrokes]);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }

    scheduleFullRender();
  }, [scheduleFullRender]);

  const getPoint = useCallback((e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;
    const world = screenToWorld(rawX, rawY);

    return {
      x: world.x,
      y: world.y,
      pressure: e.pressure > 0 ? e.pressure : 0.5,
    };
  }, [screenToWorld]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      isPanningRef.current = true;
      lastPanPointRef.current = { x: e.clientX, y: e.clientY };
      canvas.style.cursor = 'grabbing';
      e.preventDefault();
      return;
    }

    if (e.button !== 0) return;

    const point = getPoint(e);
    isDrawingRef.current = true;
    onDrawingChange?.(true);

    const stroke: Stroke = {
      id: generateId(),
      userId,
      points: [point],
      color: config.color,
      thickness: config.thickness,
      tool: config.tool,
      createdAt: Date.now(),
    };

    currentStrokeRef.current = stroke;
    scheduleRender();

    canvas.setPointerCapture(e.pointerId);
    e.preventDefault();
  }, [userId, config, getPoint, scheduleRender, onDrawingChange]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isPanningRef.current && lastPanPointRef.current) {
      const dx = e.clientX - lastPanPointRef.current.x;
      const dy = e.clientY - lastPanPointRef.current.y;
      viewportRef.current.x += dx;
      viewportRef.current.y += dy;
      lastPanPointRef.current = { x: e.clientX, y: e.clientY };
      scheduleFullRender();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;
    const world = screenToWorld(rawX, rawY);
    onCursorMove?.({ x: Math.round(world.x), y: Math.round(world.y) });

    if (!isDrawingRef.current || !currentStrokeRef.current) return;

    const point = getPoint(e);
    const stroke = currentStrokeRef.current;
    const lastPoint = stroke.points[stroke.points.length - 1];

    const newPoints = interpolatePoints(lastPoint, point, INTERPOLATION_SPACING);
    stroke.points.push(...newPoints);

    scheduleRender();
  }, [screenToWorld, getPoint, scheduleRender, scheduleFullRender, onCursorMove]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      lastPanPointRef.current = null;
      canvasRef.current!.style.cursor = 'crosshair';
      return;
    }

    if (!isDrawingRef.current || !currentStrokeRef.current) return;

    isDrawingRef.current = false;
    onDrawingChange?.(false);

    const stroke = currentStrokeRef.current;
    stroke.completedAt = Date.now();

    onAddStroke(stroke);

    currentStrokeRef.current = null;
    scheduleRender();

    canvasRef.current?.releasePointerCapture(e.pointerId);
  }, [onAddStroke, scheduleRender, onDrawingChange]);

  const handlePointerLeave = useCallback(() => {
    onCursorMove?.(null);
  }, [onCursorMove]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!e.ctrlKey && !e.metaKey) return;

    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const vp = viewportRef.current;
    const zoomFactor = e.deltaY > 0 ? 0.95 : 1.05;
    const newScale = Math.max(0.1, Math.min(10, vp.scale * zoomFactor));

    vp.x = mouseX - (mouseX - vp.x) * (newScale / vp.scale);
    vp.y = mouseY - (mouseY - vp.y) * (newScale / vp.scale);
    vp.scale = newScale;

    scheduleFullRender();
  }, [scheduleFullRender]);

  useImperativeHandle(ref, () => ({
    exportAsPng: () => {
      const canvas = canvasRef.current;
      if (!canvas) return '';
      return canvas.toDataURL('image/png');
    },
    exportAsSvg: () => {
      const bounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 };

      for (const stroke of strokes) {
        for (const p of stroke.points) {
          bounds.minX = Math.min(bounds.minX, p.x);
          bounds.minY = Math.min(bounds.minY, p.y);
          bounds.maxX = Math.max(bounds.maxX, p.x);
          bounds.maxY = Math.max(bounds.maxY, p.y);
        }
      }

      const padding = 20;
      const w = bounds.maxX - bounds.minX + padding * 2;
      const h = bounds.maxY - bounds.minY + padding * 2;

      let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${bounds.minX - padding} ${bounds.minY - padding} ${w} ${h}">`;
      svg += `<rect width="100%" height="100%" fill="white"/>`;

      for (const stroke of strokes) {
        if (stroke.points.length < 2) continue;
        const d = stroke.points.map((p, i) =>
          `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
        ).join(' ');
        svg += `<path d="${d}" stroke="${stroke.color}" stroke-width="${stroke.thickness}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
      }

      svg += '</svg>';
      return svg;
    },
    clearDisplay: () => {
      scheduleFullRender();
    },
    getViewport: () => ({ ...viewportRef.current }),
    setViewport: (x: number, y: number, scale: number) => {
      viewportRef.current = { x, y, scale };
      scheduleFullRender();
    },
  }), [strokes, scheduleFullRender]);

  useEffect(() => {
    resizeCanvas();

    const observer = new ResizeObserver(() => {
      resizeCanvas();
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
      cancelAnimationFrame(animationFrameRef.current);
      renderDirtyRef.current = false;
    };
  }, [resizeCanvas]);

  useEffect(() => {
    scheduleFullRender();
  }, [strokes, scheduleFullRender]);

  useEffect(() => {
    viewportRef.current = { ...config.viewport };
    scheduleFullRender();
  }, [config.viewport.x, config.viewport.y, config.viewport.scale, scheduleFullRender]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        viewportRef.current = { x: 0, y: 0, scale: 1 };
        scheduleFullRender();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scheduleFullRender]);

  const canvasStyle = useMemo(() => ({
    cursor: 'crosshair' as const,
    touchAction: 'none' as const,
  }), []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden ${className}`}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={canvasStyle}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onWheel={handleWheel}
      />
    </div>
  );
});

Canvas.displayName = 'Canvas';

export default React.memo(Canvas);
