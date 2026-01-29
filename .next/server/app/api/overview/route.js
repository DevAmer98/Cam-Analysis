"use strict";(()=>{var e={};e.id=105,e.ids=[105],e.modules={517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},6631:(e,o,n)=>{n.r(o),n.d(o,{headerHooks:()=>p,originalPathname:()=>w,patchFetch:()=>v,requestAsyncStorage:()=>m,routeModule:()=>l,serverHooks:()=>_,staticGenerationAsyncStorage:()=>d,staticGenerationBailout:()=>g});var a={};n.r(a),n.d(a,{GET:()=>i});var t=n(5419),u=n(9108),r=n(9678),s=n(8070),c=n(7802);async function i(e){let o=new URL(e.url).searchParams.get("day"),n=o?o.trim():"",a=(0,c.z)(),t=n?"day = $1::date":"day >= current_date",u=await a.query(`select coalesce(sum(in_count), 0) as people_in,
            coalesce(sum(out_count), 0) as people_out
     from counting_stats_daily
     where ${t}`,n?[n]:[]),r=n?"day = $1::date":"day >= current_date",i=await a.query(`select
        coalesce(sum(male), 0) as male_count,
        coalesce(sum(female), 0) as female_count,
        coalesce(sum(unknown_gender), 0) as unknown_count,
        coalesce(sum(age_child), 0) as child_count,
        coalesce(sum(age_teen), 0) as teen_count,
        coalesce(sum(age_young_adult), 0) as young_count,
        coalesce(sum(age_middle_age), 0) as middle_count,
        coalesce(sum(age_senior), 0) as senior_count,
        coalesce(sum(age_unknown), 0) as age_unknown_count
     from face_stats_daily
     where ${r}`,n?[n]:[]),l=u.rows[0]??{},m=i.rows[0]??{};return s.Z.json({ok:!0,totals:{peopleIn:Number(l.people_in??0),peopleOut:Number(l.people_out??0)},gender:{male:Number(m.male_count??0),female:Number(m.female_count??0),unknown:Number(m.unknown_count??0)},age:{child:Number(m.child_count??0),teen:Number(m.teen_count??0),youngAdult:Number(m.young_count??0),middleAge:Number(m.middle_count??0),senior:Number(m.senior_count??0),unknown:Number(m.age_unknown_count??0)}})}let l=new t.AppRouteRouteModule({definition:{kind:u.x.APP_ROUTE,page:"/api/overview/route",pathname:"/api/overview",filename:"route",bundlePath:"app/api/overview/route"},resolvedPagePath:"/Users/ameralyasin/Desktop/cam analysis/app/api/overview/route.ts",nextConfigOutput:"",userland:a}),{requestAsyncStorage:m,staticGenerationAsyncStorage:d,serverHooks:_,headerHooks:p,staticGenerationBailout:g}=l,w="/api/overview/route";function v(){return(0,r.patchFetch)({serverHooks:_,staticGenerationAsyncStorage:d})}},7802:(e,o,n)=>{n.d(o,{z:()=>u});let a=require("pg"),t=null;function u(){if(!t){let e=process.env.DATABASE_URL;if(!e)throw Error("DATABASE_URL is not set.");t=new a.Pool({connectionString:e})}return t}}};var o=require("../../../webpack-runtime.js");o.C(e);var n=e=>o(o.s=e),a=o.X(0,[638,206],()=>n(6631));module.exports=a})();