import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { IoSend, IoDownload, IoChevronDown, IoChevronUp, IoLocationSharp, IoChatbubbleEllipses, IoCopyOutline, IoCheckmark } from "react-icons/io5";
import { RiShareForwardLine, RiRobot2Fill } from "react-icons/ri";
import { BiLoaderAlt } from "react-icons/bi";
import { AiOutlineClockCircle } from "react-icons/ai";
import { BsChatDotsFill } from "react-icons/bs";
import { HiSparkles } from "react-icons/hi2";

const sampleQuestions = [
  "Identify water bodies in this image",
  "What is the land cover distribution?",
  "Show me agricultural regions",
  "Detect urban areas",
  "Find forest coverage",
  "Identify roads and infrastructure",
];

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
  const marqueeRef = useRef(null);
  const marqueeContentRef = useRef(null);
  const marqueeScrollPos = useRef(0);
  const [isHovering, setIsHovering] = useState(false);

  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [highlightIndex, setHighlightIndex] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [zoom, setZoom] = useState(1); 
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  const [leftPanelWidth, setLeftPanelWidth] = useState(55); 
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);

  const handleCopy = async (text, index) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const bgColor = theme === "dark" ? "bg-neutral-900" : "bg-gray-100";
  const textColor = theme === "dark" ? "text-slate-200" : "text-gray-800";
  const secondaryTextColor = theme === "dark" ? "text-slate-400" : "text-gray-600";
  const messageBg = theme === "dark" ? "bg-neutral-800" : "bg-white";
  const userMessageBg = theme === "dark" ? "bg-blue-900" : "bg-blue-200";
  const inputBg = theme === "dark" ? "bg-neutral-800" : "bg-gray-50";
  const borderColor = theme === "dark" ? "border-slate-600" : "border-gray-300";

  const formatTime = (seconds) => {
    const totalSeconds = Math.round(parseFloat(seconds));
    if (totalSeconds >= 60) {
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    }
    return `${totalSeconds}s`;
  };

  const getThinkingLabel = (reasoningText) => {
    if (!reasoningText) return "Thinking...";

    const lines = reasoningText.split('\n');

    let targetLine = "";
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        if (/^[\*\-•]|\d+\./.test(line)) {
            targetLine = line;
            break;
        }
    }

    if (!targetLine) return "Thinking...";

    const colonIndex = targetLine.indexOf(':');
    
    if (colonIndex !== -1) {
      let heading = targetLine.substring(0, colonIndex);

      heading = heading.replace(/^[\*\-•\d\.]+\s*/, '');
      
      heading = heading.replace(/[\*_]{1,2}/g, '');

      return heading.trim();
    }

    let pendingHeading = targetLine.replace(/^[\*\-•\d\.]+\s*/, '').replace(/[\*_]{1,2}/g, '');
    return pendingHeading.trim() || "Thinking...";
  };

  const formatReasoning = (reasoningText) => {
    if (!reasoningText) return null;
    
    const lines = reasoningText.split('\n').filter(line => line.trim().length > 0);
    
    return lines.map((line, idx) => {
      let cleanLine = line.trim().replace(/^[\*\•\-]\s*/, '').replace(/^\d+\.\s*/, '');
      
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
        return (
          <div key={idx} className="mb-1">
            {cleanLine}
          </div>
        );
      }
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setCanSend(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, [chatId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  useEffect(() => {
    if (!isGenerating && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isGenerating]);

  useEffect(() => {
    if (!Array.isArray(chatHistory) || chatHistory.length === 0) {
      setSelectedIndex(null);
      return;
    }
    const lastIdx = chatHistory.length - 1;
    setSelectedIndex(lastIdx);
  }, [chatHistory]);

  const updateImageMetrics = useCallback(() => {
    const img = imageRef.current;
    const container = imageContainerRef.current;
    if (!img || !container) return;

    const natW = img.naturalWidth || 0;
    const natH = img.naturalHeight || 0;
    setNaturalSize({ w: natW, h: natH });

    if (!natW || !natH) return;

    const dispW = img.offsetWidth;
    const dispH = img.offsetHeight;
    setDisplaySize({ w: dispW, h: dispH });

    const contRect = container.getBoundingClientRect();
    const inset = 16; 
    const wrapperW = contRect.width - (inset * 2);
    const wrapperH = contRect.height - (inset * 2);

    const offX = Math.round(inset + (wrapperW - dispW) / 2);
    const offY = Math.round(inset + (wrapperH - dispH) / 2);
    setImageOffset({ x: offX, y: offY });
  }, []);

  useEffect(() => {
    const handleResize = () => updateImageMetrics();
    window.addEventListener('resize', handleResize);

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
  }, [updateImageMetrics]);

  useEffect(() => {
    if (chatHistory.length > 0) return; 
    
    const marquee = marqueeRef.current;
    const content = marqueeContentRef.current;
    if (!marquee || !content) return;

    let animationId;
    const speed = 0.2; 

    const animate = () => {
      if (!isHovering && marquee && content) {
        marqueeScrollPos.current += speed;
        const halfWidth = content.scrollWidth / 2;
        
        if (marqueeScrollPos.current >= halfWidth) {
          marqueeScrollPos.current = 0;
        }
        
        marquee.scrollLeft = marqueeScrollPos.current;
      }
      animationId = requestAnimationFrame(animate);
    };

    const handleScroll = () => {
      if (!content) return;
      const halfWidth = content.scrollWidth / 2;
      
      if (marquee.scrollLeft >= halfWidth) {
        marquee.scrollLeft = 0;
        marqueeScrollPos.current = 0;
      } else if (marquee.scrollLeft <= 0 && marqueeScrollPos.current > 0) {
        marquee.scrollLeft = halfWidth - 1;
        marqueeScrollPos.current = halfWidth - 1;
      }
      marqueeScrollPos.current = marquee.scrollLeft;
    };

    marquee.addEventListener('scroll', handleScroll);
    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
      marquee.removeEventListener('scroll', handleScroll);
    };
  }, [chatHistory.length, isHovering]);

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = -e.deltaY;
    const factor = delta > 0 ? 1.08 : 0.92; 
    let newZoom = zoom * factor;
    
    newZoom = Math.min(5, Math.max(1, newZoom));
    
    if (newZoom === 1) {
      setPan({ x: 0, y: 0 });
    }
    
    setZoom(newZoom);
  };

  const getPanBoundaries = () => {
    const container = imageContainerRef.current;
    const img = imageRef.current;
    if (!container || !img) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    
    const containerRect = container.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    
    const zoomedWidth = imgRect.width * zoom;
    const zoomedHeight = imgRect.height * zoom;

    const maxOffsetX = zoomedWidth / 2;
    const maxOffsetY = zoomedHeight / 2;
    
    const minX = -(zoomedWidth - containerRect.width) - maxOffsetX;
    const maxX = maxOffsetX;
    const minY = -(zoomedHeight - containerRect.height) - maxOffsetY;
    const maxY = maxOffsetY;
    
    return { minX, maxX, minY, maxY };
  };

  const constrainPan = (newPan) => {
    const { minX, maxX, minY, maxY } = getPanBoundaries();
    return {
      x: Math.max(minX, Math.min(maxX, newPan.x)),
      y: Math.max(minY, Math.min(maxY, newPan.y))
    };
  };

  const handleMouseDown = (e) => {
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

  const handleResizeStart = (e) => {
    setIsResizing(true);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = leftPanelWidth;
    e.preventDefault();
  };

  useEffect(() => {
    if (!isResizing) return;
    
    const handleMove = (e) => {
      const container = document.querySelector('.chat-window-container');
      if (!container) return;
      
      const containerWidth = container.offsetWidth;
      const deltaX = e.clientX - resizeStartX.current;
      const deltaPercent = (deltaX / containerWidth) * 100;
      const newWidth = resizeStartWidth.current + deltaPercent;
      
      const clampedWidth = Math.max(30, Math.min(70, newWidth));
      setLeftPanelWidth(clampedWidth);
    };

    const handleEnd = () => {
      setIsResizing(false);
      updateImageMetrics();
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
    };
  }, [isResizing, updateImageMetrics]);

  const handleSend = () => {
    if (query.trim() && canSend && !isGenerating && onSendMessage) {
      onSendMessage(query);
      setQuery('');
      setSelectedIndex(null);
      setHighlightIndex(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
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
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'; 
  };

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
          if (box.length === 8) {
            let [x1, y1, x2, y2, x3, y3, x4, y4] = box;
            
            if (x1 <= 1 && y1 <= 1 && x2 <= 1 && y2 <= 1) {
              x1 *= natW; y1 *= natH;
              x2 *= natW; y2 *= natH;
              x3 *= natW; y3 *= natH;
              x4 *= natW; y4 *= natH;
            }
            
            const points = [
              { x: x1 * scaleX, y: y1 * scaleY },
              { x: x2 * scaleX, y: y2 * scaleY },
              { x: x3 * scaleX, y: y3 * scaleY },
              { x: x4 * scaleX, y: y4 * scaleY }
            ];
            
            return { type: 'polygon', points };
          }
          else if (box.length === 5) {
            let [cx, cy, bw, bh, angle] = box;
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
    const el = responseRefs.current[idx];
    if (el && el.scrollIntoView) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    }
    setTimeout(() => setHighlightIndex((h) => (h === idx ? null : h)), 900);
  };

  const handleDownloadOriginal = async () => {
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
        if (box.length === 8) {
          let [x1, y1, x2, y2, x3, y3, x4, y4] = box;
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
          ctx.moveTo(box.points[0].x, box.points[0].y);
          for (let i = 1; i < box.points.length; i++) {
            ctx.lineTo(box.points[i].x, box.points[i].y);
          }
          ctx.closePath();
        } else {
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
          <div className="absolute right-4 bottom-4 z-20 flex flex-col gap-2">
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

      <div
        className={`w-1 cursor-col-resize flex-shrink-0 relative group ${
          isResizing ? 'bg-slate-500' : (theme === 'dark' ? 'bg-neutral-700 hover:bg-slate-500' : 'bg-gray-300 hover:bg-slate-400')
        } transition-colors`}
        onMouseDown={handleResizeStart}
      >
        <div className={`absolute inset-y-0 -left-1 -right-1 ${isResizing ? 'cursor-col-resize' : ''}`}></div>
      </div>

      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
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
                <div className="flex justify-end items-center gap-2 group">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(chat.query, `query-${index}`);
                    }}
                    className={`p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-all duration-100 ${
                      theme === 'dark'
                        ? 'hover:bg-slate-700/70 text-slate-400 hover:text-slate-200'
                        : 'hover:bg-gray-200 text-gray-400 hover:text-gray-600'
                    }`}
                    title={copiedIndex === `query-${index}` ? 'Copied!' : 'Copy query'}
                  >
                    {copiedIndex === `query-${index}` ? (
                      <IoCheckmark className="w-4 h-4 text-green-500" />
                    ) : (
                      <IoCopyOutline className="w-4 h-4" />
                    )}
                  </button>
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
                
                <div className="flex items-start">
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
                    {isGenerating && index === chatHistory.length - 1 && (chat.response === '...' || chat.isStreaming) ? (
                      <div>
                        {chat.reasoning ? (
                          <div className={`mb-3`}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedThinking(prev => ({ ...prev, [index]: !prev[index] }));
                              }}
                              className={`flex items-center gap-2.5 py-1 transition-colors cursor-pointer`}
                            >
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
                                <>
                                  <IoChevronDown className="w-3.5 h-3.5" />
                                  <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                    Thought for {chat.reasoning_time ? formatTime(chat.reasoning_time) : '...'}
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
                        
                        {chat.response && chat.response !== '...' ? (
                          <div className={`${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'} whitespace-pre-wrap text-base leading-relaxed`}>
                            {chat.response}
                            <span className={`inline-block w-0.5 h-5 ml-1 animate-pulse ${theme === 'dark' ? 'bg-blue-400' : 'bg-blue-500'}`}></span>
                          </div>
                        ) : !chat.reasoning ? (
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
                                  <span>Thought for {chat.reasoning_time ? formatTime(chat.reasoning_time) : (chat.response_time ? formatTime(chat.response_time) : '...')}</span>
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
                          {chat.response_time && (
                            <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} flex items-center gap-1.5`}>
                              <AiOutlineClockCircle className="w-4 h-4" />
                              {formatTime(chat.response_time)}
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

        {onSendMessage && (
          <div className={`flex-shrink-0 px-4 pb-3 pt-2.5 ${theme === 'dark' ? 'bg-neutral-900/80' : 'bg-gray-50/80'} backdrop-blur-sm`}>
            {chatHistory.length === 0 && (
              <div className="max-w-3xl mx-auto mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <HiSparkles className={`w-4 h-4 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-500'}`} />
                  <span className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                    Try asking
                  </span>
                </div>
                <div 
                  ref={marqueeRef}
                  className="overflow-x-auto"
                  style={{ 
                    scrollbarWidth: 'none', 
                    msOverflowStyle: 'none',
                  }}
                  onMouseEnter={() => setIsHovering(true)}
                  onMouseLeave={() => setIsHovering(false)}
                >
                  <style>{`
                    .marquee-container::-webkit-scrollbar {
                      display: none;
                    }
                  `}</style>
                  <div ref={marqueeContentRef} className="flex gap-3 marquee-container" style={{ width: 'max-content' }}>
                    {[...sampleQuestions, ...sampleQuestions].map((question, idx) => (
                      <button
                        key={idx}
                        onClick={() => setQuery(question)}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border whitespace-nowrap ${
                          theme === 'dark' 
                            ? 'bg-slate-800/60 hover:bg-slate-700 border-slate-600/50 text-slate-300 hover:text-white hover:border-slate-500' 
                            : 'bg-white hover:bg-gray-100 border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300'
                        } hover:scale-[1.02] active:scale-[0.98]`}
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
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
