import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS # Import CORS
from datetime import datetime
import os
import numpy as np # For numerical operations
from sklearn.linear_model import LinearRegression # For ML prediction
import uuid # For generating unique IDs
from werkzeug.utils import secure_filename # For secure file uploads


# Initialize Flask app
app = Flask(__name__)
CORS(app) # Enable CORS for all routes, allowing requests from your Next.js app

# Define the path for the CSV file
# --- Configuration ---
DATA_FILE = 'expenses.csv'
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
CSV_PATH = os.path.join(BASE_DIR, DATA_FILE)
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
ALLOWED_EXTENSIONS = {'csv'}

# Create upload folder if it doesn't exist
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# --- Helper Functions ---

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

# Helper function to check allowed file extensions
def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Helper function to find actual column name from a list of possibilities
def find_column_name(df_columns, potential_names):
    df_columns_lower = [col.lower() for col in df_columns]
    for name in potential_names:
        if name.lower() in df_columns_lower:
            return df_columns[df_columns_lower.index(name.lower())] # Return original casing
    return None
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

# --- CSV Upload Feature ---
@app.route('/api/expenses/upload_csv', methods=['POST'])
def upload_csv():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part in the request'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        # Save to a temporary location within the UPLOAD_FOLDER
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        try:
            file.save(filepath) # Save the file first
            
            # Now process the saved file
            imported_count = 0
            failed_rows_details = []
            new_expenses_list = []

            try:
                upload_df = pd.read_csv(filepath)
                
                # Define potential column names for flexibility
                column_map_potentials = {
                    'date_col': ['date', 'transaction date', 'posting date'],
                    'desc_col': ['description', 'narrative', 'details', 'transaction details', 'memo'],
                    'amount_col': ['amount', 'debit', 'value', 'expense'] # Assumes positive values for expenses
                }

                actual_cols = {}
                for key, potentials in column_map_potentials.items():
                    found_col = find_column_name(upload_df.columns, potentials)
                    if not found_col and key in ['date_col', 'amount_col']: # Date and Amount are essential
                         return jsonify({'error': f'Missing required column. Could not find a column for: {key.replace("_col","")}. Expected one of {potentials}'}), 400
                    actual_cols[key] = found_col
                
                for index, row in upload_df.iterrows():
                    try:
                        date_val = pd.to_datetime(row[actual_cols['date_col']]).strftime('%Y-%m-%d')
                        # Description is optional in the CSV, default to empty string if column not found or empty
                        description_val = str(row[actual_cols['desc_col']]) if actual_cols['desc_col'] and actual_cols['desc_col'] in row and pd.notna(row[actual_cols['desc_col']]) else "Uploaded via CSV"
                        amount_val = float(row[actual_cols['amount_col']])

                        if amount_val <= 0: # Expenses should be positive amounts
                            failed_rows_details.append({'row_number': index + 2, 'data': row.to_dict(), 'reason': 'Amount must be a positive value for an expense.'})
                            continue

                        new_expense = {
                            'id': str(uuid.uuid4()),
                            'date': date_val,
                            'category': 'Uncategorized', # Default category for uploaded expenses
                            'amount': amount_val,
                            'description': description_val
                        }
                        new_expenses_list.append(new_expense)
                        imported_count += 1
                    except Exception as e:
                        failed_rows_details.append({'row_number': index + 2, 'data': row.to_dict(), 'reason': f'Error parsing row: {str(e)}'})

                if new_expenses_list:
                    expenses_df = load_expenses()
                    new_expenses_to_add_df = pd.DataFrame(new_expenses_list)
                    expenses_df = pd.concat([expenses_df, new_expenses_to_add_df], ignore_index=True)
                    save_expenses(expenses_df)
                
                response_message = f'{imported_count} expenses imported successfully.'
                if failed_rows_details:
                    response_message += f' {len(failed_rows_details)} rows failed to import.'
                
                return jsonify({
                    'message': response_message,
                    'imported_count': imported_count,
                    'failed_rows_details': failed_rows_details if failed_rows_details else "None"
                }), 200

            except pd.errors.EmptyDataError:
                return jsonify({'error': 'Uploaded CSV file is empty.'}), 400
            except Exception as e: # Catch-all for processing errors
                app.logger.error(f"Error processing CSV content: {e}")
                return jsonify({'error': f'Error processing CSV content: {str(e)}'}), 500
        finally: # Ensure cleanup of the temporary file
            if os.path.exists(filepath):
                os.remove(filepath)
    else:
        return jsonify({'error': 'File type not allowed. Please upload a CSV file.'}), 400

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
    if expenses_df.empty: # Check if DataFrame is empty after loading
        return jsonify({'prediction': 0, 'message': 'No expense data available for prediction.'})
    
    monthly_totals = expenses_df.set_index('date').resample('M')['amount'].sum()
    
    num_months = len(monthly_totals)
    prediction_val = 0
    message = ""
    if num_months == 0:
        return jsonify({'prediction': 0, 'message': 'Not enough monthly data to form a prediction basis.'})
    elif num_months < 3: # Need at least 3 data points for a somewhat reliable linear regression
        prediction_val = monthly_totals.mean()
        message = f"Prediction based on average of {num_months} available month(s). More data is needed for a machine learning model."
    else: # 3 or more months of data, use Linear Regression
        try:
            X = np.arange(num_months).reshape(-1, 1)
            y = monthly_totals.values

            model = LinearRegression()
            model.fit(X, y)

            # Predict for the next month (index num_months)
            predicted_total = model.predict(np.array([[num_months]]))[0]
            prediction_val = max(0, predicted_total) # Expenses should not be negative
            message = "Prediction based on a linear regression model of historical monthly spending."
        except Exception as e:
            app.logger.error(f"Error during ML prediction: {e}")
            # Fallback to a simple average if ML model fails
            prediction_val = monthly_totals.mean()
            message = "ML model prediction failed. Prediction based on historical average spending."
    return jsonify({'prediction': round(float(prediction_val), 2), 'message': message})


if __name__ == '__main__':
    # Create expenses.csv if it doesn't exist
    if not os.path.exists(CSV_PATH):
        df = pd.DataFrame(columns=['id', 'date', 'category', 'amount', 'description'])
        df.to_csv(CSV_PATH, index=False)
    app.run(debug=True, port=5001) # Run on a different port than Next.js, e.g., 5001