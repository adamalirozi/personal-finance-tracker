from flask import Blueprint, request, jsonify, make_response
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Transaction, db
from datetime import datetime
import csv
from io import StringIO

transactions_bp = Blueprint('transactions', __name__)

@transactions_bp.route('/', methods=['GET'])
@jwt_required()
def get_transactions():
    try:
        user_id = int(get_jwt_identity())
        
        # Get filter parameters
        category = request.args.get('category')
        transaction_type = request.args.get('type')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Build query
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
        
        print(f"Found {len(transactions)} transactions with filters")
        
        return jsonify([t.to_dict() for t in transactions]), 200
    except Exception as e:
        print(f"Error in get_transactions: {str(e)}")
        return jsonify({'error': str(e)}), 500

@transactions_bp.route('/export', methods=['GET'])
@jwt_required()
def export_transactions():
    try:
        user_id = int(get_jwt_identity())
        
        # Get all user transactions
        transactions = Transaction.query.filter_by(user_id=user_id).order_by(Transaction.date.desc()).all()
        
        # Create CSV
        output = StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow(['Date', 'Category', 'Description', 'Type', 'Amount'])
        
        # Write data
        for t in transactions:
            writer.writerow([
                t.date.strftime('%Y-%m-%d'),
                t.category,
                t.description,
                t.transaction_type,
                t.amount
            ])
        
        # Create response
        response = make_response(output.getvalue())
        response.headers['Content-Disposition'] = 'attachment; filename=transactions.csv'
        response.headers['Content-Type'] = 'text/csv'
        
        return response
    except Exception as e:
        print(f"Error in export_transactions: {str(e)}")
        return jsonify({'error': str(e)}), 500

@transactions_bp.route('/analytics', methods=['GET'])
@jwt_required()
def get_analytics():
    try:
        user_id = int(get_jwt_identity())
        
        # Get date range from query params
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        query = Transaction.query.filter_by(user_id=user_id)
        
        if start_date:
            query = query.filter(Transaction.date >= datetime.fromisoformat(start_date))
        if end_date:
            query = query.filter(Transaction.date <= datetime.fromisoformat(end_date))
        
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
        expense_by_category = {}
        income_by_category = {}
        
        for t in transactions:
            if t.transaction_type == 'expense':
                expense_by_category[t.category] = expense_by_category.get(t.category, 0) + t.amount
            else:
                income_by_category[t.category] = income_by_category.get(t.category, 0) + t.amount
        
        return jsonify({
            'category_breakdown': category_data,
            'monthly_trends': monthly_data,
            'top_expense_categories': sorted(expense_by_category.items(), key=lambda x: x[1], reverse=True)[:5],
            'top_income_categories': sorted(income_by_category.items(), key=lambda x: x[1], reverse=True)[:5]
        }), 200
    except Exception as e:
        print(f"Error in get_analytics: {str(e)}")
        return jsonify({'error': str(e)}), 500

@transactions_bp.route('/', methods=['POST'])
@jwt_required()
def create_transaction():
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        
        amount = data.get('amount')
        category = data.get('category')
        description = data.get('description', '')
        transaction_type = data.get('transaction_type')
        date_str = data.get('date')
        
        if not amount or not category or not transaction_type:
            return jsonify({'error': 'Missing required fields'}), 400
        
        if transaction_type not in ['income', 'expense']:
            return jsonify({'error': 'Invalid transaction type'}), 400
        
        if date_str:
            try:
                transaction_date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            except:
                try:
                    transaction_date = datetime.strptime(date_str, '%Y-%m-%d')
                except:
                    transaction_date = datetime.utcnow()
        else:
            transaction_date = datetime.utcnow()
        
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
        
        print(f"Transaction created successfully: {transaction.id}")
        
        return jsonify(transaction.to_dict()), 201
    except Exception as e:
        print(f"Error in create_transaction: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@transactions_bp.route('/<int:transaction_id>', methods=['PUT'])
@jwt_required()
def update_transaction(transaction_id):
    try:
        user_id = int(get_jwt_identity())
        transaction = Transaction.query.filter_by(id=transaction_id, user_id=user_id).first()
        
        if not transaction:
            return jsonify({'error': 'Transaction not found'}), 404
        
        data = request.get_json()
        
        transaction.amount = float(data.get('amount', transaction.amount))
        transaction.category = data.get('category', transaction.category)
        transaction.description = data.get('description', transaction.description)
        transaction.transaction_type = data.get('transaction_type', transaction.transaction_type)
        
        if data.get('date'):
            try:
                transaction.date = datetime.fromisoformat(data.get('date').replace('Z', '+00:00'))
            except:
                try:
                    transaction.date = datetime.strptime(data.get('date'), '%Y-%m-%d')
                except:
                    pass
        
        db.session.commit()
        
        return jsonify(transaction.to_dict()), 200
    except Exception as e:
        print(f"Error in update_transaction: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@transactions_bp.route('/<int:transaction_id>', methods=['DELETE'])
@jwt_required()
def delete_transaction(transaction_id):
    try:
        user_id = int(get_jwt_identity())
        transaction = Transaction.query.filter_by(id=transaction_id, user_id=user_id).first()
        
        if not transaction:
            return jsonify({'error': 'Transaction not found'}), 404
        
        db.session.delete(transaction)
        db.session.commit()
        
        return jsonify({'message': 'Transaction deleted successfully'}), 200
    except Exception as e:
        print(f"Error in delete_transaction: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@transactions_bp.route('/summary', methods=['GET'])
@jwt_required()
def get_summary():
    try:
        user_id = int(get_jwt_identity())
        
        # Get date range from query params
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
    except Exception as e:
        print(f"Error in get_summary: {str(e)}")
        return jsonify({'error': str(e)}), 500

@transactions_bp.route('/categories', methods=['GET'])
@jwt_required()
def get_categories():
    try:
        user_id = int(get_jwt_identity())
        
        # Get unique categories
        categories = db.session.query(Transaction.category).filter_by(user_id=user_id).distinct().all()
        category_list = [c[0] for c in categories]
        
        return jsonify(category_list), 200
    except Exception as e:
        print(f"Error in get_categories: {str(e)}")
        return jsonify({'error': str(e)}), 500

