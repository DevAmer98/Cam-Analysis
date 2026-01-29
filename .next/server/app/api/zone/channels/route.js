"use strict";(()=>{var e={};e.id=228,e.ids=[228],e.modules={517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},9134:(e,n,a)=>{a.r(n),a.d(n,{headerHooks:()=>p,originalPathname:()=>w,patchFetch:()=>y,requestAsyncStorage:()=>d,routeModule:()=>i,serverHooks:()=>f,staticGenerationAsyncStorage:()=>h,staticGenerationBailout:()=>g});var t={};a.r(t),a.d(t,{GET:()=>m});var s=a(5419),c=a(9108),o=a(9678),l=a(8070),r=a(7802);let u=()=>({peopleIn:0,peopleOut:0,faceEvents:0,facesDetected:0,gender:{male:0,female:0,unknown:0},age:{avg:null},glasses:{yes:0,no:0,unknown:0},lastEventAt:null}),_=()=>({child:0,teen:0,youngAdult:0,middleAge:0,senior:0,unknown:0});async function m(e){let n=new URL(e.url),a=n.searchParams.get("zone")?.trim(),t=n.searchParams.get("day"),s=t?t.trim():"";if(!a)return l.Z.json({ok:!1,error:"Missing zone."},{status:400});let c=(0,r.z)(),o=(await c.query(`select c.id as camera_id,
            c.ip,
            c.name as camera_name,
            ch.channel_no,
            ch.name as channel_name,
            ch.zone,
            ch.features,
            ch.capabilities
     from channels ch
     join cameras c on c.id = ch.camera_id
     where ch.zone = $1
     order by coalesce(c.name, c.ip) asc, ch.channel_no asc`,[a])).rows,m=s?[a,s]:[a],i=await c.query(`select p.camera_id,
            p.channel_no,
            coalesce(sum(p.in_count), 0) as people_in,
            coalesce(sum(p.out_count), 0) as people_out,
            max(p.day) as last_people_event
     from counting_stats_daily p
     join channels ch
       on ch.camera_id = p.camera_id and ch.channel_no = p.channel_no
     where ${s?"ch.zone = $1 and p.day = $2::date":"ch.zone = $1 and p.day >= current_date"}
     group by p.camera_id, p.channel_no`,m),d=s?[a,s]:[a],h=await c.query(`select f.camera_id,
            f.channel_no,
            max(f.bucket_start) as last_face_event
     from face_stats_hourly f
     join channels ch
       on ch.camera_id = f.camera_id and ch.channel_no = f.channel_no
     where ${s?"ch.zone = $1 and f.bucket_start >= $2::date and f.bucket_start < $2::date + interval '1 day'":"ch.zone = $1"}
     group by f.camera_id, f.channel_no`,d),f=s?[a,s]:[a],p=await c.query(`select f.camera_id,
            f.channel_no,
            coalesce(sum(f.total), 0) as faces_total,
            coalesce(sum(f.male), 0) as male_count,
            coalesce(sum(f.female), 0) as female_count,
            coalesce(sum(f.unknown_gender), 0) as gender_unknown,
            coalesce(sum(f.glasses_yes), 0) as glasses_yes,
            coalesce(sum(f.glasses_no), 0) as glasses_no,
            coalesce(sum(f.glasses_unknown), 0) as glasses_unknown,
            coalesce(sum(f.age_child), 0) as child_count,
            coalesce(sum(f.age_teen), 0) as teen_count,
            coalesce(sum(f.age_young_adult), 0) as young_count,
            coalesce(sum(f.age_middle_age), 0) as middle_count,
            coalesce(sum(f.age_senior), 0) as senior_count,
            coalesce(sum(f.age_unknown), 0) as age_unknown_count
     from face_stats_daily f
     join channels ch
       on ch.camera_id = f.camera_id and ch.channel_no = f.channel_no
     where ${s?"ch.zone = $1 and f.day = $2::date":"ch.zone = $1 and f.day >= current_date"}
     group by f.camera_id, f.channel_no`,f),g=new Map,w=new Map,y=(e,n)=>`${e}:${n}`;for(let e of i.rows){let n=e.camera_id,a=Number(e.channel_no);g.set(y(n,a),{peopleIn:Number(e.people_in??0),peopleOut:Number(e.people_out??0),faceEvents:0,facesDetected:0,gender:{male:0,female:0,unknown:0},age:{avg:null},glasses:{yes:0,no:0,unknown:0},lastEventAt:e.last_people_event?new Date(e.last_people_event).toISOString():null})}for(let e of h.rows){let n=y(e.camera_id,Number(e.channel_no)),a=g.get(n)??u(),t=e.last_face_event?new Date(e.last_face_event).toISOString():null;g.set(n,{...a,faceEvents:a.faceEvents,facesDetected:a.facesDetected,lastEventAt:a.lastEventAt||t})}for(let e of p.rows){let n=y(e.camera_id,Number(e.channel_no)),a=g.get(n)??u(),t=Number(e.child_count??0),s=Number(e.teen_count??0),c=Number(e.young_count??0),o=Number(e.middle_count??0),l=Number(e.senior_count??0),r=t+s+c+o+l,_=r>0?(6*t+16*s+30*c+50*o+70*l)/r:null,m=Number(e.faces_total??0);g.set(n,{...a,faceEvents:m,facesDetected:m,gender:{male:Number(e.male_count??0),female:Number(e.female_count??0),unknown:Number(e.gender_unknown??0)},age:{avg:_},glasses:{yes:Number(e.glasses_yes??0),no:Number(e.glasses_no??0),unknown:Number(e.glasses_unknown??0)}}),w.set(n,{child:t,teen:s,youngAdult:c,middleAge:o,senior:l,unknown:Number(e.age_unknown_count??0)})}return l.Z.json({ok:!0,zone:a,channels:o.map(e=>{let n=e.camera_id,a=Number(e.channel_no);return{cameraId:n,cameraIp:e.ip,cameraName:e.camera_name,channelId:String(a),channelName:"string"==typeof e.channel_name&&e.channel_name.trim()?e.channel_name.trim():`Channel ${a}`,zone:e.zone,features:e.features??[],capabilities:e.capabilities??null,stats:g.get(y(n,a))??u(),ageBuckets:w.get(y(n,a))??_()}})})}let i=new s.AppRouteRouteModule({definition:{kind:c.x.APP_ROUTE,page:"/api/zone/channels/route",pathname:"/api/zone/channels",filename:"route",bundlePath:"app/api/zone/channels/route"},resolvedPagePath:"/Users/ameralyasin/Desktop/cam analysis/app/api/zone/channels/route.ts",nextConfigOutput:"",userland:t}),{requestAsyncStorage:d,staticGenerationAsyncStorage:h,serverHooks:f,headerHooks:p,staticGenerationBailout:g}=i,w="/api/zone/channels/route";function y(){return(0,o.patchFetch)({serverHooks:f,staticGenerationAsyncStorage:h})}},7802:(e,n,a)=>{a.d(n,{z:()=>c});let t=require("pg"),s=null;function c(){if(!s){let e=process.env.DATABASE_URL;if(!e)throw Error("DATABASE_URL is not set.");s=new t.Pool({connectionString:e})}return s}}};var n=require("../../../../webpack-runtime.js");n.C(e);var a=e=>n(n.s=e),t=n.X(0,[638,206],()=>a(9134));module.exports=t})();