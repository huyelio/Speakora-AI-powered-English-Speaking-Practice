import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ user: {id:"user-1"} as {id:string}|null, session: null as unknown, assessment: null as unknown, saved: null as unknown, reset: null as unknown }));
vi.mock("server-only",()=>({}));
vi.mock("../../../lib/supabase/auth-server",()=>({
  getRequestUser: async()=>state.user,
  createAuthServerClient: async()=>({
    rpc: async(_name:string,args:unknown)=>{state.saved=args;return {error:null};},
    from: ()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:null})})})}),
  }),
}));
vi.mock("../../../lib/supabase/server",()=>({getSupabaseAdminClient:()=>({
  from: (table:string)=>({
    select: ()=>{ const q={eq:()=>q,maybeSingle:async()=>({data:table==="practice_sessions"?state.session:state.assessment,error:null})};return q;},
    update: (change:unknown)=>({eq:async(column:string,userId:string)=>{state.reset={change,column,userId};return {error:null};}}),
  }),
})}));
import { PUT, POST } from "./route";
const payload={displayName:"Lan",currentLevel:"A2",learningPurpose:"IELTS",targetScore:6.5,dailyGoalMinutes:10,preferredTopics:["22222222-2222-4222-8222-222222222222"],timezone:"UTC",completeOnboarding:true};
const sessionId="11111111-1111-4111-8111-111111111111";
const request=(body:unknown)=>new Request("http://localhost/api/profile",{method:"PUT",body:JSON.stringify(body)});
const completedSession={id:sessionId,user_id:"user-1",status:"COMPLETED",session_kind:"QUICK_CHECK",question_count:3,session_questions:[{user_answers:[{status:"TRANSCRIBED"}]},{user_answers:[{status:"TRANSCRIBED"}]},{user_answers:[{status:"TRANSCRIBED"}]}]};
describe("profile API",()=>{
  beforeEach(()=>{state.user={id:"user-1"};state.saved=null;state.reset=null;state.session=completedSession;state.assessment={raw_output:{estimated_cefr:"B1",feedback:"Bạn diễn đạt khá rõ.",recommendation:"Luyện kể chuyện hằng ngày."}};});
  afterEach(()=>vi.unstubAllEnvs());
  it("authenticates updates",async()=>{state.user=null;expect((await PUT(request(payload))).status).toBe(401);expect(state.saved).toBeNull();});
  it("rejects a legacy completion bypass",async()=>{expect((await PUT(request({displayName:"Lan",level:"BEGINNER",learningPurpose:"IELTS",timezone:"UTC",dailyAnswerTarget:5}))).status).toBe(400);expect(state.saved).toBeNull();});
  it("saves drafts without claiming onboarding completion",async()=>{expect((await PUT(request({...payload,currentLevel:null,completeOnboarding:false}))).status).toBe(200);expect(state.saved).toMatchObject({p_current_level:null,p_complete_onboarding:false});});
  it("uses the verified check even when a learner also selected a level",async()=>{expect((await PUT(request({...payload,speakingCheckSessionId:sessionId}))).status).toBe(200);expect(state.saved).toMatchObject({p_current_level:"B1",p_speaking_check_session_id:sessionId,p_complete_onboarding:true});});
  it("accepts the one-to-one answer shape returned by PostgREST",async()=>{
    state.session={...completedSession,session_questions:[{user_answers:{status:"TRANSCRIBED"}},{user_answers:{status:"TRANSCRIBED"}},{user_answers:{status:"TRANSCRIBED"}}]};
    expect((await PUT(request({...payload,currentLevel:null,speakingCheckSessionId:sessionId}))).status).toBe(200);
    expect(state.saved).toMatchObject({p_current_level:"B1"});
  });
  it.each([{user_id:"other"},{status:"PROCESSING"},{session_kind:null},{question_count:5},{session_questions:[{user_answers:[{status:"TRANSCRIBED"}]}]}])("rejects an unowned or unfinished check %j",async(change)=>{state.session={...completedSession,...change};expect((await PUT(request({...payload,currentLevel:null,speakingCheckSessionId:sessionId}))).status).toBe(400);expect(state.saved).toBeNull();});
  it("rejects malformed provider output",async()=>{state.assessment={raw_output:{estimated_cefr:"EXPERT"}};expect((await PUT(request({...payload,currentLevel:null,speakingCheckSessionId:sessionId}))).status).toBe(400);expect(state.saved).toBeNull();});
  it("denies reset in production",async()=>{vi.stubEnv("NODE_ENV","production");expect((await POST(request({action:"reset-onboarding"}))).status).toBe(403);expect(state.reset).toBeNull();});
  it("authenticates resets",async()=>{vi.stubEnv("NODE_ENV","development");state.user=null;expect((await POST(request({action:"reset-onboarding"}))).status).toBe(401);expect(state.reset).toBeNull();});
  it("resets only completion for the authenticated user",async()=>{vi.stubEnv("NODE_ENV","development");expect((await POST(request({action:"reset-onboarding",userId:"other"}))).status).toBe(200);expect(state.reset).toEqual({change:{onboarding_completed_at:null},column:"user_id",userId:"user-1"});});
});
