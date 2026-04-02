'use client';

import React, {
  useRef,
  useEffect,
  useCallback,
  useState,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { Point, Stroke, DrawingConfig } from '@/lib/whiteboard/types';
import { generateId } from '@/lib/whiteboard/utils';

type CanvasMode =
  | 'none'
  | 'pencil'
  | 'eraser'
  | 'panning'
  | 'pressing'
  | 'selection-net';

interface Camera {
  x: number;
  y: number;
  zoom: number;
}


function pointsToSvgPath(points: Point[]): string {
  const n = points.length;
  if (n === 0) return '';
  if (n === 1) return `M${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  if (n === 2) {
    return `M${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L${points[1].x.toFixed(1)} ${points[1].y.toFixed(1)}`;
  }

  let d = `M${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  let mx = (points[0].x + points[1].x) / 2;
  let my = (points[0].y + points[1].y) / 2;
  d += ` L${mx.toFixed(1)} ${my.toFixed(1)}`;

  for (let i = 1; i < n - 1; i++) {
    const nmx = (points[i].x + points[i + 1].x) / 2;
    const nmy = (points[i].y + points[i + 1].y) / 2;
    d += ` Q${points[i].x.toFixed(1)} ${points[i].y.toFixed(1)} ${nmx.toFixed(1)} ${nmy.toFixed(1)}`;
  }

  d += ` L${points[n - 1].x.toFixed(1)} ${points[n - 1].y.toFixed(1)}`;

  return d;
}

function screenToWorld(clientX: number, clientY: number, cam: Camera): Point {
  return {
    x: (clientX - cam.x) / cam.zoom,
    y: (clientY - cam.y) / cam.zoom,
  };
}

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
  onRemoveStroke?: (strokeId: string) => void;
  onDrawingChange?: (isDrawing: boolean) => void;
  onCursorMove?: (point: { x: number; y: number } | null) => void;
  onCameraChange?: (camera: { x: number; y: number; zoom: number }) => void;
  className?: string;
}

const Canvas = forwardRef<CanvasHandle, CanvasProps>(function Canvas(
  {
    strokes,
    config,
    userId,
    onAddStroke,
    onRemoveStroke,
    onDrawingChange,
    onCursorMove,
    onCameraChange,
    className = '',
  },
  ref,
) {

  const [mode, setMode] = useState<CanvasMode>('none');
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const [pencilDraft, setPencilDraft] = useState<Point[] | null>(null);
  const [selectionNet, setSelectionNet] = useState<{
    origin: Point;
    current: Point;
  } | null>(null);
  const [spaceHeld, setSpaceHeld] = useState(false);

  const originRef = useRef<Point | null>(null);
  const strokesRef = useRef<Stroke[]>(strokes);
  const erasedIdsRef = useRef(new Set<string>());
  const cameraRef = useRef(camera);
  const onCameraChangeRef = useRef(onCameraChange);

  useEffect(() => { strokesRef.current = strokes; }, [strokes]);
  useEffect(() => { cameraRef.current = camera; }, [camera]);
  useEffect(() => { onCameraChangeRef.current = onCameraChange; });

  useEffect(() => {
    onCameraChangeRef.current?.({
      x: camera.x,
      y: camera.y,
      zoom: camera.zoom,
    });
  }, [camera.x, camera.y, camera.zoom]);

  const eraseAtPoint = useCallback(
    (point: Point) => {
      const eraserRadius = config.thickness / 2;
      const currentStrokes = strokesRef.current;

      for (const s of currentStrokes) {
        if (s.tool === 'eraser' || erasedIdsRef.current.has(s.id)) continue;
        for (const sp of s.points) {
          const dx = point.x - sp.x;
          const dy = point.y - sp.y;
          const hitThreshold = eraserRadius + s.thickness / 2;
          if (dx * dx + dy * dy < hitThreshold * hitThreshold) {
            erasedIdsRef.current.add(s.id);
            onRemoveStroke?.(s.id);
            break;
          }
        }
      }
    },
    [config.thickness, onRemoveStroke],
  );

  const visibleStrokes = useMemo(
    () => strokes.filter((s) => s.tool !== 'eraser'),
    [strokes],
  );

  const onWheel = useCallback((e: React.WheelEvent) => {
    const isPinch = e.ctrlKey || e.metaKey;

    if (isPinch) {
      setCamera((prev) => {
        const factor = Math.pow(0.999, e.deltaY);
        const newZoom = Math.min(Math.max(prev.zoom * factor, 0.1), 10);
        return {
          zoom: newZoom,
          x: prev.x + (e.clientX - prev.x) * (1 - factor),
          y: prev.y + (e.clientY - prev.y) * (1 - factor),
        };
      });
    } else {
      setCamera((prev) => ({
        ...prev,
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const point = screenToWorld(e.clientX, e.clientY, cameraRef.current);

      if (e.button === 1 || (e.button === 0 && (spaceHeld || e.altKey))) {
        setMode('panning');
        originRef.current = { x: e.clientX, y: e.clientY };
        e.preventDefault();
        (e.target as Element).setPointerCapture(e.pointerId);
        return;
      }

      if (e.button !== 0) return;

      const tool = config.tool;

      if (tool === 'pen') {
        setMode('pencil');
        setPencilDraft([point]);
        onDrawingChange?.(true);
      } else if (tool === 'eraser') {
        setMode('eraser');
        erasedIdsRef.current.clear();
        eraseAtPoint(point);
        onDrawingChange?.(true);
      } else {
        setMode('pressing');
        originRef.current = point;
      }

      (e.target as Element).setPointerCapture(e.pointerId);
    },
    [config.tool, spaceHeld, onDrawingChange, eraseAtPoint],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const cam = cameraRef.current;
      const worldPoint = screenToWorld(e.clientX, e.clientY, cam);

      onCursorMove?.({ x: Math.round(worldPoint.x), y: Math.round(worldPoint.y) });

      switch (mode) {
        case 'panning':
          setCamera((prev) => ({
            ...prev,
            x: prev.x + e.movementX,
            y: prev.y + e.movementY,
          }));
          break;

        case 'pencil':
          setPencilDraft((prev) => {
            if (!prev || prev.length === 0) return prev;
            const last = prev[prev.length - 1];
            const dx = worldPoint.x - last.x;
            const dy = worldPoint.y - last.y;
            if (dx * dx + dy * dy < 1) return prev;
            return [...prev, worldPoint];
          });
          break;

        case 'eraser':
          eraseAtPoint(worldPoint);
          break;

        case 'pressing':
          if (originRef.current) {
            const dist =
              Math.abs(worldPoint.x - originRef.current.x) +
              Math.abs(worldPoint.y - originRef.current.y);
            if (dist > 5) {
              setMode('selection-net');
              setSelectionNet({
                origin: originRef.current,
                current: worldPoint,
              });
            }
          }
          break;

        case 'selection-net':
          setSelectionNet((prev) =>
            prev ? { origin: prev.origin, current: worldPoint } : null,
          );
          break;
      }
    },
    [mode, onCursorMove, eraseAtPoint],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (mode === 'pencil' && pencilDraft && pencilDraft.length > 0) {
        const stroke: Stroke = {
          id: generateId(),
          userId,
          points: pencilDraft,
          color: config.color,
          thickness: config.thickness,
          tool: 'pen',
          createdAt: Date.now(),
          completedAt: Date.now(),
        };
        onAddStroke(stroke);
      }

      if (mode === 'eraser') {
        erasedIdsRef.current.clear();
      }

      setPencilDraft(null);
      setSelectionNet(null);
      setMode('none');
      originRef.current = null;
      onDrawingChange?.(false);

      try {
        (e.target as Element).releasePointerCapture(e.pointerId);
      } catch {
      }
    },
    [mode, pencilDraft, userId, config.color, config.thickness, onAddStroke, onDrawingChange],
  );

  const onPointerLeave = useCallback(() => {
    onCursorMove?.(null);
  }, [onCursorMove]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el?.isContentEditable || el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setSpaceHeld(true);
      }

      if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setCamera({ x: 0, y: 0, zoom: 1 });
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpaceHeld(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    const prevent = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) e.preventDefault();
    };
    window.addEventListener('wheel', prevent, { passive: false });
    return () => window.removeEventListener('wheel', prevent);
  }, []);

  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    window.addEventListener('gesturestart', prevent, { passive: false });
    return () => window.removeEventListener('gesturestart', prevent);
  }, []);

  const getCursor = (): string => {
    switch (mode) {
      case 'panning':
        return 'cursor-grabbing';
      case 'pencil':
      case 'eraser':
      case 'selection-net':
        return 'cursor-crosshair';
      default:
        return spaceHeld ? 'cursor-grab' : 'cursor-default';
    }
  };

  const showGrid = 30 * camera.zoom >= 10;

  useImperativeHandle(
    ref,
    () => ({
      exportAsPng: () => {
        const exportStrokes = strokes.filter((s) => s.tool !== 'eraser' && s.points.length > 0);
        if (exportStrokes.length === 0) return '';

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const s of exportStrokes) {
          for (const p of s.points) {
            if (p.x < minX) minX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.x > maxX) maxX = p.x;
            if (p.y > maxY) maxY = p.y;
          }
        }

        const pad = 40;
        const w = maxX - minX + pad * 2;
        const h = maxY - minY + pad * 2;

        const canvas = document.createElement('canvas');
        canvas.width = w * 2;
        canvas.height = h * 2;
        const ctx = canvas.getContext('2d')!;
        ctx.scale(2, 2);
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, w, h);

        for (const s of exportStrokes) {
          ctx.strokeStyle = s.color;
          ctx.lineWidth = s.thickness;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          const ox = -minX + pad;
          const oy = -minY + pad;

          if (s.points.length === 1) {
            ctx.beginPath();
            ctx.arc(s.points[0].x + ox, s.points[0].y + oy, s.thickness / 2, 0, Math.PI * 2);
            ctx.fillStyle = s.color;
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.moveTo(s.points[0].x + ox, s.points[0].y + oy);
            for (let i = 1; i < s.points.length; i++) {
              ctx.lineTo(s.points[i].x + ox, s.points[i].y + oy);
            }
            ctx.stroke();
          }
        }

        return canvas.toDataURL('image/png');
      },

      exportAsSvg: () => {
        const exportStrokes = strokes.filter((s) => s.tool !== 'eraser' && s.points.length >= 2);
        if (exportStrokes.length === 0) return '';

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const s of exportStrokes) {
          for (const p of s.points) {
            if (p.x < minX) minX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.x > maxX) maxX = p.x;
            if (p.y > maxY) maxY = p.y;
          }
        }

        const pad = 20;
        const w = maxX - minX + pad * 2;
        const h = maxY - minY + pad * 2;

        let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${minX - pad} ${minY - pad} ${w} ${h}">`;
        svg += `<rect width="100%" height="100%" fill="white"/>`;

        for (const s of exportStrokes) {
          svg += `<path d="${pointsToSvgPath(s.points)}" stroke="${s.color}" stroke-width="${s.thickness}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
        }

        svg += '</svg>';
        return svg;
      },

      clearDisplay: () => {},

      getViewport: () => ({
        x: camera.x,
        y: camera.y,
        scale: camera.zoom,
      }),

      setViewport: (x: number, y: number, scale: number) => {
        setCamera({ x, y, zoom: scale });
      },
    }),
    [strokes, camera],
  );

  return (
    <div
      className={`relative w-full h-full overflow-hidden touch-none ${getCursor()} ${className}`}
      style={{
        touchAction: 'none',
        overscrollBehavior: 'none',
        background: showGrid
          ? 'radial-gradient(circle, #e5e7eb 1.5px, transparent 1.5px)'
          : '#ffffff',
        backgroundSize: showGrid
          ? `${30 * camera.zoom}px ${30 * camera.zoom}px`
          : '0',
        backgroundPosition: showGrid
          ? `${camera.x}px ${camera.y}px`
          : '0',
      }}
    >
      <svg
        className="absolute inset-0 w-full h-full"
        onWheel={onWheel}
        onPointerMove={onPointerMove}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerLeave}
      >
        <g
          style={{
            transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {visibleStrokes.map((stroke) =>
            stroke.points.length === 1 ? (
              <circle
                key={stroke.id}
                cx={stroke.points[0].x}
                cy={stroke.points[0].y}
                r={stroke.thickness / 2}
                fill={stroke.color}
              />
            ) : (
              <path
                key={stroke.id}
                d={pointsToSvgPath(stroke.points)}
                stroke={stroke.color}
                strokeWidth={stroke.thickness}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ),
          )}

          {pencilDraft && pencilDraft.length > 0 && (
            pencilDraft.length === 1 ? (
              <circle
                cx={pencilDraft[0].x}
                cy={pencilDraft[0].y}
                r={config.thickness / 2}
                fill={config.color}
              />
            ) : (
              <path
                d={pointsToSvgPath(pencilDraft)}
                stroke={config.color}
                strokeWidth={config.thickness}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            )
          )}

          {mode === 'selection-net' && selectionNet && (
            <rect
              className="fill-blue-500/5 stroke-blue-500"
              strokeWidth={1 / camera.zoom}
              x={Math.min(selectionNet.origin.x, selectionNet.current.x)}
              y={Math.min(selectionNet.origin.y, selectionNet.current.y)}
              width={Math.abs(selectionNet.origin.x - selectionNet.current.x)}
              height={Math.abs(selectionNet.origin.y - selectionNet.current.y)}
            />
          )}
        </g>
      </svg>
    </div>
  );
});

Canvas.displayName = 'Canvas';

export default React.memo(Canvas);
