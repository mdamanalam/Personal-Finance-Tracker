 "use client";
 import Head from "next/head";
 import { useSession, signOut } from "next-auth/react";
 import { useRouter } from "next/navigation";
 import Image from "next/image";
 import Link from "next/link";
 import { useEffect, useState, useRef } from "react";
 import { Chart, registerables } from 'chart.js/auto'; // Using 'chart.js/auto' for easier setup
 Chart.register(...registerables);

 const PYTHON_API_BASE_URL = "http://localhost:5001/api"; // Define base URL for Python API


 export default function HomePage() {
   const { data: session, status } = useSession();
   const router = useRouter();
   const [isChatOpen, setIsChatOpen] = useState(false); // State to toggle chatbot
   const [question, setQuestion] = useState(""); // State for user input
   const [answer, setAnswer] = useState(""); // State for chatbot response

   // States for Personal Finance Tracker
   const [expenses, setExpenses] = useState([]);
   const [newExpense, setNewExpense] = useState({ date: '', category: '', amount: '', description: '' });
   const [insightsSummary, setInsightsSummary] = useState({ total_spending: 0, average_transaction: 0, count: 0 });
   const [categorySpending, setCategorySpending] = useState({});
   const [monthlySpending, setMonthlySpending] = useState({});
   const [prediction, setPrediction] = useState({ prediction: 0, message: '' });
   const [formMessage, setFormMessage] = useState({ type: '', text: '' });
   
  // States for CSV File Upload
   const [selectedFile, setSelectedFile] = useState(null);
   const [uploadMessage, setUploadMessage] = useState({ type: '', text: '' });
   const [isUploading, setIsUploading] = useState(false);

  // States for Pagination
   const [currentPage, setCurrentPage] = useState(1);
   const [expensesPerPage] = useState(5); // Display 5 expenses per page

    // State for features
   const [showProfileDropdown, setShowProfileDropdown] = useState(false);
   const [showNotifications, setShowNotifications] = useState(false);
   const [notifications, setNotifications] = useState([
    "You are close to your monthly budget!",
    "New feature: Export your data as CSV.",
   ]);
   const [darkMode, setDarkMode] = useState(false);
   const [showQuickAdd, setShowQuickAdd] = useState(false);
   const [showFeedback, setShowFeedback] = useState(false);
   const [monthlyBudget, setMonthlyBudget] = useState(2000); // Example


   useEffect(() => {
     if (status === "loading") return; // Wait for session to load
     if (!session) {
       router.push("/auth/login"); // Redirect if not authenticated
     }
   }, [session, status, router]);

   useEffect(() => {
    document.body.className = darkMode ? "dark" : "";
   }, [darkMode]);

    // --- CSV Upload Functions ---
   const handleFileChange = (event) => {
    if (event.target.files && event.target.files[0]) {
        setSelectedFile(event.target.files[0]);
        setUploadMessage({ type: '', text: '' }); // Clear previous messages
    }
   };
   

   
   

   const handleFileUpload = async () => {
    if (!selectedFile) {
        setUploadMessage({ type: 'error', text: 'Please select a CSV file first.' });
        return;
    }

    setIsUploading(true);
    setUploadMessage({ type: 'info', text: 'Uploading...' });

    const formData = new FormData();
    formData.append('file', selectedFile); // 'file' must match the key expected by Flask

    try {
        const response = await fetch(`${PYTHON_API_BASE_URL}/expenses/upload_csv`, {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();

        if (response.ok) {
            setUploadMessage({ type: 'success', text: data.message || 'File uploaded and expenses added successfully!' });
            fetchAllData(); // Refresh all data including expenses and insights
            setSelectedFile(null); // Clear the selected file
            setCurrentPage(1); // Reset to first page after upload
            if (document.getElementById('csvFileUploadInput')) {
                document.getElementById('csvFileUploadInput').value = ''; // Reset file input
            }
        } else {
            setUploadMessage({ type: 'error', text: data.error || `Upload failed: ${response.statusText}` });
        }
    } catch (error) {
        console.error('Upload error:', error);
        setUploadMessage({ type: 'error', text: 'An error occurred during upload. Please check the console.' });
    } finally {
        setIsUploading(false);
    }
   };

   // Refs for charts
   const categoryChartRef = useRef(null);
   const monthlySpendingChartRef = useRef(null);
   let categoryChartInstance = useRef(null); // Use useRef to persist chart instance
   let monthlySpendingChartInstance = useRef(null); // Use useRef to persist chart instance

   const handleAsk = async () => {
     const res = await fetch("/api/chatbot", {
       method: "POST",
       headers: {
         "Content-Type": "application/json",
       },
       body: JSON.stringify({ question }),
     });
     const data = await res.json();
     setAnswer(data.answer); // Update the chatbot response
   };

   // --- Personal Finance Tracker Functions ---
   const fetchAllData = async () => {
     if (session) {
       fetchExpenses();
       fetchInsightsSummary();
       fetchCategorySpending();
       fetchMonthlySpending();
       fetchPrediction();
     }
   };

   useEffect(() => {
     if (status === "authenticated") {
       fetchAllData();
     }
     // Cleanup charts on component unmount
     return () => {
       if (categoryChartInstance.current) categoryChartInstance.current.destroy();
       if (monthlySpendingChartInstance.current) monthlySpendingChartInstance.current.destroy();
     };
   }, [status, session]);

   const fetchExpenses = async () => {
     try {
       const res = await fetch(`${PYTHON_API_BASE_URL}/expenses`);
       if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
       const data = await res.json();
       setExpenses(Array.isArray(data) ? data : []);
     } catch (error) {
       console.error("Failed to fetch expenses:", error);
       setExpenses([]);
       setFormMessage({ type: 'error', text: 'Could not load expenses from server.' });
     }
   };

   const fetchInsightsSummary = async () => {
     try {
       const res = await fetch(`${PYTHON_API_BASE_URL}/insights/summary`);
       if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
       const data = await res.json();
       setInsightsSummary(data);
     } catch (error) {
       console.error("Failed to fetch insights summary:", error);
     }
   };

   const fetchCategorySpending = async () => {
     try {
       const res = await fetch(`${PYTHON_API_BASE_URL}/insights/spending_by_category`);
       if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
       const data = await res.json();
       setCategorySpending(data);
       renderCategoryChart(data);
     } catch (error) {
       console.error("Failed to fetch category spending:", error);
     }
   };

   const fetchMonthlySpending = async () => {
     try {
       const res = await fetch(`${PYTHON_API_BASE_URL}/insights/monthly_spending`);
       if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
       const data = await res.json();
       setMonthlySpending(data);
       renderMonthlySpendingChart(data);
     } catch (error) {
       console.error("Failed to fetch monthly spending:", error);
     }
   };

   const fetchPrediction = async () => {
     try {
       const res = await fetch(`${PYTHON_API_BASE_URL}/predict/next_month_total`);
       if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
       const data = await res.json();
       setPrediction(data);
     } catch (error) {
       console.error("Failed to fetch prediction:", error);
     }
   };

   const handleInputChange = (e) => {
     const { name, value } = e.target;
     setNewExpense(prev => ({ ...prev, [name]: value }));
   };

   const handleAddExpense = async (e) => {
     e.preventDefault();
     setFormMessage({ type: '', text: '' });
     if (!newExpense.date || !newExpense.category || !newExpense.amount) {
         setFormMessage({ type: 'error', text: 'Date, Category, and Amount are required.' });
         return;
     }
     try {
         const res = await fetch(`${PYTHON_API_BASE_URL}/expenses`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ ...newExpense, amount: parseFloat(newExpense.amount) }),
         });
         const result = await res.json(); // Always parse JSON, even for errors
         if (res.ok) {
             setFormMessage({ type: 'success', text: result.message || 'Expense added successfully!' });
             setNewExpense({ date: '', category: '', amount: '', description: '' });
             fetchAllData(); // Refresh all data
             setCurrentPage(1); // Reset to first page after adding
         } else {
             setFormMessage({ type: 'error', text: result.error || result.message || 'Failed to add expense.' });
         }
     } catch (error) {
         console.error('Error adding expense:', error);
         setFormMessage({ type: 'error', text: 'An error occurred: ' + error.message });
     }
   };

   const renderCategoryChart = (data) => {
     if (categoryChartRef.current) {
       if (categoryChartInstance.current) categoryChartInstance.current.destroy();
       categoryChartInstance.current = new Chart(categoryChartRef.current, {
         type: 'pie',
         data: { labels: Object.keys(data), datasets: [{ label: 'Spending by Category', data: Object.values(data), backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'] }] },
         options: { responsive: true, maintainAspectRatio: false }
       });
     }
   };

   const renderMonthlySpendingChart = (data) => {
     if (monthlySpendingChartRef.current) {
       if (monthlySpendingChartInstance.current) monthlySpendingChartInstance.current.destroy();
       monthlySpendingChartInstance.current = new Chart(monthlySpendingChartRef.current, {
         type: 'line',
         data: { labels: Object.keys(data), datasets: [{ label: 'Monthly Spending', data: Object.values(data), borderColor: '#36A2EB', fill: false, tension: 0.1 }] },
         options: { responsive: true, maintainAspectRatio: false }
       });
     }
   };

   if (status === "loading") {
     return (
       <div className="flex items-center justify-center h-screen">
         <p>Loading session...</p>
       </div>
     );
   }

   if (!session) {
     // This case should be handled by the useEffect redirect, but good fallback
     return (
       <div className="flex items-center justify-center h-screen">
         <p>Redirecting to login...</p>
       </div>
     );
   }

   // Pagination Logic
   const sortedExpenses = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
   const indexOfLastExpense = currentPage * expensesPerPage;
   const indexOfFirstExpense = indexOfLastExpense - expensesPerPage;
   const currentExpenses = sortedExpenses.slice(indexOfFirstExpense, indexOfLastExpense);
   const totalPages = Math.ceil(sortedExpenses.length / expensesPerPage);

   return (
     <div className="min-h-screen flex flex-col bg-gray-100">
      <nav className="bg-blue-400 shadow-md border-b border-gray-blue-500 border-b border-gray-600 text-white p-4 flex justify-between items-center shadow-md">
        <div className="flex items-center">
          <Link href="/contact" className="mr-6 font-semibold hover:underline">Contact</Link>
          <Image
            src="/images/mylogo.jpg"
            alt="WealthPilot Logo"
            width={50}
            height={50}
            className="mr-3"
          />
          <Link href="/faq" className="ml-4 underline">FAQ/Help</Link>
        </div>
        <div className="flex items-center">
          {/* Notifications */}
          <div className="relative mr-4">
            <button onClick={() => setShowNotifications(!showNotifications)} className="relative">
              <span role="img" aria-label="bell">🔔</span>
              {notifications.length > 0 && <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>}
            </button>
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded shadow-lg z-50">
                {notifications.length === 0 ? (
                  <div className="p-4 text-gray-500">No notifications</div>
                ) : (
                  notifications.map((n, i) => (
                    <div key={i} className="p-4 border-b last:border-b-0">{n}</div>
                  ))
                )}
              </div>
            )}
          </div>
          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="ml-4 px-2 py-1 rounded bg-gray-200 text-gray-800 hover:bg-gray-300"
          >
            {darkMode ? "🌙" : "☀️"}
          </button>
          {/* Profile Dropdown */}
          <div className="relative ml-4">
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="flex items-center bg-blue-500 px-4 py-2 rounded hover:bg-blue-600 transition duration-150"
            >
              <span className="mr-2">{session?.user?.name || "Profile"}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {showProfileDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded shadow-lg z-50">
                <a href="#" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">Edit Profile</a>
                <button onClick={() => signOut()} className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100">Logout</button>
              </div>
            )}
          </div>
        </div>
      </nav>

       {/* <main className="flex-grow p-4 md:p-8"> */}
       <main className="flex-grow px-4 pb-4 md:px-8 md:pb-8">
         <div className="max-w-8xl mx-auto">
           <h1 className="text-2xl font-bold text-gray-800 mb-6">Welcome back, {session.user.name}! Let’s track smart.</h1>

           {/* Personal Finance Tracker Sections */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
             {/* Add Expense Form */}
             <div className="bg-white p-6 rounded-lg shadow-lg col-span-1 md:col-span-2 lg:col-span-1">
               <h2 className="text-2xl font-semibold text-gray-700 mb-4">Add New Expense</h2>
               <form onSubmit={handleAddExpense} className="space-y-4">
                 <div>
                   <label htmlFor="date" className="block text-sm font-medium text-gray-600">Date</label>
                   <input type="date" name="date" id="date" value={newExpense.date} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                 </div>
                 <div>
                   <label htmlFor="category" className="block text-sm font-medium text-gray-600">Category</label>
                   <input type="text" name="category" id="category" value={newExpense.category} onChange={handleInputChange} placeholder="e.g., Groceries" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                 </div>
                 <div>
                   <label htmlFor="amount" className="block text-sm font-medium text-gray-600">Amount</label>
                   <input type="number" name="amount" id="amount" value={newExpense.amount} onChange={handleInputChange} placeholder="e.g., 50.75" step="0.01" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                 </div>
                 <div>
                   <label htmlFor="description" className="block text-sm font-medium text-gray-600">Description (Optional)</label>
                   <input type="text" name="description" id="description" value={newExpense.description} onChange={handleInputChange} placeholder="e.g., Weekly shopping" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                 </div>
                 <button type="submit" className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition duration-150">Add Expense</button>
                 {formMessage.text && (
                   <p className={`mt-2 text-sm ${formMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                     {formMessage.text}
                   </p>
                 )}
               </form>
             </div>
             {/* CSV Upload Section */}
             <div className="bg-white p-6 rounded-lg shadow-lg col-span-1 md:col-span-2 lg:col-span-1">
              <h2 className="text-2xl font-semibold text-gray-700 mb-4">Upload Expenses CSV</h2>
              <div className="space-y-3">
                <div>
                  <label htmlFor="csvFileUploadInput" className="block text-sm font-medium text-gray-600">Select CSV File</label>
                  <input
                    type="file"
                    id="csvFileUploadInput"
                    accept=".csv"
                    onChange={handleFileChange}
                    disabled={isUploading}
                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
                <button onClick={handleFileUpload} disabled={isUploading || !selectedFile} className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded transition duration-150 disabled:opacity-50">
                  {isUploading ? 'Uploading...' : 'Upload CSV & Add Expenses'}
                </button>
                {uploadMessage.text && <p className={`mt-2 text-sm ${uploadMessage.type === 'success' ? 'text-green-600' : uploadMessage.type === 'error' ? 'text-red-600' : 'text-blue-600'}`}>{uploadMessage.text}</p>}
              </div>
              <hr className="my-6 border-gray-300" />
              {/* Export Data Button */}
              <button
              onClick={() => {
                const csvRows = [
                  ["Date", "Category", "Amount", "Description"],
                  ...expenses.map(exp => [exp.date, exp.category, exp.amount, exp.description])
                ];
                const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", "expenses.csv");
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="mb-4 bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600"
            >
              Export as CSV
            </button>
            </div>

             {/* Insights Summary */}
             {/* <div className="bg-white p-6 rounded-lg shadow-lg">
               <h2 className="text-2xl font-semibold text-gray-700 mb-4">Spending Summary</h2>
               <p className="text-gray-600">Total Expenses: <span className="font-bold text-indigo-600">{insightsSummary.count}</span></p>
               <p className="text-gray-600">Total Spending: <span className="font-bold text-indigo-600">${(insightsSummary.total_spending || 0).toFixed(2)}</span></p>
               <p className="text-gray-600">Average Transaction: <span className="font-bold text-indigo-600">${(insightsSummary.average_transaction || 0).toFixed(2)}</span></p>
             </div> */}

             {/* Expense Prediction */}
             {/* <div className="bg-white p-6 rounded-lg shadow-lg">
               <h2 className="text-2xl font-semibold text-gray-700 mb-4">Expense Prediction</h2>
               <p className="text-gray-600">Predicted Total for Next Month: <span className="font-bold text-purple-600">${(prediction.prediction || 0).toFixed(2)}</span></p>
               <p className="text-sm text-gray-500 mt-1">{prediction.message}</p> */}
             {/* Combined Summary & Prediction Card */}
             <div className="bg-white p-6 rounded-lg shadow-lg col-span-1 md:col-span-2 lg:col-span-1"> {/* Adjust col-span as needed */}
               <h2 className="text-2xl font-semibold text-gray-700 mb-4">Financial Overview</h2>
               
               <div className="mb-6">
                 <h3 className="text-xl font-medium text-gray-600 mb-2">Spending Summary</h3>
                 <p className="text-gray-600">Total Expenses: <span className="font-bold text-indigo-600">{insightsSummary.count}</span></p>
                 <p className="text-gray-600">Total Spending: <span className="font-bold text-indigo-600">${(insightsSummary.total_spending || 0).toFixed(2)}</span></p>
                 <p className="text-gray-600">Average Transaction: <span className="font-bold text-indigo-600">${(insightsSummary.average_transaction || 0).toFixed(2)}</span></p>
               </div>

               <div>
                 <h3 className="text-xl font-medium text-gray-600 mb-2">Expense Prediction</h3>
                 <p className="text-gray-600">Predicted Total for Next Month: <span className="font-bold text-purple-600">${(prediction.prediction || 0).toFixed(2)}</span></p>
                 <p className="text-sm text-gray-500 mt-1">{prediction.message}</p>
               </div>
                      {/* Budget Progress Bar */}
          <div className="mb-6 max-w-xl mx-auto">
            <h3 className="text-xl font-medium text-gray-600 mb-2">Budget Progress</h3>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-green-500 h-4 rounded-full"
                style={{ width: `${Math.min((insightsSummary.total_spending / monthlyBudget) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-sm mt-1">{`$${insightsSummary.total_spending} / $${monthlyBudget}`}</p>
          </div>
             </div>
           </div>

           {/* Charts */}
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
             <div className="bg-white p-6 rounded-lg shadow-lg">
               <h3 className="text-xl font-semibold text-gray-700 mb-3">Spending by Category</h3>
               <div className="h-64 md:h-80"><canvas ref={categoryChartRef}></canvas></div>
             </div>
             <div className="bg-white p-6 rounded-lg shadow-lg">
               <h3 className="text-xl font-semibold text-gray-700 mb-3">Monthly Spending Trend</h3>
               <div className="h-64 md:h-80"><canvas ref={monthlySpendingChartRef}></canvas></div>
             </div>
           </div>

           {/* Expenses List */}
           <div className="bg-white p-6 rounded-lg shadow-lg">
             <h2 className="text-2xl font-semibold text-gray-700 mb-4">All Expenses</h2>
             <div className="overflow-x-auto">
               <table className="min-w-full divide-y divide-gray-200">
                 <thead className="bg-gray-50">
                   <tr>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                   </tr>
                 </thead>
                 <tbody className="bg-white divide-y divide-gray-200">
                   {/* {expenses.length > 0 ? expenses.sort((a,b) => new Date(b.date) - new Date(a.date)).map(exp => ( */}
                   {currentExpenses.length > 0 ? currentExpenses.map(exp => (
                     <tr key={exp.id}>
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(exp.date).toLocaleDateString()}</td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{exp.category}</td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${(parseFloat(exp.amount) || 0).toFixed(2)}</td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exp.description}</td>
                     </tr>
                   )) : (
                     <tr><td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">No expenses recorded yet. Add one above!</td></tr>
                   )}
                 </tbody>
               </table>
             </div>
                          {/* Pagination Controls */}
             {sortedExpenses.length > expensesPerPage && (
                <div className="mt-6 flex justify-between items-center">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 transition-colors"
                    >
                        Previous
                    </button>
                    <span className="text-sm text-gray-700">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 transition-colors"
                    >
                        Next
                    </button>
                </div>
             )}
           </div>
         </div>
       </main>
       <footer className="bg-gray-800 text-white p-4 text-center">
         <p>&copy; 2025 Personal Finance Tracker. All rights reserved.</p>
       </footer>

       {/* Chatbot Icon */}
       <div
         className="fixed bottom-5 right-5 bg-blue-500 text-white p-4 rounded-full shadow-xl cursor-pointer hover:bg-blue-700 transition duration-150 z-50"
         onClick={() => setIsChatOpen(!isChatOpen)}
       >
         💬
       </div>

       {/* Chatbot Popup */}
       {isChatOpen && (
         <div className="fixed bottom-20 right-5 bg-white p-4 rounded-lg shadow-xl w-80 border border-gray-200 z-50">
           <h2 className="text-lg font-bold mb-2">Chatbot</h2>
           <textarea
             className="w-full p-2 border rounded mb-2"
             rows="4"
             value={question}
             onChange={(e) => setQuestion(e.target.value)}
             placeholder="Ask me about your finances..."
           ></textarea>
           <button
             onClick={handleAsk}
             className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition duration-150"
           >
             Ask
           </button>
           {answer && (
             <div className="mt-4 p-3 bg-gray-100 rounded">
               <h3 className="font-semibold">Answer:</h3>
               <p className="text-sm">{answer}</p>
             </div>
           )}
         </div>
       )}
     </div>
   );
 }