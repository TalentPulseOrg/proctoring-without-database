const API_BASE_URL = 'http://localhost:8000';

export const fetchHealthCheck = async () => {
  const response = await fetch(`${API_BASE_URL}/health`);
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};