import { NextResponse } from "next/server";
import { readSessionToken } from "../../../../../../../../modules/practice/auth";
import { AudioAccessError, resolveAuthorizedAudio } from "../../../../../../../../modules/practice/audio-access";
import { authorizeSession, findAnswerAudio } from "../../../../../../../../modules/practice/repository";
import { getSupabaseAdminClient } from "../../../../../../../../lib/supabase/server";

export const runtime="nodejs"; export const dynamic="force-dynamic";

export async function GET(request:Request,{params}:{params:Promise<{sessionId:string;answerId:string}>}){
  try{
    const {sessionId,answerId}=await params;
    const audio=await resolveAuthorizedAudio({sessionId,answerId,token:readSessionToken(request)},{authorizeSession,findAnswerAudio});
    const {data,error}=await getSupabaseAdminClient().storage.from(audio.bucket).download(audio.path);
    if(error||!data) throw new AudioAccessError(404,"Audio not found.");
    return new Response(data,{headers:{"Content-Type":audio.mimeType,"Content-Length":String(data.size),"Cache-Control":"private, no-store","Content-Disposition":"inline"}});
  }catch(error){
    if(error instanceof AudioAccessError)return NextResponse.json({error:error.message},{status:error.status});
    console.error("Audio playback failed",error);return NextResponse.json({error:"Unable to load audio."},{status:500});
  }
}
