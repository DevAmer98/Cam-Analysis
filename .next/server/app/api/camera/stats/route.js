"use strict";(()=>{var e={};e.id=76,e.ids=[76],e.modules={517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},2843:(e,a,n)=>{n.r(a),n.d(a,{headerHooks:()=>p,originalPathname:()=>f,patchFetch:()=>w,requestAsyncStorage:()=>m,routeModule:()=>_,serverHooks:()=>d,staticGenerationAsyncStorage:()=>i,staticGenerationBailout:()=>g});var t={};n.r(t),n.d(t,{GET:()=>c});var s=n(5419),o=n(9108),l=n(9678),r=n(8070),u=n(7802);async function c(e){let a=new URL(e.url),n=a.searchParams.get("ip"),t=a.searchParams.get("day"),s=t?t.trim():"";if(!n)return r.Z.json({ok:!1,error:"Missing ip."},{status:400});let o=(0,u.z)(),l=await o.query("select id from cameras where ip = $1",[n]),c=l.rows[0]?.id;if(!c)return r.Z.json({ok:!0,stats:{ip:n,lastEventAt:null,channels:[]}});let _=await o.query(`select channel_no,
            coalesce(sum(in_count), 0) as people_in,
            coalesce(sum(out_count), 0) as people_out,
            max(day) as last_people_event
     from counting_stats_daily
     where ${s?"camera_id = $1 and day = $2::date":"camera_id = $1 and day >= current_date"}
     group by channel_no`,s?[c,s]:[c]),m=await o.query(`select channel_no,
            max(bucket_start) as last_face_event
     from face_stats_hourly
     where ${s?"camera_id = $1 and bucket_start >= $2::date and bucket_start < $2::date + interval '1 day'":"camera_id = $1"}
     group by channel_no`,s?[c,s]:[c]),i=await o.query(`select channel_no,
            coalesce(sum(total), 0) as faces_total,
            coalesce(sum(male), 0) as male_count,
            coalesce(sum(female), 0) as female_count,
            coalesce(sum(unknown_gender), 0) as gender_unknown,
            coalesce(sum(glasses_yes), 0) as glasses_yes,
            coalesce(sum(glasses_no), 0) as glasses_no,
            coalesce(sum(glasses_unknown), 0) as glasses_unknown,
            coalesce(sum(age_child), 0) as child_count,
            coalesce(sum(age_teen), 0) as teen_count,
            coalesce(sum(age_young_adult), 0) as young_count,
            coalesce(sum(age_middle_age), 0) as middle_count,
            coalesce(sum(age_senior), 0) as senior_count,
            coalesce(sum(age_unknown), 0) as age_unknown_count
     from face_stats_daily
     where ${s?"camera_id = $1 and day = $2::date":"camera_id = $1 and day >= current_date"}
     group by channel_no`,s?[c,s]:[c]),d=new Map;for(let e of _.rows){let a=Number(e.channel_no);d.set(a,{peopleIn:Number(e.people_in??0),peopleOut:Number(e.people_out??0),faceEvents:0,facesDetected:0,gender:{male:0,female:0,unknown:0},age:{avg:null},glasses:{yes:0,no:0,unknown:0},lastEventAt:e.last_people_event?new Date(e.last_people_event).toISOString():null})}for(let e of m.rows){let a=Number(e.channel_no),n=d.get(a)??{peopleIn:0,peopleOut:0,faceEvents:0,facesDetected:0,gender:{male:0,female:0,unknown:0},age:{avg:null},glasses:{yes:0,no:0,unknown:0},lastEventAt:null},t=e.last_face_event?new Date(e.last_face_event).toISOString():null;d.set(a,{peopleIn:n.peopleIn,peopleOut:n.peopleOut,faceEvents:n.faceEvents,facesDetected:n.facesDetected,gender:n.gender,age:n.age,glasses:n.glasses,lastEventAt:n.lastEventAt||t})}for(let e of i.rows){let a=Number(e.channel_no),n=d.get(a)??{peopleIn:0,peopleOut:0,faceEvents:0,facesDetected:0,gender:{male:0,female:0,unknown:0},age:{avg:null},glasses:{yes:0,no:0,unknown:0},lastEventAt:null},t=Number(e.child_count??0),s=Number(e.teen_count??0),o=Number(e.young_count??0),l=Number(e.middle_count??0),r=Number(e.senior_count??0),u=t+s+o+l+r,c=u>0?(6*t+16*s+30*o+50*l+70*r)/u:null,_=Number(e.faces_total??0);d.set(a,{...n,faceEvents:_,facesDetected:_,gender:{male:Number(e.male_count??0),female:Number(e.female_count??0),unknown:Number(e.gender_unknown??0)},age:{avg:c},glasses:{yes:Number(e.glasses_yes??0),no:Number(e.glasses_no??0),unknown:Number(e.glasses_unknown??0)}})}return r.Z.json({ok:!0,stats:{ip:n,lastEventAt:null,channels:Array.from(d.entries()).map(([e,a])=>({channelId:String(e),stats:a}))}})}let _=new s.AppRouteRouteModule({definition:{kind:o.x.APP_ROUTE,page:"/api/camera/stats/route",pathname:"/api/camera/stats",filename:"route",bundlePath:"app/api/camera/stats/route"},resolvedPagePath:"/Users/ameralyasin/Desktop/cam analysis/app/api/camera/stats/route.ts",nextConfigOutput:"",userland:t}),{requestAsyncStorage:m,staticGenerationAsyncStorage:i,serverHooks:d,headerHooks:p,staticGenerationBailout:g}=_,f="/api/camera/stats/route";function w(){return(0,l.patchFetch)({serverHooks:d,staticGenerationAsyncStorage:i})}},7802:(e,a,n)=>{n.d(a,{z:()=>o});let t=require("pg"),s=null;function o(){if(!s){let e=process.env.DATABASE_URL;if(!e)throw Error("DATABASE_URL is not set.");s=new t.Pool({connectionString:e})}return s}}};var a=require("../../../../webpack-runtime.js");a.C(e);var n=e=>a(a.s=e),t=a.X(0,[638,206],()=>n(2843));module.exports=t})();