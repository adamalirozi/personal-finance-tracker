import React, { useState, useEffect, useCallback } from 'react';
import { budgetsAPI } from '../services/api';

function BudgetTracker() {
  const [budgets, setBudgets] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
  });
  const [currentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear] = useState(new Date().getFullYear());

  const fetchBudgets = useCallback(async () => {
    try {
      const response = await budgetsAPI.getAll(currentMonth, currentYear);
      setBudgets(response.data);
    } catch (error) {
      console.error('Error fetching budgets:', error);
    }
  }, [currentMonth, currentYear]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await budgetsAPI.create({
        ...formData,
        month: currentMonth,
        year: currentYear
      });
      setFormData({ category: '', amount: '' });
      setShowForm(false);
      fetchBudgets();
    } catch (error) {
      console.error('Error creating budget:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this budget?')) {
      try {
        await budgetsAPI.delete(id);
        fetchBudgets();
      } catch (error) {
        console.error('Error deleting budget:', error);
      }
    }
  };

  const getStatusColor = (percentage) => {
    if (percentage < 70) return '#28a745';
    if (percentage < 90) return '#ffc107';
    return '#dc3545';
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3>Budget Tracker - {new Date(currentYear, currentMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
        <button onClick={() => setShowForm(!showForm)} style={styles.addButton}>
          {showForm ? 'Cancel' : '+ Add Budget'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="text"
            placeholder="Category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            style={styles.input}
            required
          />
          <input
            type="number"
            step="0.01"
            placeholder="Budget Amount"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            style={styles.input}
            required
          />
          <button type="submit" style={styles.submitButton}>Set Budget</button>
        </form>
      )}

      <div style={styles.budgetList}>
        {budgets.length === 0 ? (
          <p style={styles.noBudgets}>No budgets set for this month</p>
        ) : (
          budgets.map(budget => (
            <div key={budget.id} style={styles.budgetItem}>
              <div style={styles.budgetHeader}>
                <h4>{budget.category}</h4>
                <button onClick={() => handleDelete(budget.id)} style={styles.deleteButton}>
                  ×
                </button>
              </div>
              <div style={styles.budgetInfo}>
                <div style={styles.amounts}>
                  <span>Spent: ${budget.spent.toFixed(2)}</span>
                  <span>Budget: ${budget.amount.toFixed(2)}</span>
                  <span style={{ color: budget.remaining >= 0 ? '#28a745' : '#dc3545' }}>
                    Remaining: ${budget.remaining.toFixed(2)}
                  </span>
                </div>
                <div style={styles.progressBar}>
                  <div style={{
                    ...styles.progress,
                    width: `${Math.min(budget.percentage, 100)}%`,
                    backgroundColor: getStatusColor(budget.percentage)
                  }}>
                    <span style={styles.percentage}>{budget.percentage.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  addButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  form: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1rem',
    padding: '1rem',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px',
  },
  input: {
    flex: 1,
    padding: '0.5rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
  },
  submitButton: {
    padding: '0.5rem 1.5rem',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  budgetList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  budgetItem: {
    padding: '1rem',
    border: '1px solid #eee',
    borderRadius: '4px',
  },
  budgetHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
  },
  deleteButton: {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    color: '#dc3545',
    cursor: 'pointer',
  },
  budgetInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  amounts: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.9rem',
    color: '#666',
  },
  progressBar: {
    height: '25px',
    backgroundColor: '#f0f0f0',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '0.85rem',
    transition: 'width 0.3s ease',
  },
  percentage: {
    textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
  },
  noBudgets: {
    textAlign: 'center',
    color: '#999',
    padding: '2rem',
  },
};

export default BudgetTracker;

