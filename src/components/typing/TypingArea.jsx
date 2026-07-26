import { motion, AnimatePresence } from 'framer-motion';
import { getCharClass } from '@utils/typing.utils';

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

  const displayChar = char === ' ' ? '\u00A0' : char;

  return (
    <span
      className={`relative inline-block font-mono ${
        isCurrent
          ? 'text-text-primary'
          : status === 'correct'
          ? 'text-success'
          : status === 'wrong'
          ? 'text-error bg-error/10 rounded-sm'
          : 'text-muted'
      }`}
    >
      {displayChar}
      {isCurrent && (
        <motion.span
          className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-primary rounded-full"
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
