from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Budget, Transaction, db
from datetime import datetime

budgets_bp = Blueprint('budgets', __name__)

@budgets_bp.route('/', methods=['GET'])
@jwt_required()
def get_budgets():
    try:
        user_id = int(get_jwt_identity())
        
        # Get month and year from query params, default to current
        month = request.args.get('month', datetime.now().month, type=int)
        year = request.args.get('year', datetime.now().year, type=int)
        
        budgets = Budget.query.filter_by(user_id=user_id, month=month, year=year).all()
        
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
    except Exception as e:
        print(f"Error in get_budgets: {str(e)}")
        return jsonify({'error': str(e)}), 500

@budgets_bp.route('/', methods=['POST'])
@jwt_required()
def create_budget():
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        
        category = data.get('category')
        amount = data.get('amount')
        month = data.get('month', datetime.now().month)
        year = data.get('year', datetime.now().year)
        
        if not category or not amount:
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Check if budget already exists for this category/month/year
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
    except Exception as e:
        print(f"Error in create_budget: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@budgets_bp.route('/<int:budget_id>', methods=['DELETE'])
@jwt_required()
def delete_budget(budget_id):
    try:
        user_id = int(get_jwt_identity())
        budget = Budget.query.filter_by(id=budget_id, user_id=user_id).first()
        
        if not budget:
            return jsonify({'error': 'Budget not found'}), 404
        
        db.session.delete(budget)
        db.session.commit()
        
        return jsonify({'message': 'Budget deleted successfully'}), 200
    except Exception as e:
        print(f"Error in delete_budget: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
