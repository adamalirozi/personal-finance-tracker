import React, { useState } from 'react';

function TransactionForm({ onSubmit, editingTransaction, onCancel }) {
  const [formData, setFormData] = useState(
    editingTransaction || {
      amount: '',
      category: '',
      description: '',
      transaction_type: 'expense',
      date: new Date().toISOString().split('T')[0],
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
    if (!editingTransaction) {
      setFormData({
        amount: '',
        category: '',
        description: '',
        transaction_type: 'expense',
        date: new Date().toISOString().split('T')[0],
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <h3>{editingTransaction ? 'Edit Transaction' : 'Add Transaction'}</h3>
      <input
        type="number"
        step="0.01"
        placeholder="Amount"
        value={formData.amount}
        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
        style={styles.input}
        required
      />
      <input
        type="text"
        placeholder="Category"
        value={formData.category}
        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
        style={styles.input}
        required
      />
      <input
        type="text"
        placeholder="Description"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        style={styles.input}
      />
      <select
        value={formData.transaction_type}
        onChange={(e) => setFormData({ ...formData, transaction_type: e.target.value })}
        style={styles.input}
      >
        <option value="expense">Expense</option>
        <option value="income">Income</option>
      </select>
      <input
        type="date"
        value={formData.date}
        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
        style={styles.input}
        required
      />
      <div style={styles.buttonGroup}>
        <button type="submit" style={styles.submitButton}>
          {editingTransaction ? 'Update' : 'Add'}
        </button>
        {editingTransaction && (
          <button type="button" onClick={onCancel} style={styles.cancelButton}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

const styles = {
  form: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
    marginBottom: '2rem',
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    marginBottom: '1rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
    boxSizing: 'border-box',
  },
  buttonGroup: {
    display: 'flex',
    gap: '1rem',
  },
  submitButton: {
    flex: 1,
    padding: '0.75rem',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  cancelButton: {
    flex: 1,
    padding: '0.75rem',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
};

export default TransactionForm;
