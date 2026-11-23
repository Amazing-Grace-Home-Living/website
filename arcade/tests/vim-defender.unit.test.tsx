import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VimDefender } from '../games/vim-defender/VimDefender';

describe('VimDefender component', () => {
  test('starts the game and creates GameEngine', async () => {
    render(<VimDefender />);
    const startBtn = screen.getByRole('button', { name: /initialize defense/i });
    fireEvent.click(startBtn);
    // After starting, the gameState should be 'playing' which triggers the useEffect
    // The GameEngine instance is stored in the ref; we check that the canvas exists
    const canvas = await screen.findByTestId('game-canvas');
    expect(canvas).toBeTruthy();
  });
});
