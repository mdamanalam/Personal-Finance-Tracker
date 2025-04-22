from flask import Flask
from flask_jwt_extended import JWTManager
from .auth import auth_bp

def create_app():
    app = Flask(__name__)
    
    app.config.from_object('config.Config')
    
    jwt = JWTManager(app)
    
    app.register_blueprint(auth_bp, url_prefix='/auth')
    
    return app