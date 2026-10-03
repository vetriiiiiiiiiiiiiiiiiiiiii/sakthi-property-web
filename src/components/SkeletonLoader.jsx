// Loading skeleton component for better UX during data fetching
import React from 'react';

export function SkeletonLoader({ type = 'card', count = 1, height = 80 }) {
  if (type === 'card') {
    return (
      <div className="skeleton-grid">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="skeleton-card">
            <div className="skeleton-header">
              <div className="skeleton-circle" />
              <div className="skeleton-text" />
            </div>
            <div className="skeleton-body">
              <div className="skeleton-line" />
              <div className="skeleton-line short" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="skeleton-table">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="skeleton-row">
            <div className="skeleton-cell" />
            <div className="skeleton-cell" />
            <div className="skeleton-cell" />
            <div className="skeleton-cell short" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'form') {
    return (
      <div className="skeleton-form">
        <div className="skeleton-input" />
        <div className="skeleton-input" />
        <div className="skeleton-input short" />
        <div className="skeleton-button" />
      </div>
    );
  }

  return (
    <div className="skeleton-block" style={{ height: `${height}px` }} />
  );
}

export function LoadingOverlay({ message = 'Loading...' }) {
  return (
    <div className="loading-overlay">
      <div className="loading-spinner" />
      {message && <p>{message}</p>}
    </div>
  );
}
