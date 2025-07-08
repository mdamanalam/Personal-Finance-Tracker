export default function FAQPage() {
  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">FAQ / Help</h1>
      <div className="mb-4">
        <h2 className="font-semibold">How do I add an expense?</h2>
        <p>Click the "+" button at the bottom right to quickly add an expense.</p>
      </div>
      <div className="mb-4">
        <h2 className="font-semibold">How do I export my data?</h2>
        <p>Click the "Export as CSV" button above your expenses table.</p>
      </div>
      {/* Add more FAQs as needed */}
    </div>
  );
}