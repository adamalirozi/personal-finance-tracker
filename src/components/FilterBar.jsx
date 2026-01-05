import React, { useState } from 'react';

function FilterBar({ onFilterChange, categories }) {
  const [filters, setFilters] = useState({
    category: '',
    type: '',
    start_date: '',
    end_date: ''
  });

  const handleChange = (field, value) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleReset = () => {
    const resetFilters = {
      category: '',
      type: '',
      start_date: '',
      end_date: ''
    };
    setFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  return (
    <div style={styles.container}>
      <h3>Filters</h3>
      <div style={styles.filterGrid}>
        <div style={styles.filterItem}>
          <label>Category</label>
          <select
            value={filters.category}
            onChange={(e) => handleChange('category', e.target.value)}
            style={styles.select}
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div style={styles.filterItem}>
          <label>Type</label>
          <select
            value={filters.type}
            onChange={(e) => handleChange('type', e.target.value)}
            style={styles.select}
          >
            <option value="">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>

        <div style={styles.filterItem}>
          <label>Start Date</label>
          <input
            type="date"
            value={filters.start_date}
            onChange={(e) => handleChange('start_date', e.target.value)}
            style={styles.input}
          />
        </div>

        <div style={styles.filterItem}>
          <label>End Date</label>
          <input
            type="date"
            value={filters.end_date}
            onChange={(e) => handleChange('end_date', e.target.value)}
            style={styles.input}
          />
        </div>

        <div style={styles.filterItem}>
          <button onClick={handleReset} style={styles.resetButton}>
            Reset Filters
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
    marginBottom: '1.5rem',
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginTop: '1rem',
  },
  filterItem: {
    display: 'flex',
    flexDirection: 'column',
  },
  select: {
    padding: '0.5rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    marginTop: '0.25rem',
  },
  input: {
    padding: '0.5rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    marginTop: '0.25rem',
  },
  resetButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginTop: 'auto',
  },
};

export default FilterBar;
