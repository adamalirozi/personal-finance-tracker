# Personal Finance Tracker - Backend Documentation

## Overview

The backend is a RESTful API built with Flask that handles user authentication, transaction management, budget tracking, and financial analytics. It uses SQLAlchemy ORM for database operations and JWT for secure authentication.

## Table of Contents

- [Architecture](#architecture)
- [File Documentation](#file-documentation)
- [File Relationships](#file-relationships)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Authentication Flow](#authentication-flow)
- [Error Handling](#error-handling)
- [Testing](#testing)
- [Future Improvements](#future-improvements)

---

## Architecture

```
backend/
├── app.py                  # Application entry point
├── config.py              # Configuration management
├── models.py              # Database models (ORM)
├── auth.py                # Authentication logic
├── .env                   # Environment variables (gitignored)
├── requirements.txt       # Python dependencies
└── routes/
    ├── __init__.py        # Makes routes a package
    ├── users.py           # User authentication endpoints
    ├── transactions.py    # Transaction management endpoints
    └── budgets.py         # Budget tracking endpoints
```

### Technology Stack
- **Flask 3.0.0** - Web framework
- **Flask-SQLAlchemy 3.1.1** - ORM for database operations
- **Flask-JWT-Extended 4.5.3** - JWT authentication
- **Flask-CORS 4.0.0** - Cross-Origin Resource Sharing
- **bcrypt 4.1.1** - Password hashing
- **python-dotenv 1.0.0** - Environment variable management
- **SQLite** - Development database (easily upgradeable to PostgreSQL)

---

## File Documentation

### 1. `app.py`
**Purpose**: Main application file that initializes Flask, configures middleware, and registers routes.

**Key Components**:
```python
def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Initialize extensions
    CORS(app)                    # Enable cross-origin requests
    db.init_app(app)            # Initialize database
    JWTManager(app)             # Initialize JWT authentication
    
    # Register blueprints
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(transactions_bp, url_prefix='/api/transactions')
    app.register_blueprint(budgets_bp, url_prefix='/api/budgets')
```

**Functions**:
- `create_app()`: Factory function that creates and configures the Flask application
- JWT error handlers: Handle expired, invalid, unauthorized, and revoked tokens
- `log_request_info()`: Before-request hook that logs all incoming requests
- `health()`: Health check endpoint at `/api/health`

**When it runs**:
- On application startup
- Creates database tables if they don't exist
- Starts development server on port 5000

**Error Handling**:
- `expired_token_loader`: Returns 401 when token expires
- `invalid_token_loader`: Returns 422 for malformed tokens
- `unauthorized_loader`: Returns 401 when no token provided
- `revoked_token_loader`: Returns 401 for revoked tokens

---

### 2. `config.py`
**Purpose**: Centralized configuration management using environment variables.

**Configuration Variables**:
```python
class Config:
    SECRET_KEY                    # Flask secret key for sessions
    JWT_SECRET_KEY               # JWT signing key
    SQLALCHEMY_DATABASE_URI      # Database connection string
    SQLALCHEMY_TRACK_MODIFICATIONS = False  # Disable modification tracking
    JWT_ACCESS_TOKEN_EXPIRES     # Token expiration (24 hours)
    JWT_TOKEN_LOCATION           # Where to look for tokens (headers)
    JWT_HEADER_NAME              # Header name (Authorization)
    JWT_HEADER_TYPE              # Token type (Bearer)
```

**How it works**:
1. Loads `.env` file using `python-dotenv`
2. Reads environment variables with fallbacks
3. Provides type conversion (timedelta for expiry)
4. Flask imports Config class and applies settings

**Security Notes**:
- Never commit `.env` file to version control
- Use strong, unique keys in production
- Change default values before deployment

---

### 3. `models.py`
**Purpose**: Defines database models using SQLAlchemy ORM.

#### User Model
```python
class User(db.Model):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    username = Column(String(80), unique=True, nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    password_hash = Column(String(200), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    transactions = relationship('Transaction', backref='user', 
                              cascade='all, delete-orphan')
    budgets = relationship('Budget', backref='user', 
                          cascade='all, delete-orphan')
```

**Features**:
- One-to-many relationship with transactions and budgets
- Cascade delete: removing a user deletes all their data
- `to_dict()` method for JSON serialization

#### Transaction Model
```python
class Transaction(db.Model):
    __tablename__ = 'transactions'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    amount = Column(Float, nullable=False)
    category = Column(String(50), nullable=False)
    description = Column(String(200))
    transaction_type = Column(String(10), nullable=False)  # 'income' or 'expense'
    date = Column(DateTime, default=datetime.utcnow)
```

**Features**:
- Foreign key relationship to User
- Supports both income and expense types
- Stores amount as float for decimal precision
- Optional description field

#### Budget Model
```python
class Budget(db.Model):
    __tablename__ = 'budgets'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    category = Column(String(50), nullable=False)
    amount = Column(Float, nullable=False)
    month = Column(Integer, nullable=False)  # 1-12
    year = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
```

**Features**:
- Monthly budgets per category
- Foreign key relationship to User
- Unique constraint possible on (user_id, category, month, year)

---

### 4. `auth.py`
**Purpose**: Handles authentication logic including password hashing and JWT token generation.

**Functions**:

#### `hash_password(password: str) -> str`
```python
def hash_password(password):
    return bcrypt.hashpw(password.encode('utf-8'), 
                        bcrypt.gensalt()).decode('utf-8')
```
- Uses bcrypt with automatic salt generation
- Returns UTF-8 encoded hash string
- Secure against rainbow table attacks

#### `verify_password(password: str, password_hash: str) -> bool`
```python
def verify_password(password, password_hash):
    return bcrypt.checkpw(password.encode('utf-8'), 
                         password_hash.encode('utf-8'))
```
- Compares plaintext password with stored hash
- Returns boolean
- Constant-time comparison prevents timing attacks

#### `register_user(username: str, email: str, password: str) -> tuple`
```python
def register_user(username, email, password):
    # Check if username exists
    if User.query.filter_by(username=username).first():
        return None, 'Username already exists'
    
    # Check if email exists
    if User.query.filter_by(email=email).first():
        return None, 'Email already exists'
    
    # Hash password and create user
    password_hash = hash_password(password)
    user = User(username=username, email=email, password_hash=password_hash)
    
    db.session.add(user)
    db.session.commit()
    
    return user, None
```
- Returns (user, None) on success
- Returns (None, error_message) on failure
- Validates uniqueness before creating user

#### `login_user(username: str, password: str) -> tuple`
```python
def login_user(username, password):
    user = User.query.filter_by(username=username).first()
    
    if not user or not verify_password(password, user.password_hash):
        return None, None
    
    # Convert user.id to string for JWT
    access_token = create_access_token(identity=str(user.id))
    return user, access_token
```
- Returns (user, token) on success
- Returns (None, None) on failure
- **Critical**: Converts user.id to string for JWT compatibility

---

### 5. `routes/users.py`
**Purpose**: User authentication endpoints (register and login).

#### POST `/api/users/register`
```python
@users_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    
    # Validation
    if not username or not email or not password:
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Register user
    user, error = register_user(username, email, password)
    
    if error:
        return jsonify({'error': error}), 400
    
    return jsonify({
        'message': 'User registered successfully',
        'user': user.to_dict()
    }), 201
```

**Request Body**:
```json
{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "secure_password"
}
```

**Response (201)**:
```json
{
    "message": "User registered successfully",
    "user": {
        "id": 1,
        "username": "john_doe",
        "email": "john@example.com",
        "created_at": "2026-01-04T10:00:00"
    }
}
```

#### POST `/api/users/login`
```python
@users_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': 'Missing username or password'}), 400
    
    user, access_token = login_user(username, password)
    
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401
    
    return jsonify({
        'message': 'Login successful',
        'access_token': access_token,
        'user': user.to_dict()
    }), 200
```

**Request Body**:
```json
{
    "username": "john_doe",
    "password": "secure_password"
}
```

**Response (200)**:
```json
{
    "message": "Login successful",
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
        "id": 1,
        "username": "john_doe",
        "email": "john@example.com",
        "created_at": "2026-01-04T10:00:00"
    }
}
```

---

### 6. `routes/transactions.py`
**Purpose**: Transaction management with filtering, analytics, and CSV export.

#### GET `/api/transactions/`
**Protected**: Requires JWT

```python
@transactions_bp.route('/', methods=['GET'])
@jwt_required()
def get_transactions():
    user_id = int(get_jwt_identity())
    
    # Extract filters from query params
    category = request.args.get('category')
    transaction_type = request.args.get('type')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    # Build dynamic query
    query = Transaction.query.filter_by(user_id=user_id)
    
    if category:
        query = query.filter_by(category=category)
    if transaction_type:
        query = query.filter_by(transaction_type=transaction_type)
    if start_date:
        start = datetime.fromisoformat(start_date)
        query = query.filter(Transaction.date >= start)
    if end_date:
        end = datetime.fromisoformat(end_date)
        query = query.filter(Transaction.date <= end)
    
    transactions = query.order_by(Transaction.date.desc()).all()
    return jsonify([t.to_dict() for t in transactions]), 200
```

**Query Parameters**:
- `category`: Filter by category name
- `type`: Filter by 'income' or 'expense'
- `start_date`: ISO format (YYYY-MM-DD)
- `end_date`: ISO format (YYYY-MM-DD)

**Example Request**:
```
GET /api/transactions/?category=Food&type=expense&start_date=2026-01-01
```

#### POST `/api/transactions/`
**Protected**: Requires JWT

```python
@transactions_bp.route('/', methods=['POST'])
@jwt_required()
def create_transaction():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    
    # Validation
    amount = data.get('amount')
    category = data.get('category')
    description = data.get('description', '')
    transaction_type = data.get('transaction_type')
    date_str = data.get('date')
    
    if not amount or not category or not transaction_type:
        return jsonify({'error': 'Missing required fields'}), 400
    
    if transaction_type not in ['income', 'expense']:
        return jsonify({'error': 'Invalid transaction type'}), 400
    
    # Date parsing with fallback
    if date_str:
        try:
            transaction_date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        except:
            transaction_date = datetime.utcnow()
    else:
        transaction_date = datetime.utcnow()
    
    # Create transaction
    transaction = Transaction(
        user_id=user_id,
        amount=float(amount),
        category=category,
        description=description,
        transaction_type=transaction_type,
        date=transaction_date
    )
    
    db.session.add(transaction)
    db.session.commit()
    
    return jsonify(transaction.to_dict()), 201
```

**Request Body**:
```json
{
    "amount": 50.00,
    "category": "Food",
    "description": "Groceries",
    "transaction_type": "expense",
    "date": "2026-01-04"
}
```

#### PUT `/api/transactions/<id>`
**Protected**: Requires JWT
- Updates transaction if it belongs to authenticated user
- Returns 404 if transaction not found or doesn't belong to user

#### DELETE `/api/transactions/<id>`
**Protected**: Requires JWT
- Deletes transaction if it belongs to authenticated user
- Returns 404 if transaction not found or doesn't belong to user

#### GET `/api/transactions/summary`
**Protected**: Requires JWT

```python
@transactions_bp.route('/summary', methods=['GET'])
@jwt_required()
def get_summary():
    user_id = int(get_jwt_identity())
    
    # Optional date filtering
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    query = Transaction.query.filter_by(user_id=user_id)
    
    if start_date:
        query = query.filter(Transaction.date >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.filter(Transaction.date <= datetime.fromisoformat(end_date))
    
    transactions = query.all()
    
    total_income = sum(t.amount for t in transactions if t.transaction_type == 'income')
    total_expenses = sum(t.amount for t in transactions if t.transaction_type == 'expense')
    balance = total_income - total_expenses
    
    return jsonify({
        'total_income': total_income,
        'total_expenses': total_expenses,
        'balance': balance
    }), 200
```

**Response**:
```json
{
    "total_income": 5000.00,
    "total_expenses": 3200.00,
    "balance": 1800.00
}
```

#### GET `/api/transactions/analytics`
**Protected**: Requires JWT

```python
@transactions_bp.route('/analytics', methods=['GET'])
@jwt_required()
def get_analytics():
    user_id = int(get_jwt_identity())
    
    # Get transactions (with optional date filtering)
    transactions = query.all()
    
    # Category breakdown
    category_data = {}
    for t in transactions:
        if t.category not in category_data:
            category_data[t.category] = {'income': 0, 'expense': 0}
        category_data[t.category][t.transaction_type] += t.amount
    
    # Monthly trends
    monthly_data = {}
    for t in transactions:
        month_key = t.date.strftime('%Y-%m')
        if month_key not in monthly_data:
            monthly_data[month_key] = {'income': 0, 'expense': 0}
        monthly_data[month_key][t.transaction_type] += t.amount
    
    # Top categories
    expense_by_category = {
        cat: sum(t.amount for t in transactions 
                if t.category == cat and t.transaction_type == 'expense')
        for cat in set(t.category for t in transactions)
    }
    
    return jsonify({
        'category_breakdown': category_data,
        'monthly_trends': monthly_data,
        'top_expense_categories': sorted(
            expense_by_category.items(), 
            key=lambda x: x[1], 
            reverse=True
        )[:5]
    }), 200
```

**Response**:
```json
{
    "category_breakdown": {
        "Food": {"income": 0, "expense": 1200},
        "Salary": {"income": 5000, "expense": 0}
    },
    "monthly_trends": {
        "2026-01": {"income": 5000, "expense": 3200}
    },
    "top_expense_categories": [
        ["Food", 1200],
        ["Transport", 500],
        ["Entertainment", 300]
    ]
}
```

#### GET `/api/transactions/export`
**Protected**: Requires JWT

```python
@transactions_bp.route('/export', methods=['GET'])
@jwt_required()
def export_transactions():
    user_id = int(get_jwt_identity())
    transactions = Transaction.query.filter_by(user_id=user_id).all()
    
    # Create CSV
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(['Date', 'Category', 'Description', 'Type', 'Amount'])
    
    for t in transactions:
        writer.writerow([
            t.date.strftime('%Y-%m-%d'),
            t.category,
            t.description,
            t.transaction_type,
            t.amount
        ])
    
    # Return as downloadable file
    response = make_response(output.getvalue())
    response.headers['Content-Disposition'] = 'attachment; filename=transactions.csv'
    response.headers['Content-Type'] = 'text/csv'
    
    return response
```

Returns CSV file for download with all user transactions.

#### GET `/api/transactions/categories`
**Protected**: Requires JWT

Returns list of unique categories used by the user:
```json
["Food", "Transport", "Salary", "Entertainment"]
```

---

### 7. `routes/budgets.py`
**Purpose**: Budget management and tracking.

#### GET `/api/budgets/`
**Protected**: Requires JWT

```python
@budgets_bp.route('/', methods=['GET'])
@jwt_required()
def get_budgets():
    user_id = int(get_jwt_identity())
    
    # Get month and year from query params (default to current)
    month = request.args.get('month', datetime.now().month, type=int)
    year = request.args.get('year', datetime.now().year, type=int)
    
    budgets = Budget.query.filter_by(
        user_id=user_id, 
        month=month, 
        year=year
    ).all()
    
    # Calculate spending for each budget
    budget_data = []
    for budget in budgets:
        # Get transactions for this category in this month
        transactions = Transaction.query.filter(
            Transaction.user_id == user_id,
            Transaction.category == budget.category,
            Transaction.transaction_type == 'expense',
            db.extract('month', Transaction.date) == month,
            db.extract('year', Transaction.date) == year
        ).all()
        
        spent = sum(t.amount for t in transactions)
        
        budget_data.append({
            **budget.to_dict(),
            'spent': spent,
            'remaining': budget.amount - spent,
            'percentage': (spent / budget.amount * 100) if budget.amount > 0 else 0
        })
    
    return jsonify(budget_data), 200
```

**Query Parameters**:
- `month`: Month number (1-12)
- `year`: Year (YYYY)

**Response**:
```json
[
    {
        "id": 1,
        "category": "Food",
        "amount": 500.00,
        "month": 1,
        "year": 2026,
        "spent": 320.00,
        "remaining": 180.00,
        "percentage": 64.0
    }
]
```

#### POST `/api/budgets/`
**Protected**: Requires JWT

```python
@budgets_bp.route('/', methods=['POST'])
@jwt_required()
def create_budget():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    
    category = data.get('category')
    amount = data.get('amount')
    month = data.get('month', datetime.now().month)
    year = data.get('year', datetime.now().year)
    
    # Check if budget already exists
    existing = Budget.query.filter_by(
        user_id=user_id,
        category=category,
        month=month,
        year=year
    ).first()
    
    if existing:
        # Update existing budget
        existing.amount = float(amount)
        db.session.commit()
        return jsonify(existing.to_dict()), 200
    
    # Create new budget
    budget = Budget(
        user_id=user_id,
        category=category,
        amount=float(amount),
        month=month,
        year=year
    )
    
    db.session.add(budget)
    db.session.commit()
    
    return jsonify(budget.to_dict()), 201
```

**Request Body**:
```json
{
    "category": "Food",
    "amount": 500.00,
    "month": 1,
    "year": 2026
}
```

#### DELETE `/api/budgets/<id>`
**Protected**: Requires JWT
- Deletes budget if it belongs to authenticated user
- Returns 404 if budget not found or doesn't belong to user

---

## File Relationships

### Data Flow Diagram

```
┌─────────────┐
│   app.py    │  ← Entry point
└──────┬──────┘
       │
       ├──→ config.py      (Configuration)
       ├──→ models.py      (Database schema)
       ├──→ auth.py        (Not imported directly, used by routes)
       │
       └──→ routes/
            ├─→ users.py         (Uses: models.py, auth.py)
            ├─→ transactions.py  (Uses: models.py)
            └─→ budgets.py       (Uses: models.py)
```

### Dependency Chain

1. **app.py depends on**:
   - `config.py` for configuration
   - `models.py` for database initialization
   - `routes/*` for endpoint registration

2. **routes/users.py depends on**:
   - `models.py` for User model
   - `auth.py` for password hashing and JWT generation

3. **routes/transactions.py depends on**:
   - `models.py` for Transaction model
   - `flask_jwt_extended` for authentication

4. **routes/budgets.py depends on**:
   - `models.py` for Budget and Transaction models
   - `flask_jwt_extended` for authentication

5. **auth.py depends on**:
   - `models.py` for User model
   - `bcrypt` for password hashing
   - `flask_jwt_extended` for token generation

### Request Flow

```
Client Request
     ↓
app.py (CORS, JWT validation)
     ↓
routes/*.py (Business logic)
     ↓
models.py (Database operations)
     ↓
SQLite Database
     ↓
Response to Client
```

### Authentication Flow

```
1. User sends credentials → routes/users.py
2. users.py calls auth.py functions
3. auth.py hashes password, queries models.py
4. auth.py generates JWT token
5. Token returned to client
6. Client includes token in Authorization header
7. @jwt_required() decorator validates token
8. get_jwt_identity() retrieves user_id
9. Route accesses user's data
```

---

## Database Schema

### Entity Relationship Diagram

```
┌──────────────┐
│    users     │
├──────────────┤
│ id (PK)      │
│ username     │
│ email        │
│ password_hash│
│ created_at   │
└──────┬───────┘
       │
       │ 1:N
       │
   ┌───┴────────────────┬──────────────┐
   │                    │              │
   ▼                    ▼              ▼
┌─────────────┐  ┌──────────────┐  ┌──────────┐
│transactions │  │   budgets    │  │  (future)│
├─────────────┤  ├──────────────┤  └──────────┘
│ id (PK)     │  │ id (PK)      │
│ user_id(FK) │  │ user_id (FK) │
│ amount      │  │ category     │
│ category    │  │ amount       │
│ description │  │ month        │
│ type        │  │ year         │
│ date        │  │ created_at   │
└─────────────┘  └──────────────┘
```

### Indexes

Recommended indexes for performance:
```sql
CREATE INDEX idx_transaction_user_date ON transactions(user_id, date DESC);
CREATE INDEX idx_transaction_category ON transactions(category);
CREATE INDEX idx_budget_user_month_year ON budgets(user_id, month, year);
```

---

## API Endpoints

### Summary Table

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/api/users/register` | No | Register new user |
| POST | `/api/users/login` | No | Login user |
| GET | `/api/transactions/` | Yes | Get all transactions (with filters) |
| POST | `/api/transactions/` | Yes | Create transaction |
| PUT | `/api/transactions/<id>` | Yes | Update transaction |
| DELETE | `/api/transactions/<id>` | Yes | Delete transaction |
| GET | `/api/transactions/summary` | Yes | Get financial summary |
| GET | `/api/transactions/analytics` | Yes | Get analytics data |
| GET | `/api/transactions/categories` | Yes | Get unique categories |
| GET | `/api/transactions/export` | Yes | Export to CSV |
| GET | `/api/budgets/` | Yes | Get budgets |
| POST | `/api/budgets/` | Yes | Create/update budget |
| DELETE | `/api/budgets/<id>` | Yes | Delete budget |
| GET | `/api/health` | No | Health check |

---

## Authentication Flow

### Registration Process

```
1. Client → POST /api/users/register
   Body: {username, email, password}

2. users.py validates input

3. users.py → auth.register_user()

4. auth.py checks username/email uniqueness

5. auth.py → hash_password()

6. bcrypt generates salt and hash

7. models.User created and saved to database

8. Response: {user data} (no token yet)
```

### Login Process

```
1. Client → POST /api/users/login
   Body: {username, password}

2. users.py validates input

3. users.py → auth.login_user()

4. auth.py queries database for user

5. auth.py → verify_password()

6. bcrypt compares hashes

7. auth.py → create_access_token(identity=str(user.id))

8. JWT library generates signed token

9. Response: {user data, access_token}
```

### Authenticated Request Process

```
1. Client → GET /api/transactions/
   Headers: {Authorization: "Bearer <token>"}

2. Flask receives request

3. @jwt_required() decorator intercepts

4. JWT library validates token:
   - Checks signature
   - Checks expiration
   - Extracts identity (user_id)

5. If valid: request proceeds
   If invalid: return 401/422 error

6. Route handler calls get_jwt_identity()

7. Returns user_id as string

8. Convert to int: user_id = int(get_jwt_identity())

9. Query database for user's data

10. Return response
```

---

## Error Handling

### HTTP Status Codes

- **200 OK**: Successful GET/PUT/DELETE
- **201 Created**: Successful POST (created resource)
- **400 Bad Request**: Validation error or missing fields
- **401 Unauthorized**: Invalid/missing/expired token
- **404 Not Found**: Resource doesn't exist or doesn't belong to user
- **422 Unprocessable Entity**: JWT token malformed
- **500 Internal Server Error**: Server-side error

### Error Response Format

```json
{
    "error": "Error type",
    "message": "Detailed error message"
}
```

### Common Errors

**Authentication Errors**:
```json
// Missing token
{
    "error": "Authorization required",
    "message": "Request does not contain a valid token"
}

// Expired token
{
    "error": "Token has expired",
    "message": "Please login again"
}

// Invalid token
{
    "error": "Invalid token",
    "message": "Token verification failed"
}
```

**Validation Errors**:
```json
// Missing fields
{
    "error": "Missing required fields"
}

// Invalid transaction type
{
    "error": "Invalid transaction type"
}
```

### Error Handling Best Practices

1. **Always wrap database operations in try-except**:
```python
try:
    db.session.add(transaction)
    db.session.commit()
except Exception as e:
    db.session.rollback()
    return jsonify({'error': str(e)}), 500
```

2. **Validate input before processing**:
```python
if not amount or not category:</parameter>
<parameter name="new_str">2. **Validate input before processing**:
```python
if not amount or not category:
    return jsonify({'error': 'Missing required fields'}), 400
```

3. **Log errors for debugging**:
```python
print(f"Error in create_transaction: {str(e)}")
```

---

## Testing

### Manual Testing with curl

#### Register User
```bash
curl -X POST http://localhost:5000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"test123"}'
```

#### Login
```bash
curl -X POST http://localhost:5000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"test123"}'
```

#### Create Transaction (with token)
```bash
TOKEN="your_token_here"
curl -X POST http://localhost:5000/api/transactions/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"amount":100,"category":"Food","description":"Groceries","transaction_type":"expense","date":"2026-01-04"}'
```

#### Get Transactions
```bash
curl -X GET http://localhost:5000/api/transactions/ \
  -H "Authorization: Bearer $TOKEN"
```

#### Get Summary
```bash
curl -X GET http://localhost:5000/api/transactions/summary \
  -H "Authorization: Bearer $TOKEN"
```

### Testing Checklist

- [ ] User can register with unique username and email
- [ ] Registration fails for duplicate username/email
- [ ] User can login with correct credentials
- [ ] Login fails with incorrect credentials
- [ ] JWT token is generated and returned
- [ ] Authenticated endpoints reject requests without token
- [ ] Authenticated endpoints accept valid tokens
- [ ] User can create transactions
- [ ] User can only see their own transactions
- [ ] Filtering works correctly (category, type, date)
- [ ] Summary calculations are accurate
- [ ] Analytics data is correctly aggregated
- [ ] CSV export contains all transactions
- [ ] Budgets are created and retrieved correctly
- [ ] Budget spending is calculated accurately
- [ ] User can update and delete their own data
- [ ] User cannot access other users' data

---

## Future Improvements

### Security Enhancements

1. **Rate Limiting**
```python
   from flask_limiter import Limiter
   
   limiter = Limiter(
       app,
       key_func=get_remote_address,
       default_limits=["200 per day", "50 per hour"]
   )
   
   @limiter.limit("5 per minute")
   @users_bp.route('/login', methods=['POST'])
   def login():
       # Login logic
```
   - Prevents brute force attacks
   - Protects against DDoS

2. **Token Refresh**
```python
   from flask_jwt_extended import create_refresh_token
   
   # On login
   access_token = create_access_token(identity=str(user.id))
   refresh_token = create_refresh_token(identity=str(user.id))
   
   # Refresh endpoint
   @users_bp.route('/refresh', methods=['POST'])
   @jwt_required(refresh=True)
   def refresh():
       identity = get_jwt_identity()
       new_token = create_access_token(identity=identity)
       return jsonify({'access_token': new_token}), 200
```
   - Shorter-lived access tokens (15 minutes)
   - Longer-lived refresh tokens (30 days)
   - Better security without frequent re-authentication

3. **Password Requirements**
```python
   import re
   
   def validate_password(password):
       if len(password) < 8:
           return False, "Password must be at least 8 characters"
       if not re.search(r"[A-Z]", password):
           return False, "Password must contain uppercase letter"
       if not re.search(r"[a-z]", password):
           return False, "Password must contain lowercase letter"
       if not re.search(r"\d", password):
           return False, "Password must contain digit"
       return True, None
```

4. **Email Verification**
```python
   from itsdangerous import URLSafeTimedSerializer
   
   def generate_verification_token(email):
       serializer = URLSafeTimedSerializer(app.config['SECRET_KEY'])
       return serializer.dumps(email, salt='email-verification')
   
   @users_bp.route('/verify/<token>')
   def verify_email(token):
       # Verify token and mark user as verified
```

5. **Two-Factor Authentication (2FA)**
```python
   import pyotp
   
   # Generate secret
   secret = pyotp.random_base32()
   
   # Verify TOTP
   totp = pyotp.TOTP(secret)
   is_valid = totp.verify(user_provided_code)
```

### Performance Optimizations

1. **Database Connection Pooling**
```python
   # config.py
   SQLALCHEMY_ENGINE_OPTIONS = {
       'pool_size': 10,
       'pool_recycle': 3600,
       'pool_pre_ping': True
   }
```

2. **Query Optimization**
```python
   # Use select_related for relationships
   transactions = Transaction.query.options(
       joinedload(Transaction.user)
   ).filter_by(user_id=user_id).all()
   
   # Add composite indexes
   Index('idx_user_date_type', 
         Transaction.user_id, 
         Transaction.date, 
         Transaction.transaction_type)
```

3. **Caching with Redis**
```python
   from flask_caching import Cache
   
   cache = Cache(app, config={
       'CACHE_TYPE': 'redis',
       'CACHE_REDIS_URL': 'redis://localhost:6379/0'
   })
   
   @cache.memoize(timeout=300)
   def get_user_summary(user_id):
       # Expensive calculation
       return summary
```

4. **Pagination**
```python
   @transactions_bp.route('/', methods=['GET'])
   @jwt_required()
   def get_transactions():
       page = request.args.get('page', 1, type=int)
       per_page = request.args.get('per_page', 50, type=int)
       
       pagination = Transaction.query.filter_by(user_id=user_id)\
           .order_by(Transaction.date.desc())\
           .paginate(page=page, per_page=per_page)
       
       return jsonify({
           'transactions': [t.to_dict() for t in pagination.items],
           'total': pagination.total,
           'pages': pagination.pages,
           'current_page': page
       }), 200
```

### Feature Additions

1. **Recurring Transactions**
```python
   class RecurringTransaction(db.Model):
       id = Column(Integer, primary_key=True)
       user_id = Column(Integer, ForeignKey('users.id'))
       amount = Column(Float, nullable=False)
       category = Column(String(50))
       frequency = Column(String(20))  # 'daily', 'weekly', 'monthly'
       start_date = Column(DateTime)
       end_date = Column(DateTime, nullable=True)
       next_occurrence = Column(DateTime)
```

2. **Shared Budgets/Accounts**
```python
   class Account(db.Model):
       id = Column(Integer, primary_key=True)
       name = Column(String(100))
       owner_id = Column(Integer, ForeignKey('users.id'))
       
   class AccountMember(db.Model):
       id = Column(Integer, primary_key=True)
       account_id = Column(Integer, ForeignKey('accounts.id'))
       user_id = Column(Integer, ForeignKey('users.id'))
       role = Column(String(20))  # 'owner', 'admin', 'member'
```

3. **Attachments/Receipts**
```python
   class Attachment(db.Model):
       id = Column(Integer, primary_key=True)
       transaction_id = Column(Integer, ForeignKey('transactions.id'))
       filename = Column(String(200))
       file_path = Column(String(500))
       file_size = Column(Integer)
       mime_type = Column(String(100))
       uploaded_at = Column(DateTime, default=datetime.utcnow)
```

4. **Notifications**
```python
   class Notification(db.Model):
       id = Column(Integer, primary_key=True)
       user_id = Column(Integer, ForeignKey('users.id'))
       type = Column(String(50))  # 'budget_alert', 'large_transaction'
       message = Column(Text)
       read = Column(Boolean, default=False)
       created_at = Column(DateTime, default=datetime.utcnow)
```

5. **Savings Goals**
```python
   class SavingsGoal(db.Model):
       id = Column(Integer, primary_key=True)
       user_id = Column(Integer, ForeignKey('users.id'))
       name = Column(String(100))
       target_amount = Column(Float)
       current_amount = Column(Float, default=0)
       deadline = Column(DateTime)
       created_at = Column(DateTime, default=datetime.utcnow)
```

### Code Quality Improvements

1. **Add Unit Tests**
```python
   # tests/test_transactions.py
   import unittest
   from app import create_app
   from models import db, User, Transaction
   
   class TransactionTestCase(unittest.TestCase):
       def setUp(self):
           self.app = create_app()
           self.client = self.app.test_client()
           
           with self.app.app_context():
               db.create_all()
       
       def test_create_transaction(self):
           # Test logic
```

2. **Add API Documentation (OpenAPI/Swagger)**
```python
   from flask_swagger_ui import get_swaggerui_blueprint
   
   SWAGGER_URL = '/api/docs'
   API_URL = '/static/swagger.json'
   
   swaggerui_blueprint = get_swaggerui_blueprint(
       SWAGGER_URL,
       API_URL,
       config={'app_name': "Finance Tracker API"}
   )
   app.register_blueprint(swaggerui_blueprint)
```

3. **Add Input Validation with Marshmallow**
```python
   from marshmallow import Schema, fields, validate
   
   class TransactionSchema(Schema):
       amount = fields.Float(required=True, validate=validate.Range(min=0.01))
       category = fields.Str(required=True, validate=validate.Length(min=1, max=50))
       description = fields.Str(validate=validate.Length(max=200))
       transaction_type = fields.Str(required=True, 
                                    validate=validate.OneOf(['income', 'expense']))
       date = fields.DateTime()
```

4. **Add Logging**
```python
   import logging
   from logging.handlers import RotatingFileHandler
   
   if not app.debug:
       file_handler = RotatingFileHandler('logs/finance_tracker.log', 
                                         maxBytes=10240, 
                                         backupCount=10)
       file_handler.setFormatter(logging.Formatter(
           '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
       ))
       file_handler.setLevel(logging.INFO)
       app.logger.addHandler(file_handler)
       app.logger.setLevel(logging.INFO)
       app.logger.info('Finance Tracker startup')
```

5. **Environment-Specific Configuration**
```python
   # config.py
   class DevelopmentConfig(Config):
       DEBUG = True
       SQLALCHEMY_DATABASE_URI = 'sqlite:///dev.db'
   
   class ProductionConfig(Config):
       DEBUG = False
       SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL')
   
   class TestingConfig(Config):
       TESTING = True
       SQLALCHEMY_DATABASE_URI = 'sqlite:///test.db'
   
   config = {
       'development': DevelopmentConfig,
       'production': ProductionConfig,
       'testing': TestingConfig
   }
```

### Database Improvements

1. **Migration to PostgreSQL**
```python
   # requirements.txt
   psycopg2-binary==2.9.9
   
   # config.py
   SQLALCHEMY_DATABASE_URI = os.getenv(
       'DATABASE_URL',
       'postgresql://user:password@localhost:5432/finance_tracker'
   )
```

2. **Database Migrations with Alembic**
```bash
   pip install Flask-Migrate
   flask db init
   flask db migrate -m "Initial migration"
   flask db upgrade
```

3. **Soft Deletes**
```python
   class Transaction(db.Model):
       # ... existing fields
       deleted_at = Column(DateTime, nullable=True)
       
       @property
       def is_deleted(self):
           return self.deleted_at is not None
   
   # Override query to exclude soft-deleted
   Transaction.query = db.session.query_property(
       db.Query(Transaction).filter_by(deleted_at=None)
   )
```

4. **Audit Trail**
```python
   class AuditLog(db.Model):
       id = Column(Integer, primary_key=True)
       user_id = Column(Integer, ForeignKey('users.id'))
       action = Column(String(50))  # 'create', 'update', 'delete'
       table_name = Column(String(50))
       record_id = Column(Integer)
       old_values = Column(JSON)
       new_values = Column(JSON)
       timestamp = Column(DateTime, default=datetime.utcnow)
```

---

## Deployment Considerations

### Production Checklist

- [ ] Change SECRET_KEY and JWT_SECRET_KEY to strong, random values
- [ ] Set DEBUG = False
- [ ] Use production-grade database (PostgreSQL/MySQL)
- [ ] Enable HTTPS only
- [ ] Set up proper CORS origins (not *)
- [ ] Implement rate limiting
- [ ] Set up logging to file/service
- [ ] Configure proper error handling (no stack traces to client)
- [ ] Set up database backups
- [ ] Use environment variables for all secrets
- [ ] Set up monitoring (Sentry, New Relic, etc.)
- [ ] Configure proper WSGI server (Gunicorn, uWSGI)
- [ ] Set up reverse proxy (Nginx)
- [ ] Implement security headers
- [ ] Set up SSL certificates
- [ ] Configure firewall rules

### Production Server Setup
```bash
# Install Gunicorn
pip install gunicorn

# Run with Gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 'app:create_app()'

# Nginx configuration
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Contributing Guidelines

### Code Style
- Follow PEP 8 style guide
- Use type hints where appropriate
- Write docstrings for all functions
- Keep functions small and focused

### Git Workflow
1. Create feature branch from main
2. Make changes with descriptive commits
3. Write/update tests
4. Submit pull request
5. Address review comments

### Pull Request Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] All tests passing

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings generated
```

---

## Support and Contact

For questions, issues, or contributions:
- Open an issue on GitHub
- Email: support@example.com
- Documentation: https://docs.example.com

---

## License

MIT License - See LICENSE file for details

---

**Last Updated**: January 4, 2026  
**Version**: 2.0  
**Maintained By**: Development Team</parameter>
