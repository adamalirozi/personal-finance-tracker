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
                      color: transaction.transaction_type === 'income' ? '#28a745' : '#dc3545',
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

const styles = {
  container: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  item: {
    padding: '1rem',
    border: '1px solid #eee',
    borderRadius: '4px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
  },
  category: {
    fontWeight: 'bold',
    fontSize: '1.1rem',
  },
  amount: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
  },
  description: {
    color: '#666',
    margin: '0.25rem 0',
  },
  date: {
    color: '#999',
    fontSize: '0.9rem',
    margin: '0.25rem 0',
  },
  actions: {
    display: 'flex',
    gap: '0.5rem',
  },
  editButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  empty: {
    textAlign: 'center',
    color: '#999',
    padding: '2rem',
  },
};

export default TransactionList;
