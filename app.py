from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config import Config
from models import db
from routes.users import users_bp
from routes.transactions import transactions_bp
from routes.budgets import budgets_bp 

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Configure CORS properly
    CORS(app, 
         resources={r"/api/*": {"origins": "*"}},
         supports_credentials=True,
         allow_headers=["Content-Type", "Authorization"],
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])
    
    db.init_app(app)
    jwt = JWTManager(app)
    
    # Add detailed error handlers for JWT
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        print("JWT Error: Token has expired")
        return jsonify({
            'error': 'Token has expired',
            'message': 'Please login again'
        }), 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        print(f"JWT Error: Invalid token - {error}")
        return jsonify({
            'error': 'Invalid token',
            'message': str(error)
        }), 422
    
    @jwt.unauthorized_loader
    def missing_token_callback(error):
        print(f"JWT Error: Missing token - {error}")
        return jsonify({
            'error': 'Authorization required',
            'message': 'Request does not contain a valid token'
        }), 401
    
    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        print("JWT Error: Token has been revoked")
        return jsonify({
            'error': 'Token revoked',
            'message': 'The token has been revoked'
        }), 401
    
    # Add request logging
    @app.before_request
    def log_request_info():
        from flask import request
        print(f"Request: {request.method} {request.path}")
        if 'Authorization' in request.headers:
            auth_header = request.headers.get('Authorization')
            print(f"Authorization header present: {auth_header[:20]}...")
        else:
            print("No Authorization header")
    
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(transactions_bp, url_prefix='/api/transactions')
    app.register_blueprint(budgets_bp, url_prefix='/api/budgets')  # NEW
    # Add a test route
    @app.route('/api/health', methods=['GET'])
    def health():
        return jsonify({'status': 'healthy'}), 200
    
    with app.app_context():
        db.create_all()
        print("Database tables created successfully")
    
    print("Flask app initialized successfully")
    print(f"JWT_SECRET_KEY configured: {bool(app.config.get('JWT_SECRET_KEY'))}")
    print(f"JWT_TOKEN_LOCATION: {app.config.get('JWT_TOKEN_LOCATION')}")
    
    return app

if __name__ == '__main__':
    app = create_app()
    print("\n" + "="*50)
    print("Starting Personal Finance Tracker Backend")
    print("Backend running on http://127.0.0.1:5000")
    print("="*50 + "\n")
    app.run(debug=True, port=5000, host='127.0.0.1')
