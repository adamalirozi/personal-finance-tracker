import bcrypt
from flask_jwt_extended import create_access_token
from models import User, db

def hash_password(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password, password_hash):
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))

def register_user(username, email, password):
    if User.query.filter_by(username=username).first():
        return None, 'Username already exists'
    
    if User.query.filter_by(email=email).first():
        return None, 'Email already exists'
    
    password_hash = hash_password(password)
    user = User(username=username, email=email, password_hash=password_hash)
    
    db.session.add(user)
    db.session.commit()
    
    return user, None

def login_user(username, password):
    user = User.query.filter_by(username=username).first()
    
    if not user or not verify_password(password, user.password_hash):
        return None, None
    
    access_token = create_access_token(identity=str(user.id))
    return user, access_token
