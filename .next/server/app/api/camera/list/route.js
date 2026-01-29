"use strict";(()=>{var e={};e.id=465,e.ids=[465],e.modules={517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},9740:(e,a,t)=>{t.r(a),t.d(a,{headerHooks:()=>h,originalPathname:()=>v,patchFetch:()=>f,requestAsyncStorage:()=>l,routeModule:()=>p,serverHooks:()=>_,staticGenerationAsyncStorage:()=>m,staticGenerationBailout:()=>y});var r={};t.r(r),t.d(r,{GET:()=>u});var n=t(5419),i=t(9108),c=t(9678),o=t(8070),s=t(7802);async function d(){let e=(0,s.z)(),a=await e.query(`select column_name
     from information_schema.columns
     where table_schema = 'public' and table_name = 'cameras'`),t=new Set(a.rows.map(e=>e.column_name));return{deviceType:t.has("device_type"),zone:t.has("zone"),updatedAt:t.has("updated_at"),parentCameraId:t.has("parent_camera_id")}}async function u(){let e=(0,s.z)(),a=await d(),t=a.deviceType?"c.device_type":"null::text as device_type",r=a.zone?"c.zone":"null::text as zone",n=a.updatedAt?"c.updated_at":"null::timestamptz as updated_at",i=a.parentCameraId?"c.parent_camera_id":"null::uuid as parent_camera_id",c=(await e.query(`select c.id,
            c.ip,
            c.name,
            ${t},
            ${r},
            ${n},
            ${i},
            count(ch.id) as channels_total
     from cameras c
     left join channels ch on ch.camera_id = c.id
     group by c.id
     order by coalesce(c.updated_at, c.created_at) desc`)).rows;return o.Z.json({ok:!0,cameras:c.map(e=>({id:e.id,ip:e.ip,name:e.name,deviceType:e.device_type,zone:e.zone,channelsTotal:Number(e.channels_total??0),parentCameraId:e.parent_camera_id??null,updatedAt:e.updated_at?new Date(e.updated_at).toISOString():null}))})}let p=new n.AppRouteRouteModule({definition:{kind:i.x.APP_ROUTE,page:"/api/camera/list/route",pathname:"/api/camera/list",filename:"route",bundlePath:"app/api/camera/list/route"},resolvedPagePath:"/Users/ameralyasin/Desktop/cam analysis/app/api/camera/list/route.ts",nextConfigOutput:"",userland:r}),{requestAsyncStorage:l,staticGenerationAsyncStorage:m,serverHooks:_,headerHooks:h,staticGenerationBailout:y}=p,v="/api/camera/list/route";function f(){return(0,c.patchFetch)({serverHooks:_,staticGenerationAsyncStorage:m})}},7802:(e,a,t)=>{t.d(a,{z:()=>i});let r=require("pg"),n=null;function i(){if(!n){let e=process.env.DATABASE_URL;if(!e)throw Error("DATABASE_URL is not set.");n=new r.Pool({connectionString:e})}return n}}};var a=require("../../../../webpack-runtime.js");a.C(e);var t=e=>a(a.s=e),r=a.X(0,[638,206],()=>t(9740));module.exports=r})();