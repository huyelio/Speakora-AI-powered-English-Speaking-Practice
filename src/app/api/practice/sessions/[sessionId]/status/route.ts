import { NextResponse } from "next/server";
import { readSessionToken } from "../../../../../../modules/practice/auth";
import { authorizeSession,getSessionStatus } from "../../../../../../modules/practice/repository";
export const runtime="nodejs"; export const dynamic="force-dynamic";
export async function GET(request:Request,{params}:{params:Promise<{sessionId:string}>}){try{const {sessionId}=await params;if(!await authorizeSession(sessionId,readSessionToken(request)))return NextResponse.json({error:"Session not found."},{status:404});return NextResponse.json(await getSessionStatus(sessionId),{headers:{"Cache-Control":"no-store"}});}catch(error){console.error("Status failed",error);return NextResponse.json({error:"Unable to load session status."},{status:500});}}
