// Reusable Pagination component
import React from 'react';

export function Pagination({ page, totalPages, onPageChange, perPage, totalItems, onPerPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="pagination-container">
      <div className="pagination-info">
        Showing {((page - 1) * perPage) + 1} to {Math.min(page * perPage, totalItems)} of {totalItems}
      </div>
      
      <div className="pagination-controls">
        <button
          className="pagination-btn"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          title="Previous page"
        >
          ← Previous
        </button>

        <div className="pagination-numbers">
          {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
            let btnPage;
            if (totalPages <= 5) {
              btnPage = i + 1;
            } else if (page <= 3) {
              btnPage = i + 1;
            } else if (page >= totalPages - 2) {
              btnPage = totalPages - 4 + i;
            } else {
              btnPage = page - 2 + i;
            }

            if (btnPage < 1 || btnPage > totalPages) return null;

            return (
              <button
                key={btnPage}
                className={`pagination-number ${page === btnPage ? 'active' : ''}`}
                onClick={() => onPageChange(btnPage)}
              >
                {btnPage}
              </button>
            );
          })}
        </div>

        <button
          className="pagination-btn"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          title="Next page"
        >
          Next →
        </button>
      </div>

      {onPerPageChange && (
        <div className="pagination-per-page">
          <label>
            Per page:
            <select value={perPage} onChange={(e) => onPerPageChange(Number(e.target.value))}>
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </label>
        </div>
      )}
    </div>
  );
}
