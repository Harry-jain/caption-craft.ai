import React from 'react';
import { render, screen } from '@testing-library/react';
import Home from './Home';

test('renders header and upload box', () => {
  render(<Home />);
  expect(screen.getByText(/AI-Powered Caption Generator/i)).toBeInTheDocument();
  expect(screen.getByText(/Drop image here or click to select/i)).toBeInTheDocument();
});
