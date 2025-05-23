import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS # Import CORS
from datetime import datetime
import os
import uuid # For generating unique IDs

# Initialize Flask app
app = Flask(__name__)
CORS(app) # Enable CORS for all routes, allowing requests from your Next.js app

# Define the path for the CSV file
DATA_FILE = 'expenses.csv'
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
CSV_PATH = os.path.join(BASE_DIR, DATA_FILE)

# Helper function to load expenses
def load_expenses():
    if not os.path.exists(CSV_PATH):
        df = pd.DataFrame(columns=['id', 'date', 'category', 'amount', 'description'])
        df.to_csv(CSV_PATH, index=False)
        return df
    try:
        df = pd.read_csv(CSV_PATH)
        # Ensure 'date' is datetime and 'amount' is numeric, handle potential errors
        df['date'] = pd.to_datetime(df['date'], errors='coerce')
        df['amount'] = pd.to_numeric(df['amount'], errors='coerce')
        df.dropna(subset=['date', 'amount'], inplace=True) # Drop rows where conversion failed
        return df
    except pd.errors.EmptyDataError:
        df = pd.DataFrame(columns=['id', 'date', 'category', 'amount', 'description'])
        return df
    except Exception as e:
        print(f"Error loading CSV: {e}")
        # Return an empty DataFrame in case of other errors to prevent app crash
        return pd.DataFrame(columns=['id', 'date', 'category', 'amount', 'description'])

# Helper function to save expenses
def save_expenses(df):
    # Convert date back to string for CSV storage if it's in datetime format
    if 'date' in df.columns and pd.api.types.is_datetime64_any_dtype(df['date']):
        df['date'] = df['date'].dt.strftime('%Y-%m-%d')
    df.to_csv(CSV_PATH, index=False)

# --- API Routes ---

@app.route('/api/expenses', methods=['GET', 'POST'])
def handle_expenses():
    if request.method == 'GET':
        expenses_df = load_expenses()
        return jsonify(expenses_df.to_dict(orient='records'))
    
    elif request.method == 'POST':
        try:
            data = request.json
            if not all(k in data for k in ('date', 'category', 'amount')):
                return jsonify({'error': 'Missing required fields: date, category, amount'}), 400

            new_expense = {
                'id': str(uuid.uuid4()), # Generate a unique ID
                'date': pd.to_datetime(data['date']).strftime('%Y-%m-%d'),
                'category': data['category'],
                'amount': float(data['amount']),
                'description': data.get('description', '')
            }
            
            expenses_df = load_expenses()
            new_expense_df = pd.DataFrame([new_expense])
            expenses_df = pd.concat([expenses_df, new_expense_df], ignore_index=True)
            save_expenses(expenses_df)
            return jsonify({'message': 'Expense added successfully', 'expense': new_expense}), 201
        except ValueError:
            return jsonify({'error': 'Invalid amount or date format'}), 400
        except Exception as e:
            return jsonify({'error': str(e)}), 500

# --- Spending Insights Dashboard Features ---

@app.route('/api/insights/summary', methods=['GET'])
def get_insights_summary():
    expenses_df = load_expenses()
    if expenses_df.empty:
        return jsonify({'total_spending': 0, 'average_transaction': 0, 'count': 0})

    total_spending = expenses_df['amount'].sum()
    average_transaction = expenses_df['amount'].mean() if not expenses_df.empty else 0
    count = len(expenses_df)
    
    return jsonify({
        'total_spending': round(float(total_spending), 2),
        'average_transaction': round(float(average_transaction), 2),
        'count': count
    })

@app.route('/api/insights/spending_by_category', methods=['GET'])
def get_spending_by_category():
    expenses_df = load_expenses()
    if expenses_df.empty:
        return jsonify({})
        
    spending_by_category = expenses_df.groupby('category')['amount'].sum().round(2)
    return jsonify(spending_by_category.apply(float).to_dict())

@app.route('/api/insights/monthly_spending', methods=['GET'])
def get_monthly_spending():
    expenses_df = load_expenses()
    if expenses_df.empty:
        return jsonify({})

    # Ensure 'date' is datetime for resampling
    expenses_df['date'] = pd.to_datetime(expenses_df['date'])
    expenses_df['month_year'] = expenses_df['date'].dt.to_period('M').astype(str)
    monthly_spending = expenses_df.groupby('month_year')['amount'].sum().round(2)
    monthly_spending = monthly_spending.sort_index() # Ensure chronological order
    return jsonify(monthly_spending.apply(float).to_dict())

# --- Expense Prediction Feature ---

@app.route('/api/predict/next_month_total', methods=['GET'])
def predict_next_month_total():
    expenses_df = load_expenses()
    if expenses_df.empty:
        return jsonify({'prediction': 0, 'message': 'Not enough data for prediction.'})

    expenses_df['date'] = pd.to_datetime(expenses_df['date'])
    monthly_totals = expenses_df.set_index('date').resample('M')['amount'].sum()
    
    if len(monthly_totals) < 1:
         return jsonify({'prediction': 0, 'message': 'Not enough monthly data for prediction.'})

    prediction_val = 0
    message = ""
    if len(monthly_totals) < 3:
        prediction_val = monthly_totals.mean() if len(monthly_totals) > 0 else 0
        message = f"Prediction based on average of {len(monthly_totals)} available month(s)."
    else:
        last_n_months_avg = monthly_totals.iloc[-3:].mean() # Average of the last 3 months
        prediction_val = last_n_months_avg
        message = "Prediction based on the average of the last 3 months' total spending."
        
    return jsonify({'prediction': round(float(prediction_val), 2), 'message': message})


if __name__ == '__main__':
    # Create expenses.csv if it doesn't exist
    if not os.path.exists(CSV_PATH):
        df = pd.DataFrame(columns=['id', 'date', 'category', 'amount', 'description'])
        df.to_csv(CSV_PATH, index=False)
    app.run(debug=True, port=5001) # Run on a different port than Next.js, e.g., 5001