import React from 'react';

function Charts({ analytics }) {
  if (!analytics) return null;

  const { category_breakdown, monthly_trends, top_expense_categories } = analytics;

  // Prepare data for category pie chart
  const categoryData = Object.entries(category_breakdown).map(([category, data]) => ({
    category,
    total: data.expense
  })).filter(item => item.total > 0);

  const totalExpenses = categoryData.reduce((sum, item) => sum + item.total, 0);

  // Prepare monthly data
  const monthlyData = Object.entries(monthly_trends).sort().map(([month, data]) => ({
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
                    <span style={styles.categoryAmount}>
                      ${item.total.toFixed(2)} ({percentage}%)
                    </span>
                  </div>
                  <div style={styles.barContainer}>
                    <div style={{
                      ...styles.bar,
                      width: `${percentage}%`,
                      backgroundColor: colors[index % colors.length]
                    }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={styles.noData}>No expense data available</p>
        )}
      </div>

      {/* Monthly Trends */}
      <div style={styles.chartSection}>
        <h4>Monthly Trends</h4>
        {monthlyData.length > 0 ? (
          <div style={styles.monthlyChart}>
            {monthlyData.map(item => {
              const maxValue = Math.max(...monthlyData.map(d => Math.max(d.income, d.expense)));
              const incomeHeight = (item.income / maxValue * 100);
              const expenseHeight = (item.expense / maxValue * 100);
              
              return (
                <div key={item.month} style={styles.monthItem}>
                  <div style={styles.bars}>
                    <div style={styles.barGroup}>
                      <div style={{
                        ...styles.monthBar,
                        height: `${incomeHeight}px`,
                        backgroundColor: '#28a745',
                        minHeight: item.income > 0 ? '5px' : '0'
                      }}></div>
                      <span style={styles.barLabel}>
                        ${item.income.toFixed(0)}
                      </span>
                    </div>
                    <div style={styles.barGroup}>
                      <div style={{
                        ...styles.monthBar,
                        height: `${expenseHeight}px`,
                        backgroundColor: '#dc3545',
                        minHeight: item.expense > 0 ? '5px' : '0'
                      }}></div>
                      <span style={styles.barLabel}>
                        ${item.expense.toFixed(0)}
                      </span>
                    </div>
                  </div>
                  <div style={styles.monthLabel}>{item.month}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={styles.noData}>No monthly data available</p>
        )}
        <div style={styles.legend}>
          <div style={styles.legendItem}>
            <div style={{ ...styles.legendColor, backgroundColor: '#28a745' }}></div>
            <span>Income</span>
          </div>
          <div style={styles.legendItem}>
            <div style={{ ...styles.legendColor, backgroundColor: '#dc3545' }}></div>
            <span>Expenses</span>
          </div>
        </div>
      </div>

      {/* Top Expense Categories */}
      <div style={styles.chartSection}>
        <h4>Top 5 Expense Categories</h4>
        {top_expense_categories && top_expense_categories.length > 0 ? (
          <div style={styles.topList}>
            {top_expense_categories.map(([category, amount], index) => (
              <div key={category} style={styles.topItem}>
                <span style={styles.rank}>{index + 1}</span>
                <span style={styles.topCategory}>{category}</span>
                <span style={styles.topAmount}>${amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p style={styles.noData}>No expense data available</p>
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
  chartSection: {
    marginBottom: '2rem',
  },
  pieContainer: {
    marginTop: '1rem',
  },
  categoryItem: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '0.75rem',
    gap: '0.5rem',
  },
  colorBox: {
    width: '20px',
    height: '20px',
    borderRadius: '4px',
  },
  categoryInfo: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: '150px',
  },
  categoryName: {
    fontWeight: 'bold',
    fontSize: '0.9rem',
  },
  categoryAmount: {
    fontSize: '0.8rem',
    color: '#666',
  },
  barContainer: {
    flex: 1,
    height: '20px',
    backgroundColor: '#f0f0f0',
    borderRadius: '10px',
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: '10px',
    transition: 'width 0.3s ease',
  },
  monthlyChart: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: '200px',
    borderBottom: '2px solid #ddd',
    marginTop: '1rem',
    padding: '1rem 0',
  },
  monthItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
  },
  bars: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '4px',
    height: '150px',
  },
  barGroup: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  monthBar: {
    width: '30px',
    borderRadius: '4px 4px 0 0',
    transition: 'height 0.3s ease',
  },
  barLabel: {
    fontSize: '0.7rem',
    marginTop: '2px',
    color: '#666',
  },
  monthLabel: {
    fontSize: '0.75rem',
    marginTop: '0.5rem',
    color: '#666',
  },
  legend: {
    display: 'flex',
    justifyContent: 'center',
    gap: '2rem',
    marginTop: '1rem',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  legendColor: {
    width: '20px',
    height: '20px',
    borderRadius: '4px',
  },
  topList: {
    marginTop: '1rem',
  },
  topItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.75rem',
    borderBottom: '1px solid #eee',
    gap: '1rem',
  },
  rank: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: '#007bff',
    minWidth: '30px',
  },
  topCategory: {
    flex: 1,
    fontWeight: '500',
  },
  topAmount: {
    fontWeight: 'bold',
    color: '#dc3545',
  },
  noData: {
    textAlign: 'center',
    color: '#999',
    padding: '2rem',
  },
};

export default Charts;
