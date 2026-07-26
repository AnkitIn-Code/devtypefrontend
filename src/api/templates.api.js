import api from './axios';

const delay = (ms = 600) => new Promise(res => setTimeout(res, ms));

const MOCK_TEMPLATES = [
  {
    id: 'tpl_001',
    title: 'Binary Search',
    description: 'Classic binary search algorithm in Java',
    language: 'java',
    difficulty: 'INTERMEDIATE',
    code: `public static int binarySearch(int[] arr, int target) {
    int left = 0, right = arr.length - 1;
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (arr[mid] == target) return mid;
        if (arr[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
}`,
    authorId: 'usr_001',
    authorName: 'CodeType AI',
    tags: ['algorithms', 'searching', 'java'],
    likes: 342,
    plays: 1204,
    isPublic: true,
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'tpl_002',
    title: 'React useState Hook',
    description: 'React functional component with state management',
    language: 'javascript',
    difficulty: 'BEGINNER',
    code: `import React, { useState, useEffect } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    document.title = \`Count: \${count}\`;
  }, [count]);

  return (
    <div className="counter">
      <h1>{count}</h1>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
      <button onClick={() => setCount(0)}>Reset</button>
    </div>
  );
}

export default Counter;`,
    authorId: 'usr_001',
    authorName: 'CodeType AI',
    tags: ['react', 'hooks', 'javascript'],
    likes: 891,
    plays: 3421,
    isPublic: true,
    createdAt: '2024-01-20T10:00:00Z',
  },
  {
    id: 'tpl_003',
    title: 'Spring Boot REST Controller',
    description: 'Basic Spring Boot REST API endpoint',
    language: 'java',
    difficulty: 'INTERMEDIATE',
    code: `@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserService userService;

    @GetMapping
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userService.findAll());
    }

    @PostMapping
    public ResponseEntity<User> createUser(@RequestBody @Valid CreateUserDto dto) {
        User user = userService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(user);
    }

    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(@PathVariable Long id) {
        return userService.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
}`,
    authorId: 'usr_002',
    authorName: 'SpringDev',
    tags: ['spring', 'java', 'rest'],
    likes: 567,
    plays: 2108,
    isPublic: true,
    createdAt: '2024-02-01T10:00:00Z',
  },
  {
    id: 'tpl_004',
    title: 'SQL Window Functions',
    description: 'Advanced SQL with window functions and CTEs',
    language: 'sql',
    difficulty: 'ADVANCED',
    code: `WITH ranked_sales AS (
  SELECT 
    employee_id,
    department,
    sale_amount,
    sale_date,
    ROW_NUMBER() OVER (PARTITION BY department ORDER BY sale_amount DESC) AS rank,
    SUM(sale_amount) OVER (PARTITION BY department) AS dept_total,
    AVG(sale_amount) OVER (PARTITION BY department ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS moving_avg
  FROM sales
  WHERE EXTRACT(YEAR FROM sale_date) = 2024
)
SELECT * FROM ranked_sales WHERE rank <= 3;`,
    authorId: 'usr_003',
    authorName: 'DBMaster',
    tags: ['sql', 'database', 'advanced'],
    likes: 423,
    plays: 987,
    isPublic: true,
    createdAt: '2024-02-10T10:00:00Z',
  },
  {
    id: 'tpl_005',
    title: 'Python Async/Await',
    description: 'Python async programming with asyncio',
    language: 'python',
    difficulty: 'INTERMEDIATE',
    code: `import asyncio
import aiohttp
from typing import List

async def fetch_url(session: aiohttp.ClientSession, url: str) -> dict:
    async with session.get(url) as response:
        return await response.json()

async def fetch_all(urls: List[str]) -> List[dict]:
    async with aiohttp.ClientSession() as session:
        tasks = [fetch_url(session, url) for url in urls]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        return [r for r in results if not isinstance(r, Exception)]

if __name__ == "__main__":
    urls = ["https://api.example.com/data/1", "https://api.example.com/data/2"]
    results = asyncio.run(fetch_all(urls))
    print(f"Fetched {len(results)} results")`,
    authorId: 'usr_004',
    authorName: 'PyWizard',
    tags: ['python', 'async', 'aiohttp'],
    likes: 298,
    plays: 754,
    isPublic: true,
    createdAt: '2024-02-15T10:00:00Z',
  },
  {
    id: 'tpl_006',
    title: 'TypeScript Generic Types',
    description: 'Advanced TypeScript generic utilities',
    language: 'typescript',
    difficulty: 'ADVANCED',
    code: `type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = 
  Pick<T, Exclude<keyof T, Keys>> & 
  { [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>> }[Keys];

function createStore<T extends Record<string, unknown>>(
  initialState: T
): { get: () => T; set: (partial: DeepPartial<T>) => void } {
  let state = { ...initialState };
  return {
    get: () => state,
    set: (partial) => { state = { ...state, ...partial }; },
  };
}`,
    authorId: 'usr_005',
    authorName: 'TSGuru',
    tags: ['typescript', 'generics', 'types'],
    likes: 512,
    plays: 1340,
    isPublic: true,
    createdAt: '2024-02-20T10:00:00Z',
  },
];

export const templatesApi = {
  getAll: async (filters = {}) => {
    await delay();
    let templates = [...MOCK_TEMPLATES];
    if (filters.language) templates = templates.filter(t => t.language === filters.language);
    if (filters.difficulty) templates = templates.filter(t => t.difficulty === filters.difficulty);
    if (filters.search) templates = templates.filter(t =>
      t.title.toLowerCase().includes(filters.search.toLowerCase()) ||
      t.description.toLowerCase().includes(filters.search.toLowerCase())
    );
    return { data: templates };
  },

  getById: async (id) => {
    await delay(300);
    const tpl = MOCK_TEMPLATES.find(t => t.id === id) || MOCK_TEMPLATES[0];
    return { data: tpl };
  },

  create: async (data) => {
    await delay();
    return { data: { ...data, id: 'tpl_' + Date.now(), createdAt: new Date().toISOString(), likes: 0, plays: 0 } };
  },

  update: async (id, data) => {
    await delay();
    return { data: { ...data, id } };
  },

  delete: async (id) => {
    await delay();
    return { data: { success: true } };
  },

  duplicate: async (id) => {
    await delay();
    const tpl = MOCK_TEMPLATES.find(t => t.id === id) || MOCK_TEMPLATES[0];
    return { data: { ...tpl, id: 'tpl_' + Date.now(), title: tpl.title + ' (Copy)' } };
  },

  getMyTemplates: async () => {
    await delay();
    return { data: MOCK_TEMPLATES.slice(0, 3) };
  },

  toggleLike: async (id) => {
    await delay(200);
    return { data: { liked: true } };
  },
};
