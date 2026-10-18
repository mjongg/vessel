// Installation should activate the share worker before sharing. Do not accept
// unauthenticated file bodies on the server if that worker is unavailable.
export async function POST(request:Request){return Response.redirect(new URL('/?shareError=1',request.url),303)}
