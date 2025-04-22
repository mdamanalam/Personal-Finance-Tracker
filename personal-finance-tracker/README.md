# Personal Finance Tracker

This project is a Personal Finance Tracker application built using Angular for the frontend and Flask for the backend. It allows users to manage their personal finances, track expenses, and authenticate securely.

## Project Structure

The project is organized into two main directories: `frontend` and `backend`.

### Frontend

The frontend is developed using Angular and includes the following components:

- **Login Component**: Allows users to log in to their accounts.
- **Home Component**: Displays the user's financial data after successful login.

The frontend files are located in the `frontend/src/app` directory, with additional assets and environment configurations.

### Backend

The backend is developed using Flask and includes the following modules:

- **Authentication Module**: Handles user authentication and JWT generation.
- **Models**: Defines the database models, including user information.
- **Routes**: Contains application routes for handling requests.

The backend files are located in the `backend/app` directory, with configuration settings in `backend/config.py`.

## Getting Started

### Prerequisites

- Python 3.x
- Node.js and npm
- PostgreSQL (or any other database of your choice)

### Installation

1. **Clone the repository**:
   ```
   git clone <repository-url>
   cd personal-finance-tracker
   ```

2. **Set up the backend**:
   - Navigate to the `backend` directory.
   - Install the required Python packages:
     ```
     pip install -r requirements.txt
     ```
   - Configure your database settings in `config.py`.
   - Run the Flask application:
     ```
     python run.py
     ```

3. **Set up the frontend**:
   - Navigate to the `frontend` directory.
   - Install the required npm packages:
     ```
     npm install
     ```
   - Start the Angular application:
     ```
     ng serve
     ```

### Usage

- Access the application in your web browser at `http://localhost:4200`.
- Use the login page to authenticate and access your personal finance dashboard.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or features.

## License

This project is licensed under the MIT License.