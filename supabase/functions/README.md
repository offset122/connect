# Supabase Edge Functions

This directory contains Supabase Edge Functions for the Hanna's Connect app.

## Structure

```
supabase/functions/
├── index/              # Main edge function
│   ├── index.ts       # Edge function code
│   └── deno.json      # Deno configuration
└── README.md          # This file
```

## Index Edge Function

The `index` function provides a basic greeting endpoint that accepts JSON requests.

### Function Details

- **Endpoint**: `/functions/v1/index`
- **Method**: POST
- **Input**: JSON with `name` field
- **Output**: JSON greeting message with timestamp

### Request Example

```json
{
  "name": "John"
}
```

### Response Example

```json
{
  "message": "Hello John!",
  "timestamp": "2025-11-03T09:40:38.804Z"
}
```

## Usage from Frontend

### Using Supabase Client

```typescript
import { supabase } from '@/app/integrations/supabase/client';

const { data, error } = await supabase.functions.invoke('index', {
  body: { name: 'John' }
});

if (error) {
  console.error('Error calling function:', error);
} else {
  console.log('Response:', data);
}
```

### Using Fetch

```typescript
const response = await fetch(`${supabaseUrl}/functions/v1/index`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseAnonKey}`,
  },
  body: JSON.stringify({ name: 'John' }),
});

const data = await response.json();
```

## Development

### Local Development

1. **Install Supabase CLI**:
   ```bash
   npm install -g supabase
   ```

2. **Start local development**:
   ```bash
   supabase start
   supabase functions serve
   ```

3. **Test locally**:
   ```bash
   curl -X POST 'http://localhost:54321/functions/v1/index' \
   -H 'Content-Type: application/json' \
   -d '{"name": "John"}'
   ```

### Deployment

Deploy to Supabase:

```bash
supabase functions deploy index
```

### Environment Variables

Set required environment variables in Supabase dashboard:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

## Function Configuration

### Deno Configuration

The `deno.json` file configures:
- **Compiler Options**: 
  - `lib`: Deno runtime APIs
  - `strict`: Enable strict TypeScript checking
- **Imports**: Edge runtime type definitions

### Error Handling

The function includes:
- **JSON parsing errors**: Returns 400 status for invalid JSON
- **Default values**: Uses "World" if no name provided
- **Logging**: Console logging for debugging

## Best Practices

1. **Always validate input** before processing
2. **Use proper error handling** with try-catch blocks
3. **Include meaningful error messages** in responses
4. **Set appropriate HTTP status codes**
5. **Log errors** for debugging in development
6. **Use TypeScript types** for better code reliability

## Additional Functions

To create new functions, follow this pattern:

1. Create new directory: `supabase/functions/function-name/`
2. Add `index.ts` with the function code
3. Add `deno.json` with configuration
4. Deploy: `supabase functions deploy function-name`

## Troubleshooting

### Common Issues

1. **Import Errors**: Check `deno.json` imports configuration
2. **Type Errors**: Ensure proper TypeScript types are used
3. **Deployment Failures**: Check function syntax and dependencies
4. **CORS Issues**: Ensure proper headers are set

### Debug Tips

- Check Supabase logs: `supabase functions logs`
- Use console.log for debugging (visible in logs)
- Test with curl before integrating with frontend
- Check Deno runtime compatibility

## Security Considerations

- Never expose secrets in client-side code
- Validate all user input
- Use proper authentication for sensitive operations
- Rate limit function calls if needed
- Log security events for monitoring