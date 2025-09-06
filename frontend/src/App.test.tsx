import React from 'react';
import { render } from '@testing-library/react';
import App from './App';

test('renders app without crashing', () => {
  render(<App />);
  // Test passes if the component renders without throwing an error
  // The actual content is protected by authentication and routing
});
