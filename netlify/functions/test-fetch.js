// Simple test to validate the dynamic import works
const fetchTest = async () => {
  try {
    // Define fetch using dynamic import to handle ESM/CommonJS compatibility
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    
    // Test a simple fetch to make sure it works
    const response = await fetch('https://jsonplaceholder.typicode.com/todos/1');
    const data = await response.json();
    
    console.log('Fetch test successful!');
    console.log('Data:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Fetch test failed!');
    console.error(error);
    return { success: false, error: error.message };
  }
};

// Export a simple handler that tests the fetch functionality
exports.handler = async function(event, context) {
  const result = await fetchTest();
  
  return {
    statusCode: result.success ? 200 : 500,
    body: JSON.stringify(result)
  };
}; 