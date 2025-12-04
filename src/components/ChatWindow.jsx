import React, { useState, useEffect, useRef, useMemo } from "react";
import { IoSend, IoDownload, IoChevronDown, IoChevronUp, IoLocationSharp, IoChatbubbleEllipses } from "react-icons/io5";
import { RiShareForwardLine, RiRobot2Fill } from "react-icons/ri";
import { BiLoaderAlt } from "react-icons/bi";
import { AiOutlineClockCircle } from "react-icons/ai";
import { BsChatDotsFill } from "react-icons/bs";

export default function ChatWindow({ 
  chatId, 
  imageUrl,
  chatTitle,
  chatHistory, 
  onSendMessage, 
  isGenerating,
  elapsedTime,
  lastResponseTime,
  onShareClick,
  theme 
}) {
  const [query, setQuery] = useState('');
  const [canSend, setCanSend] = useState(false);
  const chatEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const imageContainerRef = useRef(null);
  const imageRef = useRef(null);
  const responseRefs = useRef([]);
  const [expandedThinking, setExpandedThinking] = useState({});

  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [highlightIndex, setHighlightIndex] = useState(null);

  // Zoom and pan state
  const [zoom, setZoom] = useState(1); // 1 = fit
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

  // Resizable divider state
  const [leftPanelWidth, setLeftPanelWidth] = useState(55); // percentage - image panel smaller, chat panel larger
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);

  const bgColor = theme === "dark" ? "bg-neutral-900" : "bg-gray-100";
  const textColor = theme === "dark" ? "text-slate-200" : "text-gray-800";
  const secondaryTextColor = theme === "dark" ? "text-slate-400" : "text-gray-600";
  const messageBg = theme === "dark" ? "bg-neutral-800" : "bg-white";
  const userMessageBg = theme === "dark" ? "bg-blue-900" : "bg-blue-200"; // slightly darker blue in light mode
  const inputBg = theme === "dark" ? "bg-neutral-800" : "bg-gray-50";
  const borderColor = theme === "dark" ? "border-slate-600" : "border-gray-300";

  const getThinkingLabel = (reasoningText) => {
    if (!reasoningText) return "Thinking...";

    // 1. Split into lines
    const lines = reasoningText.split('\n');

    // 2. Find the last line that actually STARTS with a bullet point.
    // We search backwards so we don't lose the heading if the 'point' wraps to a new line.
    let targetLine = "";
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        // Check for *, -, •, or 1. at the start
        if (/^[\*\-•]|\d+\./.test(line)) {
            targetLine = line;
            break;
        }
    }

    // If no bullet line found yet, return default
    if (!targetLine) return "Thinking...";

    // 3. Extract text BEFORE the colon
    const colonIndex = targetLine.indexOf(':');
    
    if (colonIndex !== -1) {
      let heading = targetLine.substring(0, colonIndex);

      // 4. CLEANUP: Remove the bullet AND the Markdown (**...**)
      // Remove leading bullet/number (* )
      heading = heading.replace(/^[\*\-•\d\.]+\s*/, '');
      
      // Remove Markdown bold/italic markers (**, *, __, _) to get clean text
      heading = heading.replace(/[\*_]{1,2}/g, '');

      return heading.trim();
    }

    // Fallback: If bullet exists but no colon yet (streaming mid-heading)
    // Strip bullet and return what we have so far
    let pendingHeading = targetLine.replace(/^[\*\-•\d\.]+\s*/, '').replace(/[\*_]{1,2}/g, '');
    return pendingHeading.trim() || "Thinking...";
  };

  // Helper function to format reasoning with bold headings and italic descriptions
  const formatReasoning = (reasoningText) => {
    if (!reasoningText) return null;
    
    // Split into lines/points
    const lines = reasoningText.split('\n').filter(line => line.trim().length > 0);
    
    return lines.map((line, idx) => {
      // Remove leading bullets/asterisks/numbers (*, •, -, 1., etc.)
      let cleanLine = line.trim().replace(/^[\*\•\-]\s*/, '').replace(/^\d+\.\s*/, '');
      
      // Check if line has a colon (heading: description format)
      const colonIndex = cleanLine.indexOf(':');
      
      if (colonIndex > 0) {
        const heading = cleanLine.substring(0, colonIndex).trim();
        const description = cleanLine.substring(colonIndex + 1).trim();
        
        return (
          <div key={idx} className="mb-1">
            <span className="font-bold">{heading}:</span>
            <span className="italic"> {description}</span>
          </div>
        );
      } else {
        // No colon, just display as is
        return (
          <div key={idx} className="mb-1">
            {cleanLine}
          </div>
        );
      }
    });
  };

  useEffect(() => {
    // Enable send button after a short delay to simulate ChatGPT behavior
    const timer = setTimeout(() => {
      setCanSend(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, [chatId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Auto-focus input after response is received
  useEffect(() => {
    if (!isGenerating && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isGenerating]);

  // When chatHistory changes, automatically select the latest message
  useEffect(() => {
    if (!Array.isArray(chatHistory) || chatHistory.length === 0) {
      setSelectedIndex(null);
      return;
    }
    const lastIdx = chatHistory.length - 1;
    // Always select the last message (whether it has bounding boxes or not)
    setSelectedIndex(lastIdx);
  }, [chatHistory]);

  // Track image natural and display sizes to scale bounding boxes
  const updateImageMetrics = () => {
    const img = imageRef.current;
    const container = imageContainerRef.current;
    if (!img || !container) return;

    const natW = img.naturalWidth || 0;
    const natH = img.naturalHeight || 0;
    setNaturalSize({ w: natW, h: natH });

    // Displayed size
    const rect = img.getBoundingClientRect();
    const contRect = container.getBoundingClientRect();
    const dispW = Math.round(rect.width);
    const dispH = Math.round(rect.height);
    setDisplaySize({ w: dispW, h: dispH });

    // Offsets (letterboxing with object-contain)
    const offX = Math.round(rect.left - contRect.left);
    const offY = Math.round(rect.top - contRect.top);
    setImageOffset({ x: offX, y: offY });
  };

  useEffect(() => {
    // Update on load and resize
    const handleResize = () => updateImageMetrics();
    window.addEventListener('resize', handleResize);

    // Observe container and image resize (e.g. sidebar toggle)
    const resizeObserver = new ResizeObserver(() => {
      updateImageMetrics();
    });

    if (imageContainerRef.current) {
      resizeObserver.observe(imageContainerRef.current);
    }
    if (imageRef.current) {
      resizeObserver.observe(imageRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, []);

  // Wheel zoom with smooth scaling
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = -e.deltaY;
    const factor = delta > 0 ? 1.08 : 0.92; // Smoother zoom increments
    let newZoom = zoom * factor;
    
    // Clamp zoom between 1x and 5x
    newZoom = Math.min(5, Math.max(1, newZoom));
    
    // Reset pan when zoom returns to 1
    if (newZoom === 1) {
      setPan({ x: 0, y: 0 });
    }
    
    setZoom(newZoom);
  };

  // Calculate pan boundaries based on image and container size
  const getPanBoundaries = () => {
    const container = imageContainerRef.current;
    const img = imageRef.current;
    if (!container || !img) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    
    const containerRect = container.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    
    // Image dimensions after zoom
    const zoomedWidth = imgRect.width * zoom;
    const zoomedHeight = imgRect.height * zoom;
    
    // Allow image to move half its width/height outside the container
    const maxOffsetX = zoomedWidth / 2;
    const maxOffsetY = zoomedHeight / 2;
    
    // Calculate boundaries
    const minX = -(zoomedWidth - containerRect.width) - maxOffsetX;
    const maxX = maxOffsetX;
    const minY = -(zoomedHeight - containerRect.height) - maxOffsetY;
    const maxY = maxOffsetY;
    
    return { minX, maxX, minY, maxY };
  };

  // Constrain pan within boundaries
  const constrainPan = (newPan) => {
    const { minX, maxX, minY, maxY } = getPanBoundaries();
    return {
      x: Math.max(minX, Math.min(maxX, newPan.x)),
      y: Math.max(minY, Math.min(maxY, newPan.y))
    };
  };

  // Mouse/touch pan - works on entire container
  const handleMouseDown = (e) => {
    // Only pan if zoomed in
    if (zoom > 1) {
      setIsPanning(true);
      panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      e.preventDefault();
    }
  };
  
  const handleMouseMove = (e) => {
    if (!isPanning) return;
    const newPan = { 
      x: e.clientX - panStart.current.x, 
      y: e.clientY - panStart.current.y 
    };
    setPan(constrainPan(newPan));
  };
  
  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Resize handlers
  const handleResizeStart = (e) => {
    setIsResizing(true);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = leftPanelWidth;
    e.preventDefault();
  };

  // Add/remove resize listeners
  useEffect(() => {
    if (!isResizing) return;
    
    const handleMove = (e) => {
      const container = document.querySelector('.chat-window-container');
      if (!container) return;
      
      const containerWidth = container.offsetWidth;
      const deltaX = e.clientX - resizeStartX.current;
      const deltaPercent = (deltaX / containerWidth) * 100;
      const newWidth = resizeStartWidth.current + deltaPercent;
      
      // Limit between 30% and 70%
      const clampedWidth = Math.max(30, Math.min(70, newWidth));
      setLeftPanelWidth(clampedWidth);
    };

    const handleEnd = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
    };
  }, [isResizing]);

  const handleSend = () => {
    if (query.trim() && canSend && !isGenerating && onSendMessage) {
      onSendMessage(query);
      setQuery('');
      // Clear any previously selected overlay until new response arrives
      setSelectedIndex(null);
      setHighlightIndex(null);
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      // Scroll to bottom immediately after sending
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e) => {
    setQuery(e.target.value);
    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'; // Max 200px height
  };

  // Find latest message with bounding boxes
  const latestBoxes = useMemo(() => {
    if (!Array.isArray(chatHistory)) return [];
    for (let i = chatHistory.length - 1; i >= 0; i--) {
      const b = chatHistory[i]?.bounding_boxes;
      if (Array.isArray(b) && b.length > 0) return b;
    }
    return [];
  }, [chatHistory]);

  const scaledBoxes = useMemo(() => {
    const { w: natW, h: natH } = naturalSize;
    const { w: dispW, h: dispH } = displaySize;
    if (!natW || !natH || !dispW || !dispH) return [];
    const scaleX = dispW / natW;
    const scaleY = dispH / natH;

    const sourceBoxes = selectedIndex != null
      ? chatHistory[selectedIndex]?.bounding_boxes || []
      : [];

    return sourceBoxes
      .map((box) => {
        if (Array.isArray(box)) {
          // New format: [x1, y1, x2, y2, x3, y3, x4, y4] - 4 corner points
          if (box.length === 8) {
            let [x1, y1, x2, y2, x3, y3, x4, y4] = box;
            
            // If normalized (<=1), convert to pixels
            if (x1 <= 1 && y1 <= 1 && x2 <= 1 && y2 <= 1) {
              x1 *= natW; y1 *= natH;
              x2 *= natW; y2 *= natH;
              x3 *= natW; y3 *= natH;
              x4 *= natW; y4 *= natH;
            }
            
            // Scale to display coordinates
            const points = [
              { x: x1 * scaleX, y: y1 * scaleY },
              { x: x2 * scaleX, y: y2 * scaleY },
              { x: x3 * scaleX, y: y3 * scaleY },
              { x: x4 * scaleX, y: y4 * scaleY }
            ];
            
            return { type: 'polygon', points };
          }
          // Old format: [cx, cy, w, h, angle] - center-based with rotation
          else if (box.length === 5) {
            let [cx, cy, bw, bh, angle] = box;
            // If normalized (<=1), convert to pixels
            if (cx <= 1 && cy <= 1 && bw <= 1 && bh <= 1) {
              cx *= natW; cy *= natH; bw *= natW; bh *= natH;
            }
            const x = (cx - bw / 2) * scaleX;
            const y = (cy - bh / 2) * scaleY;
            const w = bw * scaleX;
            const h = bh * scaleY;
            const rcx = cx * scaleX;
            const rcy = cy * scaleY;
            return { type: 'rect', x, y, w, h, angle: angle || 0, cx: rcx, cy: rcy };
          }
        } else if (box && typeof box === 'object') {
          // Object format (backward compatibility)
          const angle = box.angle || box.rotation || 0;
          let cx, cy, bw, bh;
          if (box.cx != null && box.cy != null) {
            cx = box.cx; cy = box.cy; bw = box.width; bh = box.height;
          } else if (box.x != null && box.y != null) {
            bw = box.width; bh = box.height;
            cx = box.x + bw / 2; cy = box.y + bh / 2;
          } else {
            return null;
          }
          if (cx <= 1 && cy <= 1 && bw <= 1 && bh <= 1) {
            cx *= natW; cy *= natH; bw *= natW; bh *= natH;
          }
          const x = (cx - bw / 2) * scaleX;
          const y = (cy - bh / 2) * scaleY;
          const w = bw * scaleX;
          const h = bh * scaleY;
          const rcx = cx * scaleX;
          const rcy = cy * scaleY;
          return { type: 'rect', x, y, w, h, angle, cx: rcx, cy: rcy };
        }
        return null;
      })
      .filter(Boolean);
  }, [selectedIndex, chatHistory, naturalSize, displaySize]);

  const handleSelectMessage = (idx) => {
    setSelectedIndex(idx);
    setHighlightIndex(idx);
    // Scroll associated response into view
    const el = responseRefs.current[idx];
    if (el && el.scrollIntoView) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    }
    // Clear highlight shortly
    setTimeout(() => setHighlightIndex((h) => (h === idx ? null : h)), 900);
  };

  const handleDownloadOriginal = async () => {
    // If boxes are currently displayed, download merged; otherwise download original
    if (selectedIndex != null && scaledBoxes.length > 0) {
      await handleDownloadWithBoxes(selectedIndex);
    } else {
      try {
        const a = document.createElement('a');
        a.href = imageUrl;
        a.download = 'image.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (e) {
        console.error('Download failed', e);
      }
    }
  };

  const toNaturalBoxes = (boxes, natW, natH) => {
    return (boxes || []).map((box) => {
      if (Array.isArray(box)) {
        // New format: [x1, y1, x2, y2, x3, y3, x4, y4]
        if (box.length === 8) {
          let [x1, y1, x2, y2, x3, y3, x4, y4] = box;
          // If normalized, convert to pixels
          if (x1 <= 1 && y1 <= 1 && x2 <= 1 && y2 <= 1) {
            x1 *= natW; y1 *= natH;
            x2 *= natW; y2 *= natH;
            x3 *= natW; y3 *= natH;
            x4 *= natW; y4 *= natH;
          }
          return { 
            type: 'polygon', 
            points: [
              { x: x1, y: y1 },
              { x: x2, y: y2 },
              { x: x3, y: y3 },
              { x: x4, y: y4 }
            ]
          };
        }
        // Old format: [cx, cy, w, h, angle]
        else if (box.length === 5) {
          let [cx, cy, bw, bh, angle] = box;
          if (cx <= 1 && cy <= 1 && bw <= 1 && bh <= 1) {
            cx *= natW; cy *= natH; bw *= natW; bh *= natH;
          }
          return { type: 'rect', cx, cy, w: bw, h: bh, angle: angle || 0 };
        }
      } else if (box && typeof box === 'object') {
        const angle = box.angle || box.rotation || 0;
        let cx, cy, bw, bh;
        if (box.cx != null && box.cy != null) {
          cx = box.cx; cy = box.cy; bw = box.width; bh = box.height;
        } else if (box.x != null && box.y != null) {
          bw = box.width; bh = box.height; cx = box.x + bw / 2; cy = box.y + bh / 2;
        } else {
          return null;
        }
        if (cx <= 1 && cy <= 1 && bw <= 1 && bh <= 1) {
          cx *= natW; cy *= natH; bw *= natW; bh *= natH;
        }
        return { type: 'rect', cx, cy, w: bw, h: bh, angle };
      }
      return null;
    }).filter(Boolean);
  };

  const handleDownloadWithBoxes = async (idx) => {
    try {
      const msg = chatHistory[idx];
      if (!msg || !msg.bounding_boxes || !imageUrl) return;
      // Load image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const loaded = await new Promise((resolve, reject) => {
        img.onload = () => resolve(true);
        img.onerror = reject;
        img.src = imageUrl;
      });
      if (!loaded) return;
      const natW = img.naturalWidth || img.width;
      const natH = img.naturalHeight || img.height;
      const canvas = document.createElement('canvas');
      canvas.width = natW; canvas.height = natH;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, natW, natH);
      const boxes = toNaturalBoxes(msg.bounding_boxes, natW, natH);
      ctx.lineWidth = Math.max(2.5, Math.round(natW / 512));
      ctx.strokeStyle = '#06b6d4';
      ctx.fillStyle = 'rgba(6,182,212,0.12)';
      boxes.forEach((box) => {
        ctx.save();
        ctx.beginPath();
        
        if (box.type === 'polygon') {
          // Draw polygon for new 8-point format
          ctx.moveTo(box.points[0].x, box.points[0].y);
          for (let i = 1; i < box.points.length; i++) {
            ctx.lineTo(box.points[i].x, box.points[i].y);
          }
          ctx.closePath();
        } else {
          // Draw rotated rectangle for old format
          const { cx, cy, w, h, angle } = box;
          ctx.translate(cx, cy);
          ctx.rotate((angle || 0) * Math.PI / 180);
          ctx.rect(-w / 2, -h / 2, w, h);
        }
        
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'image_with_boxes.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (e) {
      console.error('Download with boxes failed', e);
      alert('Unable to download merged image due to cross-origin restrictions.');
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden chat-window-container">
      {/* Left Panel - Image Display */}
      <div 
        className={`flex-shrink-0 flex flex-col ${bgColor} overflow-hidden`}
        style={{ width: `${leftPanelWidth}%` }}
      >
        <div 
          ref={imageContainerRef} 
          className="flex-1 relative p-4 overflow-hidden"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default' }}
        >
          <div className="absolute inset-4 flex items-center justify-center pointer-events-none">
            <img 
              ref={imageRef}
              src={imageUrl} 
              alt="Remote Sensing" 
              className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              onLoad={updateImageMetrics}
              onError={updateImageMetrics}
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transition: isPanning ? 'none' : 'transform 100ms ease-out',
                pointerEvents: 'none'
              }}
            />
          </div>
          {/* SVG Overlay for bounding boxes */}
          {displaySize.w > 0 && displaySize.h > 0 && scaledBoxes.length > 0 && (
            <svg
              className="pointer-events-none absolute"
              style={{
                left: imageOffset.x,
                top: imageOffset.y,
                width: displaySize.w,
                height: displaySize.h,
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
                transition: isPanning ? 'none' : 'transform 100ms ease-out',
              }}
              viewBox={`0 0 ${displaySize.w} ${displaySize.h}`}
            >
              {scaledBoxes.map((b, i) => {
                if (b.type === 'polygon') {
                  // New 8-point format - draw polygon
                  const pointsStr = b.points.map(p => `${p.x},${p.y}`).join(' ');
                  return (
                    <polygon
                      key={i}
                      points={pointsStr}
                      fill="rgba(59,130,246,0.08)"
                      stroke="rgba(96,165,250,0.85)"
                      strokeWidth="2"
                    />
                  );
                } else {
                  // Old format - draw rotated rectangle
                  return (
                    <g key={i} transform={`rotate(${b.angle}, ${b.cx}, ${b.cy})`}>
                      <rect
                        x={b.x}
                        y={b.y}
                        width={b.w}
                        height={b.h}
                        fill="rgba(59,130,246,0.08)"
                        stroke="rgba(96,165,250,0.85)"
                        strokeWidth="2"
                        rx="4"
                      />
                    </g>
                  );
                }
              })}
            </svg>
          )}
          {/* Action buttons */}
          <div className="absolute right-4 bottom-4 z-20 flex flex-col gap-2">
            {/* Share button - only show if onShareClick is provided */}
            {onShareClick && (
              <button
                onClick={onShareClick}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-black/40 hover:bg-black/50 text-white text-xs cursor-pointer backdrop-blur-sm"
                title="Share chat"
              >
                <RiShareForwardLine className="text-sm"/>
                Share
              </button>
            )}
            {/* Download image button */}
            <button
              onClick={handleDownloadOriginal}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-black/40 hover:bg-black/50 text-white text-xs cursor-pointer backdrop-blur-sm"
              title="Download image"
            >
              <IoDownload className="text-sm"/>
              Download
            </button>
          </div>
        </div>
        <div className={`flex-shrink-0 px-4 py-3 text-center`}>
          <p className={`text-sm ${secondaryTextColor} truncate`}>
            {chatTitle || 'Remote Sensing Image'}
          </p>
        </div>
      </div>

      {/* Resizable Divider */}
      <div
        className={`w-1 cursor-col-resize flex-shrink-0 relative group ${
          isResizing ? 'bg-slate-500' : (theme === 'dark' ? 'bg-neutral-700 hover:bg-slate-500' : 'bg-gray-300 hover:bg-slate-400')
        } transition-colors`}
        onMouseDown={handleResizeStart}
      >
        <div className={`absolute inset-y-0 -left-1 -right-1 ${isResizing ? 'cursor-col-resize' : ''}`}></div>
      </div>

      {/* Right Panel - Chat Messages */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Chat Messages Area - Scrollable */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4 min-h-0 custom-scrollbar"
        >
          <div className="max-w-4xl mx-auto space-y-6">
            {chatHistory.length === 0 && (
              <div className={`text-center ${secondaryTextColor} py-8`}>
                <div className="text-sm font-medium mb-1">Start a Conversation</div>
                <div className="text-xs opacity-75">Ask questions about the satellite image</div>
              </div>
            )}
            
            {chatHistory.map((chat, index) => (
              <div key={index} className="space-y-4">
                {/* User Query - Gemini style with bubble */}
                <div className="flex justify-end">
                  <button
                    className={`max-w-[75%] text-left px-5 py-3.5 rounded-3xl rounded-tr-md cursor-pointer transition-all duration-200 ${
                      selectedIndex === index 
                        ? (theme === "dark" ? "bg-blue-600/90" : "bg-blue-600")
                        : (theme === "dark" ? "bg-slate-700/90 hover:bg-slate-700" : "bg-slate-100 hover:bg-slate-200")
                    }`}
                    onClick={() => handleSelectMessage(index)}
                  >
                    <div className={`text-base font-normal leading-relaxed ${
                      selectedIndex === index 
                        ? "text-white"
                        : (theme === "dark" ? "text-slate-100" : "text-gray-900")
                    }`}>{chat.query}</div>
                  </button>
                </div>
                
                {/* AI Response - Without icon */}
                <div className="flex items-start">
                  {/* Response Content */}
                  <div
                    ref={(el) => (responseRefs.current[index] = el)}
                    onClick={() => handleSelectMessage(index)}
                    className={`max-w-[85%] cursor-pointer transition-all duration-200 rounded-2xl rounded-tl-md p-4 ${
                      selectedIndex === index 
                        ? (theme === "dark" ? "bg-slate-800/60" : "bg-blue-50/60")
                        : (theme === "dark" ? "bg-slate-800/30 hover:bg-slate-800/40" : "bg-slate-50/50 hover:bg-slate-100/60")
                    } ${highlightIndex === index ? 'pulse-highlight' : ''}`}
                    title="Click to view this conversation"
                  >
                    {/* Show loading state for the last message while generating */}
                    {isGenerating && index === chatHistory.length - 1 && (chat.response === '...' || chat.isStreaming) ? (
                      <div>
                        {/* Thinking Section - Always visible when reasoning exists */}
                        {chat.reasoning ? (
                          <div className={`mb-3`}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedThinking(prev => ({ ...prev, [index]: !prev[index] }));
                              }}
                              className={`flex items-center gap-2.5 py-1 transition-colors cursor-pointer`}
                            >
                              {/* Show animated dots only when reasoning is actively streaming (no response yet) */}
                              {(!chat.response || chat.response === '...') ? (
                                <>
                                  <div className="flex gap-1">
                                    <span className={`w-2 h-2 rounded-full animate-bounce ${theme === 'dark' ? 'bg-blue-400' : 'bg-blue-500'}`} style={{ animationDelay: '0ms' }}></span>
                                    <span className={`w-2 h-2 rounded-full animate-bounce ${theme === 'dark' ? 'bg-blue-400' : 'bg-blue-500'}`} style={{ animationDelay: '150ms' }}></span>
                                    <span className={`w-2 h-2 rounded-full animate-bounce ${theme === 'dark' ? 'bg-blue-400' : 'bg-blue-500'}`} style={{ animationDelay: '300ms' }}></span>
                                  </div>
                                  <span className={`text-base font-bold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {getThinkingLabel(chat.reasoning)}
                                  </span>
                                </>
                              ) : (
                                // When response is streaming, show "Thought for Xs" format
                                <>
                                  <IoChevronDown className="w-3.5 h-3.5" />
                                  <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                    Thought for {chat.reasoning_time ? `${Math.round(parseFloat(chat.reasoning_time))}s` : '...'}
                                  </span>
                                </>
                              )}
                            </button>
                            {expandedThinking[index] && chat.reasoning && (
                              <div className={`mt-2 pl-3 border-l-2 ${theme === 'dark' ? 'border-gray-600' : 'border-gray-300'} text-base ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} leading-relaxed`}>
                                {formatReasoning(chat.reasoning)}
                                {(!chat.response || chat.response === '...') && (
                                  <span className={`inline-block w-0.5 h-4 ml-1 animate-pulse ${theme === 'dark' ? 'bg-blue-400' : 'bg-blue-500'}`}></span>
                                )}
                              </div>
                            )}
                          </div>
                        ) : null}
                        
                        {/* Solution being streamed */}
                        {chat.response && chat.response !== '...' ? (
                          <div className={`${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'} whitespace-pre-wrap text-base leading-relaxed`}>
                            {chat.response}
                            <span className={`inline-block w-0.5 h-5 ml-1 animate-pulse ${theme === 'dark' ? 'bg-blue-400' : 'bg-blue-500'}`}></span>
                          </div>
                        ) : !chat.reasoning ? (
                          // For grounding queries - simple clean loading
                          <div className="flex items-center gap-2.5 py-1">
                            <div className="flex gap-1">
                              <div className={`w-2 h-2 rounded-full animate-pulse ${theme === 'dark' ? 'bg-blue-400' : 'bg-blue-500'}`} style={{ animationDelay: '0ms' }}></div>
                              <div className={`w-2 h-2 rounded-full animate-pulse ${theme === 'dark' ? 'bg-blue-400' : 'bg-blue-500'}`} style={{ animationDelay: '200ms' }}></div>
                              <div className={`w-2 h-2 rounded-full animate-pulse ${theme === 'dark' ? 'bg-blue-400' : 'bg-blue-500'}`} style={{ animationDelay: '400ms' }}></div>
                            </div>
                            <span className={`text-base font-normal ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                              {chat.isGrounding ? 'Localizing regions...' : 'Analyzing image...'}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div>
                        {/* Completed Reasoning Section - Collapsible */}
                        {chat.reasoning && (
                          <div className={`mb-3`}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedThinking(prev => ({ ...prev, [index]: !prev[index] }));
                              }}
                              className={`flex items-center gap-2 px-2.5 py-1 rounded-md text-sm font-normal transition-all ${
                                theme === 'dark' 
                                  ? 'text-gray-400 hover:text-gray-300 hover:bg-slate-700/30' 
                                  : 'text-gray-600 hover:text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              {expandedThinking[index] ? (
                                <>
                                  <IoChevronUp className="w-3.5 h-3.5" />
                                  <span>Hide reasoning</span>
                                </>
                              ) : (
                                <>
                                  <IoChevronDown className="w-3.5 h-3.5" />
                                  <span>Thought for {chat.reasoning_time ? `${Math.round(parseFloat(chat.reasoning_time))} seconds` : (chat.response_time ? `${Math.round(parseFloat(chat.response_time))} seconds` : '...')}</span>
                                </>
                              )}
                            </button>
                            {expandedThinking[index] && (
                              <div className={`mt-2 pl-3 border-l-2 ${theme === 'dark' ? 'border-gray-600' : 'border-gray-300'} text-base ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} leading-relaxed`}>
                                {formatReasoning(chat.reasoning)}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Final Response */}
                        <div className={`${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'} whitespace-pre-wrap text-base leading-relaxed`}>{chat.response}</div>
                        <div className="flex items-center gap-3 mt-3">
                          {chat.bounding_boxes && chat.bounding_boxes.length > 0 && (
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
                              <IoLocationSharp className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`} />
                              <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                {chat.bounding_boxes.length} region{chat.bounding_boxes.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          )}
                          {/* Only show time badge if there's no reasoning section */}
                          {chat.response_time && !chat.reasoning && (
                            <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} flex items-center gap-1.5`}>
                              <AiOutlineClockCircle className="w-4 h-4" />
                              {Math.round(parseFloat(chat.response_time))}s
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Input Area - Fixed at Bottom - Hide if onSendMessage is null (view only) */}
        {onSendMessage && (
          <div className={`flex-shrink-0 px-4 pb-3 pt-2.5 ${theme === 'dark' ? 'bg-neutral-900/80' : 'bg-gray-50/80'} backdrop-blur-sm`}>
            <div className="max-w-3xl mx-auto flex gap-2 w-full items-end">
              <textarea
                ref={textareaRef}
                value={query}
                onChange={handleTextareaChange}
                onKeyPress={handleKeyPress}
                placeholder={canSend ? "Ask a question about this image..." : "Please wait..."}
                disabled={!canSend || isGenerating}
                rows={1}
                className={`flex-1 px-3.5 py-2.5 rounded-lg text-sm ${inputBg} border ${borderColor} ${textColor} focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all resize-none overflow-hidden`}
                style={{ minHeight: '40px', maxHeight: '140px' }}
              />
              <button
                onClick={handleSend}
                disabled={!query.trim() || !canSend || isGenerating}
                className={`px-4 py-2.5 rounded-lg transition-all flex items-center justify-center flex-shrink-0 ${
                  canSend && query.trim() && !isGenerating
                    ? (theme === 'dark' ? 'bg-slate-600 hover:bg-slate-700 active:bg-slate-800 cursor-pointer' : 'bg-slate-700 hover:bg-slate-800 active:bg-slate-900 cursor-pointer')
                    : 'bg-gray-400 cursor-not-allowed opacity-50'
                }`}
                title="Send message"
              >
                <IoSend className="text-white text-lg" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
