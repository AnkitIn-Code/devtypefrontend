import { motion } from 'framer-motion';

// Individual character component
export const CharacterBox = ({ char, status, isCurrent }) => {
  const isNewline = char === '\n';

  if (isNewline) {
    return (
      <>
        {isCurrent && (
          <motion.span
            className="inline-block w-0.5 h-5 bg-primary align-middle mx-px rounded-full"
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 1.05, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        <br />
      </>
    );
  }

  const displayChar = char === ' ' ? '\u00A0' : char === '\t' ? '\u00A0\u00A0' : char;

  return (
    <span
      className={`relative inline-block font-mono transition-colors ${
        isCurrent
          ? 'text-text-primary'
          : status === 'correct'
          ? 'text-success'
          : status === 'wrong'
          // Wrong: red text + reddish background + red underline decoration
          ? 'text-error bg-error/15 rounded-[2px] underline decoration-error decoration-2 underline-offset-2'
          : 'text-muted'
      }`}
    >
      {displayChar}
      {isCurrent && (
        <motion.span
          className="absolute -bottom-0.5 left-0 right-0 h-[2px] bg-primary rounded-full"
          animate={{ opacity: [1, 0.2, 1] }}
          transition={{ duration: 1.05, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </span>
  );
};

// The full typing area
export const TypingArea = ({ typedChars, currentIndex, fontSize = 16 }) => {
  return (
    <div
      className="font-mono leading-loose select-none outline-none focus:outline-none"
      style={{ fontSize, lineHeight: 2 }}
      tabIndex={0}
    >
      {typedChars.map((charObj, i) => (
        <CharacterBox
          key={i}
          char={charObj.char}
          status={charObj.status}
          isCurrent={i === currentIndex}
        />
      ))}
    </div>
  );
};
