import { NextResponse } from "next/server";
import { createGuestCredentials } from "../../../../modules/practice/auth";
import { createPracticeSession } from "../../../../modules/practice/repository";
export const runtime="nodejs"; export const dynamic="force-dynamic";
export async function POST(request:Request){try{const body=await request.json().catch(()=>null);if(body?.mode!=="IELTS"||body?.questionCount!==5)return NextResponse.json({error:"mode must be IELTS and questionCount must be 5."},{status:400});const credentials=createGuestCredentials();const result=await createPracticeSession(credentials.hash);return NextResponse.json({...result,sessionToken:credentials.token,status:"IN_PROGRESS"},{status:201,headers:{"Cache-Control":"no-store"}});}catch(error){console.error("Create session failed",error);return NextResponse.json({error:"Unable to create practice session."},{status:500});}}
