-- V12: Fix pre-saved template code formatting
-- V10 used \n escape sequences without E'' prefix, which stored literal \n not newlines.
-- This migration corrects all 6 seeded templates with properly formatted multiline code.

UPDATE snippets SET code = E'public static int binarySearch(int[] arr, int target) {\n    int left = 0, right = arr.length - 1;\n    while (left <= right) {\n        int mid = left + (right - left) / 2;\n        if (arr[mid] == target) return mid;\n        if (arr[mid] < target) left = mid + 1;\n        else right = mid - 1;\n    }\n    return -1;\n}'
WHERE id = '11111111-1111-1111-1111-111111111111';

UPDATE snippets SET code = E'function quickSort(arr, low = 0, high = arr.length - 1) {\n  if (low < high) {\n    const pivot = arr[high];\n    let i = low - 1;\n    for (let j = low; j < high; j++) {\n      if (arr[j] < pivot) {\n        i++;\n        [arr[i], arr[j]] = [arr[j], arr[i]];\n      }\n    }\n    [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];\n    const pi = i + 1;\n    quickSort(arr, low, pi - 1);\n    quickSort(arr, pi + 1, high);\n  }\n  return arr;\n}'
WHERE id = '22222222-2222-2222-2222-222222222222';

UPDATE snippets SET code = E'from functools import lru_cache\n\n@lru_cache(maxsize=128)\ndef fibonacci(n: int) -> int:\n    if n < 2:\n        return n\n    return fibonacci(n - 1) + fibonacci(n - 2)\n\nprint([fibonacci(i) for i in range(15)])'
WHERE id = '33333333-3333-3333-3333-333333333333';

UPDATE snippets SET code = E'import { useState, useEffect } from "react";\n\nexport function useLocalStorage(key, initialValue) {\n  const [value, setValue] = useState(() => {\n    const item = window.localStorage.getItem(key);\n    return item ? JSON.parse(item) : initialValue;\n  });\n\n  useEffect(() => {\n    window.localStorage.setItem(key, JSON.stringify(value));\n  }, [key, value]);\n\n  return [value, setValue];\n}'
WHERE id = '44444444-4444-4444-4444-444444444444';

UPDATE snippets SET code = E'package main\n\nimport "fmt"\n\nfunc worker(id int, jobs <-chan int, results chan<- int) {\n    for j := range jobs {\n        results <- j * 2\n    }\n}\n\nfunc main() {\n    jobs := make(chan int, 100)\n    results := make(chan int, 100)\n    for w := 1; w <= 3; w++ {\n        go worker(w, jobs, results)\n    }\n    for j := 1; j <= 9; j++ {\n        jobs <- j\n    }\n    close(jobs)\n    for a := 1; a <= 9; a++ {\n        fmt.Println(<-results)\n    }\n}'
WHERE id = '55555555-5555-5555-5555-555555555555';

UPDATE snippets SET code = E'fn divide(numerator: f64, denominator: f64) -> Result<f64, String> {\n    if denominator == 0.0 {\n        Err(String::from("Division by zero"))\n    } else {\n        Ok(numerator / denominator)\n    }\n}\n\nfn main() {\n    match divide(10.0, 2.0) {\n        Ok(result) => println!("Result: {}", result),\n        Err(msg) => println!("Error: {}", msg),\n    }\n}'
WHERE id = '66666666-6666-6666-6666-666666666666';
