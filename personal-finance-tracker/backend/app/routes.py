from flask import Blueprint, jsonify

main = Blueprint('main', __name__)

@main.route('/api', methods=['GET'])
def api_home():
    return jsonify({"message": "Welcome to the Personal Finance Tracker API!"})