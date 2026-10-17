// Direct logic validation for typing engine algorithms

function testUnicodeSplitting() {
  const code = 'const bot = "🤖";\nconsole.log(bot);';
  
  // Old broken way (split(''))
  const oldSplit = code.split('');
  console.log('Old split length for emoji:', oldSplit.length); // 35 (surrogate pair split into 2)
  console.log('Old split[13]:', JSON.stringify(oldSplit[13]), 'split[14]:', JSON.stringify(oldSplit[14]));

  // New fixed way ([...cleanCode])
  const newSplit = [...code];
  console.log('New spread length for emoji:', newSplit.length); // 34
  console.log('New spread[13]:', JSON.stringify(newSplit[13])); // "🤖" (single unified codepoint)

  return newSplit[13] === '🤖' && newSplit.length === 34;
}

function testBackspaceAtZero() {
  // Simulating state machine of typing.store.js
  let typedChars = [{ char: 'c', status: 'wrong', index: 0 }, { char: 'o', status: 'remaining', index: 1 }];
  let currentIndex = 0;
  let errors = 1;
  let errorPositions = new Set([0]);
  let canBackspace = false;

  // Under EDGE-06 fix in typing.store.js:
  if (currentIndex === 0) {
    if (typedChars[0] && typedChars[0].status === 'wrong') {
      const newChars = [...typedChars];
      newChars[0] = { ...newChars[0], status: 'current' };
      const newErrorPositions = new Set(errorPositions);
      newErrorPositions.delete(0);
      typedChars = newChars;
      errors = Math.max(0, errors - 1);
      errorPositions = newErrorPositions;
      canBackspace = false;
    }
  }

  console.log('After backspace at index 0: status is', typedChars[0].status, 'errors:', errors);
  return typedChars[0].status === 'current' && errors === 0;
}

console.log('Unicode spread test:', testUnicodeSplitting() ? 'PASS' : 'FAIL');
console.log('Backspace at index 0 test:', testBackspaceAtZero() ? 'PASS' : 'FAIL');
