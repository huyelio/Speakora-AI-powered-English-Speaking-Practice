import { NextResponse } from "next/server";
import { readSessionToken } from "../../../../../../modules/practice/auth";
import { authorizeSession,getAssessment,getSessionStatus } from "../../../../../../modules/practice/repository";
export const runtime="nodejs"; export const dynamic="force-dynamic";
export async function GET(request:Request,{params}:{params:Promise<{sessionId:string}>}){try{const {sessionId}=await params;if(!await authorizeSession(sessionId,readSessionToken(request)))return NextResponse.json({error:"Session not found."},{status:404});const result=await getAssessment(sessionId);if(!result)return NextResponse.json({status:await getSessionStatus(sessionId)},{status:202,headers:{"Cache-Control":"no-store"}});return NextResponse.json({sessionId,result},{headers:{"Cache-Control":"no-store"}});}catch(error){console.error("Result failed",error);return NextResponse.json({error:"Unable to load result."},{status:500});}}
