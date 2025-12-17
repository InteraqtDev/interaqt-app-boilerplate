# Scripts

This directory contains utility scripts for the CMS project.

## generate-frontend-api.ts

This script automatically generates TypeScript API client functions for all interactions defined in the backend.

### Usage

```bash
npx tsx scripts/generate-frontend-api.ts
```

### What it does

1. Reads the `backend/index.ts` file to find all Interaction definitions
2. Extracts the interaction name and payload structure from each interaction
3. Generates TypeScript interfaces for each interaction's payload
4. Creates async functions that use `fetch` to call the backend API
5. Writes all generated code to `frontend/api/index.ts`

### Generated API Structure

For each interaction, the script generates:

1. A TypeScript interface for the payload (e.g., `CreateStylePayload`)
2. An async function that:
   - Takes the typed payload as a parameter
   - Makes a POST request to `${BASE_URL}/interaction/{InteractionName}`
   - Returns the parsed JSON response
   - Throws an error if the request fails

### Example Generated Code

```typescript
export interface CreateStylePayload {
  content: string;
}

export async function createStyle(payload: CreateStylePayload): Promise<any> {
  const response = await fetch(`${BASE_URL}/interaction/CreateStyle`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}
```

### Notes

- The `BASE_URL` is expected to be a global variable in the frontend environment
- All generated functions return `Promise<any>` - you may want to add specific return types based on your API responses
- The script uses camelCase for function names (e.g., `CreateStyle` → `createStyle`)
