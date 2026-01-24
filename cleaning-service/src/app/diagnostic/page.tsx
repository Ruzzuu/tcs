'use client';

import { useState } from 'react';

export default function DiagnosticPage() {
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [requestCount, setRequestCount] = useState(0);

  const runDiagnostic = async () => {
    setLoading(true);
    setTestResult(null);
    setRequestCount(0);

    // Intercept fetch to count actual API calls
    let apiCallCount = 0;
    const originalFetch = window.fetch;
    window.fetch = (async (...args) => {
      if (args[0]?.toString().includes('/api/orders') && !args[0]?.toString().includes('/api/orders/')) {
        apiCallCount++;
        console.log(`🔍 [INTERCEPT] API Call #${apiCallCount} to ${args[0]}`);
        setRequestCount(apiCallCount);
      }
      return originalFetch(...args);
    }) as typeof fetch;

    const results: any = {
      timestamp: new Date().toISOString(),
      tests: [],
      apiCallCount: 0
    };

    // Test with 3 items (same as user's scenario)
    try {
      const payload = {
        name: 'Test Diagnostic',
        phone: '081234567890',
        address: 'Test Address',
        items: [
          { itemType: 'sandal', quantity: 1, customItemType: '', notes: '' },
          { itemType: 'whitening', quantity: 1, customItemType: '', notes: '' },
          { itemType: 'repaint_canvas', quantity: 1, customItemType: '', notes: '' }
        ]
      };

      console.log('🧪 TEST: Sending payload with 3 items:', payload);

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      // Restore original fetch
      window.fetch = originalFetch;

      results.tests.push({
        name: '3 Items in Single Order',
        status: response.status,
        success: data.success,
        data: data,
        payload: payload
      });
      
      results.apiCallCount = apiCallCount;

      // Cleanup if success
      if (data.success && data.data?.orderId) {
        await fetch(`/api/orders/${data.data.orderId}`, { method: 'DELETE' });
      }
    } catch (err: any) {
      window.fetch = originalFetch;
      results.tests.push({
        name: '3 Items in Single Order',
        error: err.message
      });
      results.apiCallCount = apiCallCount;
    }

    setTestResult(results);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* HEADER */}
        <div className="bg-yellow-100 dark:bg-yellow-900 border-l-4 border-yellow-500 p-4 mb-6">
          <h2 className="font-bold text-xl text-yellow-900 dark:text-yellow-100 mb-2">
            ⚠️ BEFORE YOU CLICK:
          </h2>
          <ol className="list-decimal list-inside space-y-1 text-yellow-800 dark:text-yellow-200">
            <li>Tekan F12 atau Right Click → "Inspect"</li>
            <li>Klik tab "Network"</li>
            <li>Clear network log (icon 🚫 atau "Clear")</li>
            <li>Klik tombol "Run Test" di bawah</li>
            <li><strong>LIHAT: Berapa kali request ke "/orders" muncul?</strong></li>
          </ol>
        </div>

        <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
          🔬 Form Submission Diagnostic
        </h1>
        
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          Test: Submit 3 items → should send 1 request, not 3!
        </p>

        <button
          onClick={runDiagnostic}
          disabled={loading}
          className="w-full px-6 py-4 bg-blue-600 text-white text-xl font-bold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 mb-6 transition"
        >
          {loading ? '🔄 Running Test...' : '🚀 Run Test (3 Items → 1 Request?)'}
        </button>

        {/* REQUEST COUNT INDICATOR */}
        {requestCount > 0 && (
          <div className={`mb-6 p-6 rounded-lg border-2 ${
            requestCount === 1 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-500' 
              : 'bg-red-50 dark:bg-red-900/20 border-red-500'
          }`}>
            <h3 className="text-2xl font-bold mb-2">
              {requestCount === 1 ? '✅ CORRECT!' : '❌ PROBLEM FOUND!'}
            </h3>
            <p className={`text-xl ${
              requestCount === 1 ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'
            }`}>
              API Call Count: <strong>{requestCount}</strong>
            </p>
            <p className="text-sm mt-2 opacity-75">
              {requestCount === 1 
                ? 'Form sent 1 request with 3 items - This is CORRECT!' 
                : 'Form sent multiple requests - This is the BUG!'}
            </p>
          </div>
        )}

        {testResult && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
                📊 Test Result
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                {testResult.timestamp}
              </p>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
                <h3 className="font-bold text-lg mb-2">API Calls Detected:</h3>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {testResult.apiCallCount} {testResult.apiCallCount === 1 ? 'call' : 'calls'}
                </p>
              </div>

              {testResult.tests.map((test: any, idx: number) => (
                <div key={idx} className="mb-4 p-4 border rounded dark:border-gray-700">
                  <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
                    {test.name}
                  </h3>

                  {test.error ? (
                    <div className="text-red-600 dark:text-red-400">
                      ❌ Error: {test.error}
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Status:</span>{' '}
                          <span className={test.status === 200 ? 'text-green-600' : 'text-red-600'}>
                            {test.status}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Success:</span>{' '}
                          <span className={test.success ? 'text-green-600' : 'text-red-600'}>
                            {test.success ? '✅ Yes' : '❌ No'}
                          </span>
                        </div>
                      </div>

                      <details className="mt-2">
                        <summary className="cursor-pointer text-blue-600 hover:underline">
                          Show Payload
                        </summary>
                        <pre className="bg-gray-100 dark:bg-gray-900 p-2 rounded mt-2 text-xs overflow-auto">
                          {JSON.stringify(test.payload, null, 2)}
                        </pre>
                      </details>

                      <details className="mt-2">
                        <summary className="cursor-pointer text-blue-600 hover:underline">
                          Show Response
                        </summary>
                        <pre className="bg-gray-100 dark:bg-gray-900 p-2 rounded mt-2 text-xs overflow-auto">
                          {JSON.stringify(test.data, null, 2)}
                        </pre>
                      </details>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                💡 Interpretation
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
                <li>Test 1-2 should return status <strong>200</strong> with success: true</li>
                <li>Test 3 should return status <strong>400</strong> with error message</li>
                <li>If all tests pass = <strong>API is working correctly</strong></li>
                <li>If tests fail = <strong>API has issues</strong></li>
              </ul>
            </div>
          </div>
        )}

        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
            📋 Instructions
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-700 dark:text-blue-300">
            <li>Click "Run Diagnostic" button above</li>
            <li>Wait for tests to complete</li>
            <li>Check if all tests pass (green ✅)</li>
            <li>If tests pass but form still fails, form code has issue</li>
            <li>If tests fail, API code has issue</li>
            <li>Share screenshot with developer</li>
          </ol>
        </div>

        <div className="mt-4">
          <a
            href="/form"
            className="text-blue-600 hover:underline"
          >
            ← Back to Form
          </a>
        </div>
      </div>
    </div>
  );
}
