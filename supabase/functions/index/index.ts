// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
console.info('server started');

Deno.serve(async (req: Request) => {
  try {
    const { name } = await req.json();
    
    const data = {
      message: `Hello ${name || 'World'}!`,
      timestamp: new Date().toISOString()
    };
    
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Connection': 'keep-alive'
      }
    });
  } catch (error) {
    console.error('Error processing request:', error);
    
    return new Response(JSON.stringify({
      error: 'Invalid JSON payload',
      message: 'Please provide valid JSON with a "name" field'
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});