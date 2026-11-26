import React, { useState } from 'react';
import VimDefender from './vim-defender/VimDefender';
import Match3 from './match3/Match3';

export default function GamesList() {
  const [selected, setSelected] = useState<'vim' | 'match'>('vim');
  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <button onClick={() => setSelected('vim')} style={{ marginRight: '0.5rem' }}>Tower Defense</button>
        <button onClick={() => setSelected('match')}>Match‑3</button>
      </div>
      {selected === 'vim' ? <VimDefender /> : <Match3 />}
    </div>
  );
}
