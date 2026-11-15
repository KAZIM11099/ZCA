import { useRef } from 'react';
import { customColors, makeDesignPreview } from '../lib/customDesign.js';

function getGarmentImage(garmentType, side) {
  return `/garment-models/${garmentType}-${side === 'back' ? 'back' : 'front'}.png`;
}

function GarmentSide({ layout, side, onPositionChange }) {
  const color = customColors.find((entry) => entry.name === layout.color) || customColors[0];
  const modelImage = getGarmentImage(layout.garmentType, side);
  const previewRef = useRef(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const resizeRef = useRef(null);
  const isHoodie = layout.garmentType === 'hoodie';
  const isDropShoulder = layout.garmentType === 'drop-shoulder';
  const isSweatshirt = layout.garmentType === 'sweatshirt';
  const isLongSleeve = layout.garmentType === 'long-sleeve';
  const textPlacement = layout.textPlacement || (layout.placement === 'back' ? 'back' : 'front');
  const imagePlacement = layout.imagePlacement || 'back';
  const showText = layout.text && (textPlacement === side || textPlacement === 'both');
  const showImage = layout.imageData && (imagePlacement === side || imagePlacement === 'both');
  const textColor = ['Black', 'Navy', 'Red', 'Blue'].includes(color.name) ? '#fff' : '#202020';
  const requestedTextSize = Number(layout.textSize);
  const textSize = Number.isFinite(requestedTextSize) ? Math.min(32, Math.max(12, requestedTextSize)) : 22;
  const textFillStyle = layout.textColorMode === 'gradient'
    ? {
        backgroundImage: `linear-gradient(${Number(layout.textGradientAngle) || 90}deg, ${layout.textGradientStart || '#F59E0B'}, ${layout.textGradientEnd || '#EF4444'})`,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
        WebkitTextFillColor: 'transparent',
      }
    : { color: layout.textColor || textColor };
  const imageScale = layout.imageSizeInches
    ? Math.min(2, Math.max(0.7, Number(layout.imageSizeInches) / 14))
    : Math.min(2, Math.max(0.5, Number(layout.imageScale) || 1));
  const textWidth = Number(layout.textWidthInches);
  const textPositionBase = layout.textPositions?.[side] || { x: 50, y: 47, width: 46, height: 14 };
  const textPosition = Number.isFinite(textWidth)
    ? { ...textPositionBase, width: Math.min(82, Math.max(28, textWidth * 10)) }
    : textPositionBase;
  const imagePosition = layout.imagePositions?.[side] || { x: 50, y: 43, width: 24 * imageScale, height: 24 * imageScale };
  const updatePosition = (field, position, event) => {
    if (!onPositionChange || (event.type === 'pointerdown' && event.button !== 0)) return;
    if (event.type === 'pointerdown') {
      event.preventDefault();
      const bounds = previewRef.current?.getBoundingClientRect();
      if (bounds?.width && bounds.height) {
        dragOffsetRef.current = {
          x: ((event.clientX - bounds.left) / bounds.width) * 100 - position.x,
          y: ((event.clientY - bounds.top) / bounds.height) * 100 - position.y,
        };
      }
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (event.type === 'pointerup' || event.type === 'pointercancel') {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      return;
    }
    if (event.type === 'keydown') {
      const step = event.shiftKey ? 5 : 1;
      const offsets = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      };
      const offset = offsets[event.key];
      if (!offset) return;
      event.preventDefault();
      onPositionChange(field, side, {
        ...position,
        x: Math.min(100 - position.width / 2, Math.max(position.width / 2, position.x + offset[0])),
        y: Math.min(100 - position.height / 2, Math.max(position.height / 2, position.y + offset[1])),
      });
      return;
    }
    if (event.type !== 'pointermove' || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const bounds = previewRef.current?.getBoundingClientRect();
    if (!bounds?.width || !bounds.height) return;
    onPositionChange(field, side, {
      ...position,
      x: Math.min(100 - position.width / 2, Math.max(position.width / 2, ((event.clientX - bounds.left) / bounds.width) * 100 - dragOffsetRef.current.x)),
      y: Math.min(100 - position.height / 2, Math.max(position.height / 2, ((event.clientY - bounds.top) / bounds.height) * 100 - dragOffsetRef.current.y)),
    });
  };
  const dragProps = (field, position, label) => onPositionChange ? {
    onPointerDown: (event) => updatePosition(field, position, event),
    onPointerMove: (event) => updatePosition(field, position, event),
    onPointerUp: (event) => updatePosition(field, position, event),
    onPointerCancel: (event) => updatePosition(field, position, event),
    onKeyDown: (event) => updatePosition(field, position, event),
    role: 'group',
    tabIndex: 0,
    'aria-label': `Move ${label}; drag to reposition or use arrow keys`,
    title: 'Drag to reposition; use arrow keys to fine-tune',
  } : {};
  const updateSize = (field, position, event) => {
    if (!onPositionChange || (event.type === 'pointerdown' && event.button !== 0)) return;
    if (event.type === 'pointerdown') {
      event.preventDefault();
      event.stopPropagation();
      const bounds = previewRef.current?.getBoundingClientRect();
      if (!bounds?.width || !bounds.height) return;
      resizeRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        bounds,
        position,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    if (event.type === 'pointerup' || event.type === 'pointercancel') {
      event.stopPropagation();
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      resizeRef.current = null;
      return;
    }
    if (event.type === 'keydown') {
      const step = event.shiftKey ? 5 : 1;
      const deltas = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      };
      const delta = deltas[event.key];
      if (!delta) return;
      event.preventDefault();
      event.stopPropagation();
      const width = Math.min(90, Math.max(5, position.width + delta[0]));
      const height = Math.min(80, Math.max(5, position.height + delta[1]));
      onPositionChange(field, side, {
        ...position,
        x: Math.min(100 - width / 2, Math.max(width / 2, position.x + (width - position.width) / 2)),
        y: Math.min(100 - height / 2, Math.max(height / 2, position.y + (height - position.height) / 2)),
        width,
        height,
      });
      return;
    }
    const start = resizeRef.current;
    if (event.type !== 'pointermove' || !start || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    event.stopPropagation();
    const deltaX = ((event.clientX - start.startX) / start.bounds.width) * 100;
    const deltaY = ((event.clientY - start.startY) / start.bounds.height) * 100;
    const width = Math.min(90, Math.max(5, start.position.width + deltaX));
    const height = Math.min(80, Math.max(5, start.position.height + deltaY));
    onPositionChange(field, side, {
      ...start.position,
      x: Math.min(100 - width / 2, Math.max(width / 2, start.position.x + (width - start.position.width) / 2)),
      y: Math.min(100 - height / 2, Math.max(height / 2, start.position.y + (height - start.position.height) / 2)),
      width,
      height,
    });
  };
  const resizeHandle = (field, position, label) => onPositionChange ? (
    <span
      role="group"
      tabIndex={0}
      aria-label={`Resize ${label}`}
      title="Drag this corner to resize; use arrow keys for fine adjustments"
      className="absolute -bottom-1.5 -right-1.5 z-10 h-3 w-3 cursor-nwse-resize touch-none border-2 border-white bg-orange shadow"
      onPointerDown={(event) => updateSize(field, position, event)}
      onPointerMove={(event) => updateSize(field, position, event)}
      onPointerUp={(event) => updateSize(field, position, event)}
      onPointerCancel={(event) => updateSize(field, position, event)}
      onKeyDown={(event) => updateSize(field, position, event)}
    />
  ) : null;

  return (
    <div ref={previewRef} className={`relative mx-auto w-full max-w-[390px] ${isHoodie ? 'aspect-[534/563]' : isDropShoulder ? 'aspect-[600/670]' : isSweatshirt ? 'aspect-[587/582]' : isLongSleeve ? 'aspect-[596/674]' : 'aspect-[478/499]'}`} style={{ containerType: 'inline-size' }}>
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundColor: color.hex,
          maskImage: `url("${modelImage}")`,
          maskPosition: 'center',
          maskRepeat: 'no-repeat',
          maskSize: 'contain',
          WebkitMaskImage: `url("${modelImage}")`,
          WebkitMaskPosition: 'center',
          WebkitMaskRepeat: 'no-repeat',
          WebkitMaskSize: 'contain',
        }}
      />
      {isHoodie && (
        <img
          src={`/garment-models/hoodie-${side}-details.png`}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-contain opacity-80"
        />
      )}
      {isDropShoulder && (
        <img
          src={`/garment-models/drop-shoulder-${side}-details.png`}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-contain opacity-80"
        />
      )}
      {isSweatshirt && (
        <img
          src={`/garment-models/sweatshirt-${side}-details.png`}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-contain opacity-80"
        />
      )}
      {isLongSleeve && (
        <img
          src={`/garment-models/long-sleeve-${side}-details.png`}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-contain opacity-80"
        />
      )}
      {showImage && (
        <div
          className={`absolute -translate-x-1/2 -translate-y-1/2 ${onPositionChange ? 'cursor-grab touch-none active:cursor-grabbing hover:outline hover:outline-1 hover:outline-orange focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange' : ''}`}
          style={{
            left: `${imagePosition.x}%`,
            top: `${imagePosition.y}%`,
            width: `${imagePosition.width}%`,
            height: `${imagePosition.height}%`,
          }}
          {...dragProps('imagePositions', imagePosition, 'uploaded design')}
        >
          <img src={layout.imageData} alt="Uploaded design preview" className="h-full w-full object-fill" />
          {resizeHandle('imagePositions', imagePosition, 'uploaded design')}
        </div>
      )}
      {showText && (
        <span
          className={`absolute -translate-x-1/2 -translate-y-1/2 ${onPositionChange ? 'cursor-grab touch-none active:cursor-grabbing hover:outline hover:outline-1 hover:outline-orange focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange' : ''}`}
          style={{
            left: `${textPosition.x}%`,
            top: `${textPosition.y}%`,
            width: `${textPosition.width}%`,
            height: `${textPosition.height}%`,
          }}
          {...dragProps('textPositions', textPosition, 'design text')}
        >
          <span
            className="absolute inset-0 overflow-hidden break-words text-center font-bold leading-tight"
            style={{
              ...textFillStyle,
              fontFamily: `'${layout.textFont || 'Hanken Grotesk'}', sans-serif`,
              fontSize: `clamp(10px, ${Math.min(textPosition.width * 0.22, textPosition.height * 0.45) * (textSize / 22)}cqw, ${textSize}px)`,
            }}
          >
            {layout.text}
          </span>
          {resizeHandle('textPositions', textPosition, 'design text')}
        </span>
      )}
    </div>
  );
}

export function GarmentDesignPreview({ layout, side = 'front', className = '', onPositionChange }) {
  if (!['tshirt', 'hoodie', 'drop-shoulder', 'sweatshirt', 'long-sleeve'].includes(layout.garmentType)) {
    return <img src={makeDesignPreview(layout, side)} alt={`${layout.garmentName || 'Garment'} ${side} preview`} className={`w-full ${className}`} />;
  }
  return (
    <div className={`w-full ${className}`}>
      <GarmentSide layout={layout} side={side} onPositionChange={onPositionChange} />
    </div>
  );
}

export function GarmentDesignBoard({ layout, className = '' }) {
  if (!['tshirt', 'hoodie', 'drop-shoulder', 'sweatshirt', 'long-sleeve'].includes(layout.garmentType)) {
    return <img src={makeDesignPreview(layout)} alt={`${layout.garmentName || 'Garment'} design preview`} className={className} />;
  }
  return (
    <div className={`grid grid-cols-2 items-center gap-2 ${className}`}>
      <GarmentSide layout={layout} side="front" />
      <GarmentSide layout={layout} side="back" />
    </div>
  );
}

