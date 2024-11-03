export const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://games.yiays.com',
  'Access-Control-Max-Age': '86400',
};

export async function handleCORSRequest(request:Request): Promise<Response> {
  let headers = request.headers
  if (
      headers.get("Origin") !== null &&
      headers.get("Access-Control-Request-Method") !== null &&
      headers.get("Access-Control-Request-Headers") !== null
  ) {
      // Handle CORS pre-flight request.
      // If you want to check or reject the requested method + headers
      // you can do that here.
      let respHeaders = {
          ...corsHeaders,
          // Allow all future content Request headers to go back to browser
          // such as Authorization (Bearer) or X-Client-Name-Version
          "Access-Control-Allow-Headers": request.headers.get("Access-Control-Request-Headers") || "",
      }
      return new Response(null, {
          headers: respHeaders,
      })
  }
  return new Response("No such method", {headers: corsHeaders, status: 404})
}