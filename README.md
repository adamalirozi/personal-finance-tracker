# Personal Finance Tracker - Frontend Documentation

## Overview

The frontend is a single-page application (SPA) built with React 18 that provides an intuitive interface for managing personal finances. It features transaction management, data visualization, budget tracking, and advanced filtering capabilities.

## Table of Contents

- [Architecture](#architecture)
- [File Documentation](#file-documentation)
- [Component Relationships](#component-relationships)
- [State Management](#state-management)
- [API Integration](#api-integration)
- [Styling Approach](#styling-approach)
- [User Flow](#user-flow)
- [Future Improvements](#future-improvements)

---

## Architecture

```
frontend/
├── public/
│   └── index.html              # HTML template
├── src/
│   ├── index.js                # React app entry point
│   ├── App.js                  # Root component with routing logic
│   ├── App.css                 # Global styles
│   ├── components/
│   │   ├── Login.jsx           # Authentication UI
│   │   ├── Dashboard.jsx       # Main dashboard with tabs
│   │   ├── TransactionForm.jsx # Add/edit transaction form
│   │   ├── TransactionList.jsx # Transaction display
│   │   ├── FilterBar.jsx       # Filtering controls
│   │   ├── Charts.jsx          # Data visualizations
│   │   └── BudgetTracker.jsx   # Budget management
│   └── services/
│       └── api.js              # API client and endpoints
├── package.json                # Dependencies and scripts
└── .env.local                  # Environment variables
```

### Technology Stack
- **React 18.2.0** - UI library
- **Axios 1.6.0** - HTTP client
- **CSS-in-JS** - Inline styles for components
- **React Hooks** - State and lifecycle management
- **LocalStorage** - Token and user persistence

---

## File Documentation

### 1. `public/index.html`
**Purpose**: HTML template that hosts the React application.

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="Personal Finance Tracker" />
    <title>Finance Tracker</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>
```

**Key Points**:
- Single `<div id="root">` where React app mounts
- Viewport meta tag for responsive design
- NoScript message for users without JavaScript

---

### 2. `src/index.js`
**Purpose**: Entry point that renders the React application into the DOM.

```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import './App.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**Key Points**:
- Uses React 18's `createRoot` API
- Wraps App in `StrictMode` for development warnings
- Imports global CSS
- Mounts App component to DOM

**React.StrictMode Benefits**:
- Identifies unsafe lifecycle methods
- Warns about deprecated APIs
- Detects unexpected side effects
- Only runs in development mode

---

### 3. `src/App.css`
**Purpose**: Global styles applied to the entire application.

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #f5f5f5;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}
```

**Key Points**:
- CSS reset for consistent styling
- System font stack for native look
- Font smoothing for better readability
- Light gray background color

---

### 4. `src/App.js`
**Purpose**: Root component that manages authentication state and routing.

```javascript
import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import './App.css';

function App() {
  const [user, setUser] = useState(null);

  // Restore user session from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <div className="App">
      {user ? (
        <Dashboard user={user} onLogout={handleLogout} />
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}

export default App;
```

**State Management**:
- `user`: Stores authenticated user data or null

**Lifecycle**:
1. Component mounts
2. Checks localStorage for token and user
3. If found, restores user session
4. Renders Login or Dashboard based on user state

**Props Flow**:
- `App` → `Login`: `onLoginSuccess` callback
- `App` → `Dashboard`: `user` object and `onLogout` callback

**Authentication Logic**:
- User data persists in localStorage
- Session restored on page refresh
- Logout clears localStorage and state

---

### 5. `src/services/api.js`
**Purpose**: Centralized API client with authentication and error handling.

```javascript
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 422) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);
```

**API Modules**:

#### Authentication API
```javascript
export const authAPI = {
  register: (userData) => api.post('/users/register', userData),
  login: (credentials) => api.post('/users/login', credentials),
};
```

#### Transactions API
```javascript
export const transactionsAPI = {
  // Get transactions with optional filters
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.category) params.append('category', filters.category);
    if (filters.type) params.append('type', filters.type);
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    return api.get(`/transactions/?${params.toString()}`);
  },
  
  create: (transaction) => api.post('/transactions/', transaction),
  update: (id, transaction) => api.put(`/transactions/${id}`, transaction),
  delete: (id) => api.delete(`/transactions/${id}`),
  
  getSummary: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    return api.get(`/transactions/summary?${params.toString()}`);
  },
  
  getCategories: () => api.get('/transactions/categories'),
  getAnalytics: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    return api.get(`/transactions/analytics?${params.toString()}`);
  },
  
  exportCSV: () => {
    return api.get('/transactions/export', {
      responseType: 'blob'
    });
  },
};
```

#### Budgets API
```javascript
export const budgetsAPI = {
  getAll: (month, year) => api.get(`/budgets/?month=${month}&year=${year}`),
  create: (budget) => api.post('/budgets/', budget),
  delete: (id) => api.delete(`/budgets/${id}`),
};
```

**Key Features**:
- Automatic JWT token attachment
- Automatic redirect on auth failure
- URL parameter construction for filters
- Support for file downloads (CSV)
- Environment-based API URL

---

### 6. `src/components/Login.jsx`
**Purpose**: Authentication interface for login and registration.

```javascript
import React, { useState } from 'react';
import { authAPI } from '../services/api';

function Login({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Login flow
        const response = await authAPI.login({
          username: formData.username,
          password: formData.password,
        });
        
        // Store token and user data
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Notify parent component
        onLoginSuccess(response.data.user);
      } else {
        // Registration flow
        await authAPI.register(formData);
        alert('Registration successful! Please login.');
        setIsLogin(true);
        setFormData({ username: '', email: '', password: '' });
      }
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>{isLogin ? 'Login' : 'Register'}</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            style={styles.input}
            required
            disabled={loading}
          />
          {!isLogin && (
            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={styles.input}
              required
              disabled={loading}
            />
          )}
          <input
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            style={styles.input}
            required
            disabled={loading}
          />
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Please wait...' : (isLogin ? 'Login' : 'Register')}
          </button>
        </form>
        <p style={styles.toggle}>
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <span onClick={() => !loading && setIsLogin(!isLogin)} style={styles.link}>
            {isLogin ? 'Register' : 'Login'}
          </span>
        </p>
      </div>
    </div>
  );
}
```

**State Management**:
- `isLogin`: Toggle between login/register mode
- `formData`: Form input values
- `error`: Error messages
- `loading`: Loading state during API calls

**User Flow**:
1. User enters credentials
2. Form submission triggers API call
3. On success:
   - Login: Store token, notify parent
   - Register: Show success message, switch to login
4. On error: Display error message

**Props**:
- `onLoginSuccess`: Callback function to notify App.js of successful login

---

### 7. `src/components/Dashboard.jsx`
**Purpose**: Main application interface with tabs for different features.

```javascript
import React, { useState, useEffect, useCallback } from 'react';
import { transactionsAPI } from '../services/api';
import TransactionForm from './TransactionForm';
import TransactionList from './TransactionList';
import FilterBar from './FilterBar';
import Charts from './Charts';
import BudgetTracker from './BudgetTracker';

function Dashboard({ user, onLogout }) {
  // State management
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ 
    total_income: 0, 
    total_expenses: 0, 
    balance: 0 
  });
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({});
  const [analytics, setAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState('transactions');

  // Data fetching functions with useCallback
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

  // Initial data load
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
  }, [fetchTransactions, fetchSummary]);

  // Handle filter changes
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  // CSV export
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

  return (
    <div style={styles.container}>
      {/* Header */}
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

      {/* Error banner */}
      {error && <div style={styles.errorBanner}>{error}</div>}

      {/* Summary cards */}
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

      {/* Tab navigation */}
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

      {/* Tab content */}
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
```

**State Variables**:
- `transactions`: Array of user transactions
- `summary`: Financial totals (income, expenses, balance)
- `editingTransaction`: Transaction being edited (null if none)
- `loading`: Initial loading state
- `error`: Error message string
- `categories`: Unique categories for filtering
- `filters`: Current filter values
- `analytics`: Analytics data for charts
- `activeTab`: Current active tab ('transactions', 'analytics', 'budgets')

**Key Features**:
- Tab-based navigation
- Real-time financial summary
- CSV export functionality
- Conditional rendering based on active tab
- Shared filter bar for transactions and analytics
- Centralized error handling

**Performance Optimization**:
- `useCallback` to prevent unnecessary re-renders
- Memoized fetch functions
- Conditional data fetching based on active tab

---

### 8. `src/components/TransactionForm.jsx`
**Purpose**: Form for adding and editing transactions.

```javascript
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
      // Reset form after adding new transaction
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
```

**Props**:
- `onSubmit`: Function to handle form submission
- `editingTransaction`: Transaction object (null for new transaction)
- `onCancel`: Function to cancel editing

**Behavior**:
- **Add Mode**: Empty form, resets after submission
- **Edit Mode**: Pre-filled form, shows cancel button

**Form Fields**:
- Amount: Decimal number (required)
- Category: Text input (required)
- Description: Text input (optional)
- Type: Dropdown (income/expense)
- Date: Date picker (defaults to today)

---

### 9. `src/components/TransactionList.jsx`
**Purpose**: Displays list of transactions with edit/delete actions.

```javascript
import React from 'react';

function TransactionList({ transactions, onEdit, onDelete }) {
  return (
    <div style={styles.container}>
      <h3>Recent Transactions</h3>
      {transactions.length === 0 ? (
        <p style={styles.empty}>No transactions yet. Add your first one!</p>
      ) : (
        <div style={styles.list}>
          {transactions.map((transaction) => (
            <div key={transaction.id} style={styles.item}>
              <div style={styles.info}>
                <div style={styles.header}>
                  <span style={styles.category}>{transaction.category}</span>
                  <span
                    style={{
                      ...styles.amount,
                      color: transaction.transaction_type === 'income' 
                        ? '#28a745' 
                        : '#dc3545',
                    }}
                  >
                    {transaction.transaction_type === 'income' ? '+' : '-'}$
                    {transaction.amount.toFixed(2)}
                  </span>
                </div>
                <p style={styles.description}>{transaction.description}</p>
                <p style={styles.date}>
                  {new Date(transaction.date).toLocaleDateString()}
                </p>
              </div>
              <div style={styles.actions}>
                <button onClick={() => onEdit(transaction)} style={styles.editButton}>
                  Edit
                </button>
                <button onClick={() => onDelete(transaction.id)} style={styles.deleteButton}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Props**:
- `transactions`: Array of transaction objects
- `onEdit`: Function called when edit button clicked
- `onDelete`: Function called when delete button clicked

**Features**:
- Empty state message
- Color-coded amounts (green for income, red for expense)
- Plus/minus prefix for amounts
- Formatted dates
- Edit and delete actions

---

### 10. `src/components/FilterBar.jsx`
**Purpose**: Provides filtering controls for transactions.

```javascript
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
```

**Props**:
- `onFilterChange`: Callback function with filter values
- `categories`: Array of unique categories

**Filter Options**:
- Category dropdown (from user's categories)
- Type selection (All/Income/Expense)
- Date range (start and end dates)
- Reset button to clear all filters

**Behavior**:
- Immediate filter application on change
- Parent component re-fetches data with new filters

---

### 11. `src/components/Charts.jsx`
**Purpose**: Visualizes financial data with charts and graphs.

```javascript
import React from 'react';

function Charts({ analytics }) {
  if (!analytics) return null;

  const { category_breakdown, monthly_trends, top_expense_categories } = analytics;

  // Category breakdown visualization
  const categoryData = Object.entries(category_breakdown)
    .map(([category, data]) => ({
      category,
      total: data.expense
    }))
    .filter(item => item.total > 0);

  const totalExpenses = categoryData.reduce((sum, item) => sum + item.total, 0);

  // Monthly data visualization
  const monthlyData = Object.entries(monthly_trends)
    .sort()
    .map(([month, data]) => ({
      month,
      income: data.income,
      expense: data.expense
    }));

  return (
    <div style={styles.container}>
      <h3>Analytics & Insights</h3>
      
      {/* Category Breakdown */}
      <div style={styles.chartSection}>
        <h4>Expenses by Category</h4>
        {categoryData.length > 0 ? (
          <div style={styles.pieContainer}>
            {categoryData.map((item, index) => {
              const percentage = (item.total / totalExpenses * 100).toFixed(1);
              const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];
              return (
                <div key={item.category} style={styles.categoryItem}>
                  <div style={{
                    ...styles.colorBox,
                    backgroundColor: colors[index % colors.length]
                  }}></div>
                  <div style={styles.categoryInfo}>
                    <span style={styles.categoryName}>{item.category}</span>
