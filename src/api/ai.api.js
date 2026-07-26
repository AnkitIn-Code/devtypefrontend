const delay = (ms = 1200) => new Promise(res => setTimeout(res, ms));

const AI_GENERATED_SAMPLES = {
  javascript: {
    BEGINNER: `// JavaScript Array Methods Practice
const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const evenNumbers = numbers.filter(n => n % 2 === 0);
const doubled = evenNumbers.map(n => n * 2);
const sum = doubled.reduce((acc, n) => acc + n, 0);

console.log("Even numbers:", evenNumbers);
console.log("Doubled:", doubled);
console.log("Sum:", sum);`,

    ADVANCED: `// Advanced JavaScript: Functional Programming Patterns
const compose = (...fns) => x => fns.reduceRight((acc, fn) => fn(acc), x);
const pipe = (...fns) => x => fns.reduce((acc, fn) => fn(acc), x);

const memoize = (fn) => {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};

const fibonacci = memoize((n) => {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
});`,
  },
  python: {
    INTERMEDIATE: `# Python Decorators and Context Managers
import functools
import time
from contextlib import contextmanager

def timer(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        end = time.perf_counter()
        print(f"{func.__name__} took {end - start:.4f}s")
        return result
    return wrapper

@contextmanager
def managed_resource(name: str):
    print(f"Acquiring {name}")
    try:
        yield name
    finally:
        print(f"Releasing {name}")

@timer
def process_data(data: list) -> list:
    with managed_resource("processor") as resource:
        return [item * 2 for item in data]`,
  },
};

export const aiApi = {
  generate: async ({ prompt, language, difficulty, topic, length }) => {
    await delay(1500);
    const sample = AI_GENERATED_SAMPLES[language]?.[difficulty] ||
      `// AI Generated: ${topic || 'Code'} in ${language}\n// Difficulty: ${difficulty}\n\nfunction solution() {\n  // Your ${length || 'medium'} implementation here\n  console.log("Hello, CodeType AI!");\n}\n\nsolution();`;

    return {
      data: {
        id: 'ai_' + Date.now(),
        code: sample,
        language,
        difficulty,
        topic: topic || 'General',
        explanation: `This ${difficulty.toLowerCase()} ${language} snippet demonstrates ${topic || 'core programming concepts'}. Practice typing this to improve your familiarity with ${language} syntax and patterns.`,
        tags: [language, difficulty.toLowerCase(), topic?.toLowerCase()].filter(Boolean),
      },
    };
  },

  improve: async (code) => {
    await delay(1000);
    return { data: { code: code + '\n// Improved: Added error handling and type safety', suggestions: ['Add error handling', 'Consider type annotations', 'Extract magic numbers'] } };
  },

  optimize: async (code) => {
    await delay(1000);
    return { data: { code: code, optimizations: ['Reduced time complexity', 'Improved memory usage'] } };
  },

  simplify: async (code) => {
    await delay(800);
    return { data: { code: code } };
  },

  explain: async (code) => {
    await delay(800);
    return {
      data: {
        explanation: 'This code demonstrates key programming patterns. The main function serves as the entry point, while helper functions break down the logic into reusable, testable units.',
        concepts: ['Functions', 'Data structures', 'Algorithm patterns'],
      },
    };
  },

  save: async (data) => {
    await delay(400);
    return { data: { ...data, id: 'ai_saved_' + Date.now(), savedAt: new Date().toISOString() } };
  },
};
