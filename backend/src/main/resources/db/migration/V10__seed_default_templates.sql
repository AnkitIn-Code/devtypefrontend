-- V10: Seed default pre-saved code templates for public library
INSERT INTO snippets (id, author_id, language, difficulty, title, code, is_public, source_type, created_at)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    NULL,
    'java',
    'INTERMEDIATE',
    'Binary Search Algorithm',
    'public static int binarySearch(int[] arr, int target) {\n    int left = 0, right = arr.length - 1;\n    while (left <= right) {\n        int mid = left + (right - left) / 2;\n        if (arr[mid] == target) return mid;\n        if (arr[mid] < target) left = mid + 1;\n        else right = mid - 1;\n    }\n    return -1;\n}',
    TRUE,
    'MANUAL',
    NOW()
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    NULL,
    'javascript',
    'INTERMEDIATE',
    'QuickSort Array Partition',
    'function quickSort(arr, low = 0, high = arr.length - 1) {\n  if (low < high) {\n    const pivot = arr[high];\n    let i = low - 1;\n    for (let j = low; j < high; j++) {\n      if (arr[j] < pivot) {\n        i++;\n        [arr[i], arr[j]] = [arr[j], arr[i]];\n      }\n    }\n    [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];\n    const pi = i + 1;\n    quickSort(arr, low, pi - 1);\n    quickSort(arr, pi + 1, high);\n  }\n  return arr;\n}',
    TRUE,
    'MANUAL',
    NOW()
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    NULL,
    'python',
    'BEGINNER',
    'LRU Cache Decorator',
    'from functools import lru_cache\n\n@lru_cache(maxsize=128)\ndef fibonacci(n: int) -> int:\n    if n < 2:\n        return n\n    return fibonacci(n - 1) + fibonacci(n - 2)\n\nprint([fibonacci(i) for i in range(15)])',
    TRUE,
    'MANUAL',
    NOW()
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    NULL,
    'typescript',
    'ADVANCED',
    'Custom React Hook - useLocalStorage',
    'import { useState, useEffect } from "react";\n\nexport function useLocalStorage<T>(key: string, initialValue: T): [T, (val: T) => void] {\n  const [value, setValue] = useState<T>(() => {\n    const item = window.localStorage.getItem(key);\n    return item ? JSON.parse(item) : initialValue;\n  });\n\n  useEffect(() => {\n    window.localStorage.setItem(key, JSON.stringify(value));\n  }, [key, value]);\n\n  return [value, setValue];\n}',
    TRUE,
    'MANUAL',
    NOW()
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    NULL,
    'go',
    'INTERMEDIATE',
    'Worker Pool Concurrency Pattern',
    'package main\n\nimport "fmt"\n\nfunc worker(id int, jobs <-chan int, results chan<- int) {\n    for j := range jobs {\n        results <- j * 2\n    }\n}\n\nfunc main() {\n    jobs := make(chan int, 100)\n    results := make(chan int, 100)\n    for w := 1; w <= 3; w++ {\n        go worker(w, jobs, results)\n    }\n}',
    TRUE,
    'MANUAL',
    NOW()
  ),
  (
    '66666666-6666-6666-6666-666666666666',
    NULL,
    'rust',
    'ADVANCED',
    'Pattern Matching & Result Handling',
    'fn divide(numerator: f64, denominator: f64) -> Result<f64, String> {\n    if denominator == 0.0 {\n        Err(String::from("Division by zero"))\n    } else {\n        Ok(numerator / denominator)\n    }\n}\n\nfn main() {\n    match divide(10.0, 2.0) {\n        Ok(result) => println!("Result: {}", result),\n        Err(msg) => println!("Error: {}", msg),\n    }\n}',
    TRUE,
    'MANUAL',
    NOW()
  )
ON CONFLICT (id) DO NOTHING;
