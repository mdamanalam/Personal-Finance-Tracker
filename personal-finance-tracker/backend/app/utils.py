def hash_password(password):
    # Function to hash a password
    from werkzeug.security import generate_password_hash
    return generate_password_hash(password)

def verify_password(stored_password, provided_password):
    # Function to verify a hashed password
    from werkzeug.security import check_password_hash
    return check_password_hash(stored_password, provided_password)

def create_jwt_token(user_id):
    # Function to create a JWT token
    from flask_jwt_extended import create_access_token
    return create_access_token(identity=user_id)