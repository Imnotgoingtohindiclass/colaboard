'use client';

// ============================================================
// Whiteboard Toolbar Component
// ============================================================
// Provides drawing tools, color picker, thickness selector,
// undo/redo, zoom controls, clear board, and export functionality.
// ============================================================

import React, { useCallback } from 'react';
import {
  Pencil,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize,
  MessageSquare,
  Users,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DrawingTool, DrawingConfig } from '@/lib/whiteboard/types';
import { COLOR_PALETTE, THICKNESS_OPTIONS } from '@/lib/whiteboard/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ToolbarProps {
  config: DrawingConfig;
  onConfigChange: (config: Partial<DrawingConfig>) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onExportPng: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onToggleChat?: () => void;
  onToggleUsers?: () => void;
  showChat?: boolean;
  showUsers?: boolean;
  connected: boolean;
}

const TOOL_ITEMS: { tool: DrawingTool; icon: React.ReactNode; label: string }[] = [
  { tool: 'pen', icon: <Pencil className="h-4 w-4" />, label: 'Pen' },
  { tool: 'eraser', icon: <Eraser className="h-4 w-4" />, label: 'Eraser' },
];

export default function Toolbar({
  config,
  onConfigChange,
  onUndo,
  onRedo,
  onClear,
  onExportPng,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onToggleChat,
  onToggleUsers,
  showChat,
  showUsers,
  connected,
}: ToolbarProps) {
  const handleToolSelect = useCallback((tool: DrawingTool) => {
    onConfigChange({ tool });
  }, [onConfigChange]);

  const handleColorSelect = useCallback((color: string) => {
    onConfigChange({ color, tool: 'pen' }); // Switch back to pen when selecting color
  }, [onConfigChange]);

  const handleThicknessSelect = useCallback((thickness: number) => {
    onConfigChange({ thickness });
  }, [onConfigChange]);

  return (
    <TooltipProvider delayDuration={300}>
      {/* Main Toolbar */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1.5 bg-white rounded-xl shadow-lg border border-gray-200 p-1.5">
        {/* Drawing Tools */}
        {TOOL_ITEMS.map(({ tool, icon, label }) => (
          <Tooltip key={tool}>
            <TooltipTrigger asChild>
              <Button
                variant={config.tool === tool ? 'default' : 'ghost'}
                size="icon"
                className="h-9 w-9 rounded-lg"
                onClick={() => handleToolSelect(tool)}
              >
                {icon}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              {label}
            </TooltipContent>
          </Tooltip>
        ))}

        <div className="w-full h-px bg-gray-200 my-1" />

        {/* Undo / Redo */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg"
              onClick={onUndo}
            >
              <Undo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            Undo (Ctrl+Z)
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg"
              onClick={onRedo}
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            Redo (Ctrl+Shift+Z)
          </TooltipContent>
        </Tooltip>

        <div className="w-full h-px bg-gray-200 my-1" />

        {/* Zoom Controls */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg"
              onClick={onZoomIn}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            Zoom In
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg"
              onClick={onZoomOut}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            Zoom Out
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg"
              onClick={onZoomReset}
            >
              <Maximize className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            Reset Zoom (Ctrl+0)
          </TooltipContent>
        </Tooltip>

        <div className="w-full h-px bg-gray-200 my-1" />

        {/* Clear & Export */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={onClear}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            Clear Board
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg"
              onClick={onExportPng}
            >
              <Download className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            Export as PNG
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Top Bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-white rounded-xl shadow-lg border border-gray-200 px-3 py-2">
        {/* Connection Status */}
        <div className="flex items-center gap-1.5 mr-2">
          <div
            className={`w-2 h-2 rounded-full ${
              connected ? 'bg-green-500' : 'bg-red-400'
            }`}
          />
          <span className="text-xs text-gray-500">
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        <div className="w-px h-6 bg-gray-200" />

        {/* Color Palette */}
        <div className="flex items-center gap-1 flex-wrap max-w-[280px]">
          {COLOR_PALETTE.map((color) => (
            <button
              key={color}
              className={`w-6 h-6 rounded-md border-2 transition-all hover:scale-110 ${
                config.color === color && config.tool !== 'eraser'
                  ? 'border-gray-800 scale-110'
                  : 'border-gray-200'
              }`}
              style={{ backgroundColor: color }}
              onClick={() => handleColorSelect(color)}
              title={color}
            />
          ))}
          {/* Custom color picker */}
          <div className="relative">
            <input
              type="color"
              value={config.tool === 'eraser' ? '#000000' : config.color}
              onChange={(e) => handleColorSelect(e.target.value)}
              className="w-6 h-6 rounded-md cursor-pointer opacity-0 absolute inset-0"
              title="Custom color"
            />
            <div className="w-6 h-6 rounded-md border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs pointer-events-none">
              +
            </div>
          </div>
        </div>

        <div className="w-px h-6 bg-gray-200" />

        {/* Thickness Selector */}
        <div className="flex items-center gap-1.5">
          {THICKNESS_OPTIONS.map((t) => (
            <button
              key={t}
              className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:bg-gray-100 ${
                config.thickness === t ? 'bg-gray-200 ring-2 ring-gray-400' : ''
              }`}
              onClick={() => handleThicknessSelect(t)}
              title={`${t}px`}
            >
              <div
                className="rounded-full bg-gray-700"
                style={{
                  width: `${Math.min(t, 18)}px`,
                  height: `${Math.min(t, 18)}px`,
                }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Right Side Buttons (Users, Chat) */}
      <div className="absolute right-4 top-4 z-20 flex items-center gap-1.5">
        {onToggleUsers && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showUsers ? 'default' : 'outline'}
                size="sm"
                className="h-9 gap-1.5 rounded-lg bg-white shadow-sm"
                onClick={onToggleUsers}
              >
                <Users className="h-4 w-4" />
                <span className="text-xs hidden sm:inline">Users</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent className="text-xs">
              Toggle Users Panel
            </TooltipContent>
          </Tooltip>
        )}
        {onToggleChat && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showChat ? 'default' : 'outline'}
                size="sm"
                className="h-9 gap-1.5 rounded-lg bg-white shadow-sm"
                onClick={onToggleChat}
              >
                <MessageSquare className="h-4 w-4" />
                <span className="text-xs hidden sm:inline">Chat</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent className="text-xs">
              Toggle Chat Panel
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}