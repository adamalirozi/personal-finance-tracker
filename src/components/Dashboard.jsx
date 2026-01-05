import React, { useState, useEffect, useCallback } from 'react';
import { transactionsAPI } from '../services/api';
import TransactionForm from './TransactionForm';
import TransactionList from './TransactionList';
import FilterBar from './FilterBar';
import Charts from './Charts';
import BudgetTracker from './BudgetTracker';

function Dashboard({ user, onLogout }) {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ total_income: 0, total_expenses: 0, balance: 0 });
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({});
  const [analytics, setAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState('transactions');

  const fetchTransactions = useCallback(async () => {
    try {
      setError('');
      const response = await transactionsAPI.getAll(filters);
      setTransactions(response.data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchSummary = useCallback(async () => {
    try {
      const dateFilters = {};
      if (filters.start_date) dateFilters.start_date = filters.start_date;
      if (filters.end_date) dateFilters.end_date = filters.end_date;
      
      const response = await transactionsAPI.getSummary(dateFilters);
      setSummary(response.data);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  }, [filters.start_date, filters.end_date]);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await transactionsAPI.getCategories();
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      const dateFilters = {};
      if (filters.start_date) dateFilters.start_date = filters.start_date;
      if (filters.end_date) dateFilters.end_date = filters.end_date;
      
      const response = await transactionsAPI.getAnalytics(dateFilters);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  }, [filters.start_date, filters.end_date]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchTransactions();
      fetchSummary();
      fetchCategories();
      fetchAnalytics();
    } else {
      setError('No authentication token found');
      setLoading(false);
    }
  }, [fetchTransactions, fetchSummary, fetchCategories, fetchAnalytics]);

  const handleAddTransaction = async (formData) => {
    try {
      setError('');
      await transactionsAPI.create(formData);
      await fetchTransactions();
      await fetchSummary();
      await fetchCategories();
      await fetchAnalytics();
    } catch (error) {
      console.error('Error adding transaction:', error);
      setError('Failed to add transaction');
    }
  };

  const handleUpdateTransaction = async (formData) => {
    try {
      setError('');
      await transactionsAPI.update(editingTransaction.id, formData);
      setEditingTransaction(null);
      await fetchTransactions();
      await fetchSummary();
      await fetchAnalytics();
    } catch (error) {
      console.error('Error updating transaction:', error);
      setError('Failed to update transaction');
    }
  };

  const handleDeleteTransaction = async (id) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        setError('');
        await transactionsAPI.delete(id);
        await fetchTransactions();
        await fetchSummary();
        await fetchCategories();
        await fetchAnalytics();
      } catch (error) {
        console.error('Error deleting transaction:', error);
        setError('Failed to delete transaction');
      }
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleExportCSV = async () => {
    try {
      const response = await transactionsAPI.exportCSV();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'transactions.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Failed to export transactions');
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Personal Finance Tracker</h1>
        <div style={styles.userInfo}>
          <span>Welcome, {user.username}</span>
          <button onClick={handleExportCSV} style={styles.exportButton}>
            📥 Export CSV
          </button>
          <button onClick={onLogout} style={styles.logoutButton}>
            Logout
          </button>
        </div>
      </div>

      {error && (
        <div style={styles.errorBanner}>
          {error}
        </div>
      )}

      <div style={styles.summary}>
        <div style={styles.summaryCard}>
          <h3>Total Income</h3>
          <p style={{ color: '#28a745', fontSize: '1.5rem', fontWeight: 'bold' }}>
            ${summary.total_income.toFixed(2)}
          </p>
        </div>
        <div style={styles.summaryCard}>
          <h3>Total Expenses</h3>
          <p style={{ color: '#dc3545', fontSize: '1.5rem', fontWeight: 'bold' }}>
            ${summary.total_expenses.toFixed(2)}
          </p>
        </div>
        <div style={styles.summaryCard}>
          <h3>Balance</h3>
          <p style={{ 
            color: summary.balance >= 0 ? '#28a745' : '#dc3545',
            fontSize: '1.5rem',
            fontWeight: 'bold'
          }}>
            ${summary.balance.toFixed(2)}
          </p>
        </div>
      </div>

      <div style={styles.tabs}>
        <button
          onClick={() => setActiveTab('transactions')}
          style={{
            ...styles.tab,
            ...(activeTab === 'transactions' ? styles.activeTab : {})
          }}
        >
          Transactions
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          style={{
            ...styles.tab,
            ...(activeTab === 'analytics' ? styles.activeTab : {})
          }}
        >
          Analytics
        </button>
        <button
          onClick={() => setActiveTab('budgets')}
          style={{
            ...styles.tab,
            ...(activeTab === 'budgets' ? styles.activeTab : {})
          }}
        >
          Budgets
        </button>
      </div>

      {activeTab === 'transactions' && (
        <>
          <FilterBar onFilterChange={handleFilterChange} categories={categories} />
          
          <TransactionForm
            onSubmit={editingTransaction ? handleUpdateTransaction : handleAddTransaction}
            editingTransaction={editingTransaction}
            onCancel={() => setEditingTransaction(null)}
          />

          <TransactionList
            transactions={transactions}
            onEdit={setEditingTransaction}
            onDelete={handleDeleteTransaction}
          />
        </>
      )}

      {activeTab === 'analytics' && (
        <>
          <FilterBar onFilterChange={handleFilterChange} categories={categories} />
          <Charts analytics={analytics} />
        </>
      )}

      {activeTab === 'budgets' && (
        <BudgetTracker />
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  exportButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  logoutButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  summary: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem',
  },
  summaryCard: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    padding: '1rem',
    borderRadius: '4px',
    marginBottom: '1rem',
    border: '1px solid #f5c6cb',
  },
  tabs: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '2rem',
    borderBottom: '2px solid #eee',
  },
  tab: {
    padding: '0.75rem 1.5rem',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '500',
    color: '#666',
    transition: 'all 0.3s',
  },
  activeTab: {
    color: '#007bff',
    borderBottomColor: '#007bff',
  },
};

export default Dashboard;
