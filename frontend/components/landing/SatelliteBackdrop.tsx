'use client';

import React from 'react';

/**
 * Full-bleed satellite photograph assembled from real Esri World Imagery tiles.
 * The tile mosaic is scaled to "cover" its container (like background-size: cover)
 * using container query units, so the parent must establish a size container.
 */
type Props = {
  /** Web-mercator zoom level of the tiles */
  z: number;
  /** Top-left tile column / row */
  x0: number;
  y0: number;
  cols: number;
  rows: number;
  /** CSS object-position-like focal point within the mosaic, 0–1 */
  focusX?: number;
  focusY?: number;
  className?: string;
  /** Below-the-fold mosaics should load lazily so they don't compete with the hero */
  lazy?: boolean;
};

const TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile';

export default function SatelliteBackdrop({
  z,
  x0,
  y0,
  cols,
  rows,
  focusX = 0.5,
  focusY = 0.5,
  className = '',
  lazy = false,
}: Props) {
  const tiles: { x: number; y: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) tiles.push({ x: x0 + c, y: y0 + r });
  }

  const ratio = cols / rows;

  return (
    <div className={`absolute inset-0 overflow-hidden bg-[#1b2117] [container-type:size] ${className}`} aria-hidden="true">
      <div
        className="absolute grid animate-[sat-fade_1.4s_ease-out_both]"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          width: `max(100cqw, calc(100cqh * ${ratio}))`,
          aspectRatio: `${cols} / ${rows}`,
          left: `${focusX * 100}%`,
          top: `${focusY * 100}%`,
          transform: `translate(-${focusX * 100}%, -${focusY * 100}%)`,
          filter: 'saturate(1.18) contrast(1.06)',
        }}
      >
        {tiles.map(({ x, y }) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${x}-${y}`}
            src={`${TILE_URL}/${z}/${y}/${x}`}
            alt=""
            draggable={false}
            loading={lazy ? 'lazy' : 'eager'}
            fetchPriority={lazy ? 'low' : 'auto'}
            decoding="async"
            className="block max-w-none select-none"
            style={{ width: 'calc(100% + 1px)', height: 'calc(100% + 1px)' }}
          />
        ))}
      </div>
    </div>
  );
}
