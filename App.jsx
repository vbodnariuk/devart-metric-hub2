import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";

// ═══════════════════════════════════════════════════════
// DEVART METRIC HUB v6.4
// Module 1: Metric Map | Module 2: KPI Profiles | Module 3: KPI Tracker | Module 4: Dashboard
// v6.1 fixes: ID collision, "Target is exact" calc, 0-value display, seed weights, data integrity warnings
// v6.2: Period filter/grouping, "Copy from previous" wizard, prev period column, multi-period seed data
// v6.3: Cascading BU -> Dept -> Team org filter (shared OrgFilter component), team field in profiles
// v6.4: Dashboard module - Company Overview, BU Detail, Coverage & Health views + period filter
// ═══════════════════════════════════════════════════════

const C = {
  dk: "#1B4F72", md: "#2E86C1", lt: "#D6EAF8", pl: "#F2F8FD",
  brd: "#BDC3C7", grey: "#999", wh: "#FFF", bk: "#1a1a1a",
  grn: "#27AE60", red: "#E74C3C", purp: "#8E44AD", ylw: "#F39C12",
};

const BU_CFG = {
  DEV: { name: "Devart BU", depts: ["Engineering","Product","Marketing","Sales","Support","Revenue Operations","BizDev"] },
  SKY: { name: "Skyvia", depts: ["Engineering","Product","Marketing","Sales","Support","Partnerships"] },
  OTX: { name: "OnTaxi", depts: ["Platform","Operations","Marketing"] },
  MOB: { name: "Mobion", depts: ["Operations","Engineering","Product","QA","Marketing","Sales","Geo Data"] },
  CORE: { name: "Core", depts: ["HR","IT","Finance","Analytics","OpEx"] },
};

const BSC = ["Financial","Customer","Internal Process","Learning & Growth"];
const CATS = ["Revenue","Profitability","Efficiency","Quality","Growth","Engagement","Compliance","Cost"];
const FREQ = ["Monthly","Quarterly"];
const DIRECTIONS = ["Higher is better","Lower is better","Target is exact"];
const KPI_TYPES = ["Quantitative","Qualitative","Smart task"];

const STORAGE_METRICS = "devart-metric-hub-v5";
const STORAGE_PROFILES = "devart-kpi-profiles-v3";
const STORAGE_TRACKERS = "devart-kpi-tracker-v1";

// ═══════════════════════════════════════════════════════
// SEED DATA
// ═══════════════════════════════════════════════════════

const SEED_METRICS = [
  {id:"D-001",name:"New Revenue",bu:"DEV",dept:"Sales",bsc:"Financial",cat:"Revenue",unit:"USD",dir:"Higher is better",desc:"Total revenue from new license sales and new subscriptions",scope:"Product Line, Region",parent:null,targetSrc:"FP&A annual plan",actualSrc:"CRM + Billing system",targetCalc:"Annual target / periods proportionally",baseCalc:"Previous period actual",actualCalc:"Sum of closed-won deals in period"},
  {id:"D-002",name:"Renewal Revenue",bu:"DEV",dept:"Sales",bsc:"Financial",cat:"Revenue",unit:"USD",dir:"Higher is better",desc:"Revenue from subscription renewals and maintenance renewals",scope:"Product Line",parent:null,targetSrc:"FP&A based on expiring contracts",actualSrc:"Billing system",targetCalc:"Expiring base * target renewal rate",baseCalc:"Previous period actual",actualCalc:"Sum of renewed contracts value"},
  {id:"D-003",name:"Churn Rate",bu:"DEV",dept:"Sales",bsc:"Customer",cat:"Quality",unit:"%",dir:"Lower is better",desc:"Percentage of customers who did not renew",scope:"Product Line, Customer Segment",parent:null,targetSrc:"Historical trend + strategy",actualSrc:"CRM",targetCalc:"Historical average - improvement target",baseCalc:"Industry benchmark (15-20% for dev tools)",actualCalc:"Lost customers / Total renewable base * 100"},
  {id:"D-004",name:"MRR Growth Rate",bu:"DEV",dept:"Sales",bsc:"Financial",cat:"Growth",unit:"%",dir:"Higher is better",desc:"Month-over-month growth in Monthly Recurring Revenue",scope:"Product Line",parent:"D-001",targetSrc:"Growth strategy",actualSrc:"Billing system",targetCalc:"Strategic growth target / 12",baseCalc:"Previous 3-month average",actualCalc:"(MRR current - MRR previous) / MRR previous * 100"},
  {id:"D-005",name:"Lead-to-Customer Conversion Rate",bu:"DEV",dept:"Marketing",bsc:"Internal Process",cat:"Efficiency",unit:"%",dir:"Higher is better",desc:"Percentage of marketing qualified leads that become paying customers",scope:"Channel, Product Line",parent:null,targetSrc:"Historical + campaign plan",actualSrc:"CRM + Marketing automation",targetCalc:"Historical rate + targeted improvement",baseCalc:"Previous quarter average",actualCalc:"New customers / MQLs * 100"},
  {id:"D-006",name:"Cost per Lead",bu:"DEV",dept:"Marketing",bsc:"Financial",cat:"Cost",unit:"USD",dir:"Lower is better",desc:"Average cost to acquire one marketing qualified lead",scope:"Channel",parent:null,targetSrc:"Marketing budget / planned leads",actualSrc:"Marketing automation + Finance",targetCalc:"Total marketing spend / target lead volume",baseCalc:"Previous quarter CPL",actualCalc:"Total marketing spend / Total MQLs generated"},
  {id:"D-007",name:"Feature Delivery Rate",bu:"DEV",dept:"Product",bsc:"Internal Process",cat:"Efficiency",unit:"%",dir:"Higher is better",desc:"Percentage of planned features delivered on time",scope:"Product Line",parent:null,targetSrc:"Product roadmap",actualSrc:"Jira",targetCalc:"90% of planned scope",baseCalc:"Previous quarter rate",actualCalc:"Features delivered on time / Total planned features * 100"},
  {id:"D-008",name:"Bug Escape Rate",bu:"DEV",dept:"Engineering",bsc:"Internal Process",cat:"Quality",unit:"per release",dir:"Lower is better",desc:"Number of critical bugs found in production per release",scope:"Product Line",parent:null,targetSrc:"Quality standards",actualSrc:"Jira + Support tickets",targetCalc:"Max 2 critical bugs per release",baseCalc:"Previous 3-release average",actualCalc:"Critical bugs found post-release / Number of releases"},
  {id:"D-009",name:"CSAT Score",bu:"DEV",dept:"Support",bsc:"Customer",cat:"Quality",unit:"score (1-5)",dir:"Higher is better",desc:"Customer satisfaction score from post-interaction surveys",scope:"Product Line",parent:null,targetSrc:"Industry benchmark",actualSrc:"Survey platform",targetCalc:"4.2+ (industry top quartile)",baseCalc:"Previous quarter average",actualCalc:"Average of all survey responses"},
  {id:"D-010",name:"First Response Time",bu:"DEV",dept:"Support",bsc:"Customer",cat:"Efficiency",unit:"hours",dir:"Lower is better",desc:"Average time to first meaningful response on support tickets",scope:"Priority Level",parent:null,targetSrc:"SLA standards",actualSrc:"Help desk system",targetCalc:"P1: 1h, P2: 4h, P3: 8h",baseCalc:"Previous month average",actualCalc:"Sum of first response times / Total tickets"},
  {id:"D-011",name:"Net Revenue Retention",bu:"DEV",dept:"Sales",bsc:"Financial",cat:"Revenue",unit:"%",dir:"Higher is better",desc:"Revenue retained from existing customers including upsells",scope:"Product Line",parent:"D-002",targetSrc:"Growth strategy",actualSrc:"Billing system",targetCalc:"110%+",baseCalc:"Previous period NRR",actualCalc:"(Starting MRR + Expansion - Contraction - Churn) / Starting MRR * 100"},
  {id:"D-012",name:"Engineering Velocity",bu:"DEV",dept:"Engineering",bsc:"Internal Process",cat:"Efficiency",unit:"story points",dir:"Higher is better",desc:"Average story points completed per sprint per team",scope:"Team",parent:null,targetSrc:"Historical capacity",actualSrc:"Jira",targetCalc:"Rolling 4-sprint average + 5%",baseCalc:"Rolling 4-sprint average",actualCalc:"Total story points completed / Number of sprints"},
  {id:"D-100",name:"Organic Traffic",bu:"DEV",dept:"Marketing",bsc:"Customer",cat:"Growth",unit:"sessions",dir:"Higher is better",desc:"Monthly organic search sessions across all Devart web properties",scope:"Product Line",parent:null,targetSrc:"SEO growth plan",actualSrc:"Google Analytics",targetCalc:"Previous period + growth target",baseCalc:"Previous quarter average",actualCalc:"Sum of organic sessions from GA"},
  {id:"D-103",name:"AI & Search Visibility Index",bu:"DEV",dept:"Marketing",bsc:"Customer",cat:"Growth",unit:"index",dir:"Higher is better",desc:"Composite index measuring brand visibility in AI answers and search results",scope:"Product Line",parent:null,targetSrc:"Competitive benchmark",actualSrc:"SEO tools + manual audit",targetCalc:"Quarterly improvement target",baseCalc:"Previous quarter index",actualCalc:"Weighted composite of search rankings, AI mentions, featured snippets"},
  {id:"D-122",name:"First Downloads",bu:"DEV",dept:"Marketing",bsc:"Customer",cat:"Growth",unit:"downloads",dir:"Higher is better",desc:"Number of first-time product downloads (trial starts)",scope:"Product Line, Channel",parent:null,targetSrc:"Marketing plan",actualSrc:"Download tracking system",targetCalc:"Campaign targets aggregated",baseCalc:"Previous period actual",actualCalc:"Count of unique first downloads"},
  {id:"D-123",name:"Registrations TMetric",bu:"DEV",dept:"Marketing",bsc:"Customer",cat:"Growth",unit:"registrations",dir:"Higher is better",desc:"New user registrations for TMetric platform",scope:"Channel",parent:null,targetSrc:"Growth plan",actualSrc:"TMetric platform",targetCalc:"Monthly growth target",baseCalc:"Previous period actual",actualCalc:"Count of new registrations"},
  {id:"S-001",name:"New MRR",bu:"SKY",dept:"Sales",bsc:"Financial",cat:"Revenue",unit:"USD",dir:"Higher is better",desc:"New Monthly Recurring Revenue from new customers",scope:"Plan Type, Channel",parent:null,targetSrc:"Growth plan",actualSrc:"Billing system",targetCalc:"Annual target / 12",baseCalc:"Previous month actual",actualCalc:"Sum of new subscriptions MRR"},
  {id:"S-002",name:"Trial-to-Paid Conversion",bu:"SKY",dept:"Marketing",bsc:"Internal Process",cat:"Efficiency",unit:"%",dir:"Higher is better",desc:"Percentage of free trial users who convert to paid plans",scope:"Plan Type",parent:null,targetSrc:"Funnel optimization plan",actualSrc:"Product analytics + Billing",targetCalc:"Historical + A/B test improvements",baseCalc:"Previous quarter average",actualCalc:"Paid conversions / Trial starts * 100"},
  {id:"S-003",name:"Platform Uptime",bu:"SKY",dept:"Engineering",bsc:"Internal Process",cat:"Quality",unit:"%",dir:"Higher is better",desc:"Percentage of time the Skyvia platform is operational",scope:"",parent:null,targetSrc:"SLA commitment",actualSrc:"Monitoring system",targetCalc:"99.9%",baseCalc:"99.5% (minimum acceptable)",actualCalc:"(Total minutes - Downtime minutes) / Total minutes * 100"},
  {id:"S-004",name:"Data Sync Error Rate",bu:"SKY",dept:"Engineering",bsc:"Internal Process",cat:"Quality",unit:"%",dir:"Lower is better",desc:"Percentage of data synchronization jobs that fail",scope:"Connector Type",parent:null,targetSrc:"Quality standards",actualSrc:"Platform logs",targetCalc:"<0.5%",baseCalc:"Previous quarter average",actualCalc:"Failed sync jobs / Total sync jobs * 100"},
  {id:"S-005",name:"Active Users Growth",bu:"SKY",dept:"Product",bsc:"Customer",cat:"Growth",unit:"%",dir:"Higher is better",desc:"Month-over-month growth in monthly active users",scope:"",parent:null,targetSrc:"Product strategy",actualSrc:"Product analytics",targetCalc:"5% MoM",baseCalc:"Previous 3-month average",actualCalc:"(MAU current - MAU previous) / MAU previous * 100"},
  {id:"S-006",name:"ARPU",bu:"SKY",dept:"Sales",bsc:"Financial",cat:"Profitability",unit:"USD",dir:"Higher is better",desc:"Average Revenue Per User per month",scope:"Plan Type",parent:null,targetSrc:"Pricing strategy",actualSrc:"Billing system",targetCalc:"Weighted average of plan prices * target mix",baseCalc:"Previous quarter ARPU",actualCalc:"Total MRR / Total paying users"},
  {id:"O-001",name:"Rides Completed",bu:"OTX",dept:"Operations",bsc:"Financial",cat:"Revenue",unit:"rides",dir:"Higher is better",desc:"Total number of completed rides",scope:"City, Vehicle Type",parent:null,targetSrc:"Operations plan",actualSrc:"Platform",targetCalc:"Historical trend + market expansion",baseCalc:"Previous period actual",actualCalc:"Count of rides with status=completed"},
  {id:"O-002",name:"Driver Utilization Rate",bu:"OTX",dept:"Operations",bsc:"Internal Process",cat:"Efficiency",unit:"%",dir:"Higher is better",desc:"Percentage of online driver time spent on active rides",scope:"City",parent:null,targetSrc:"Operations model",actualSrc:"Platform",targetCalc:"65%+ in core hours",baseCalc:"Previous month average",actualCalc:"Total ride time / Total online time * 100"},
  {id:"O-003",name:"Rider Satisfaction",bu:"OTX",dept:"Operations",bsc:"Customer",cat:"Quality",unit:"score (1-5)",dir:"Higher is better",desc:"Average rider rating after completed rides",scope:"City",parent:null,targetSrc:"Competitive benchmark",actualSrc:"Platform ratings",targetCalc:"4.5+",baseCalc:"Previous quarter average",actualCalc:"Sum of rider ratings / Total rated rides"},
  {id:"O-004",name:"ETA Accuracy",bu:"OTX",dept:"Platform",bsc:"Internal Process",cat:"Quality",unit:"%",dir:"Higher is better",desc:"How accurately the app predicts arrival time",scope:"City",parent:null,targetSrc:"Product standards",actualSrc:"Platform analytics",targetCalc:"Within 2 min for 90%+ rides",baseCalc:"Previous month accuracy",actualCalc:"Rides within ETA tolerance / Total rides * 100"},
  {id:"O-005",name:"Pickup Rate (Vyviz)",bu:"OTX",dept:"Operations",bsc:"Customer",cat:"Quality",unit:"%",dir:"Higher is better",desc:"Percentage of ride requests that result in a completed pickup",scope:"City",parent:null,targetSrc:"Avg 6 months + X%, max Y%",actualSrc:"Platform",targetCalc:"Avg 6 months + improvement target, capped",baseCalc:"KPI Target - N%",actualCalc:"Completed pickups / Total ride requests * 100"},
  {id:"M-001",name:"Active Devices",bu:"MOB",dept:"Product",bsc:"Customer",cat:"Growth",unit:"devices",dir:"Higher is better",desc:"Number of actively used Mobion devices/installations",scope:"Client, Region",parent:null,targetSrc:"Growth plan",actualSrc:"Platform analytics",targetCalc:"Client deployment schedule",baseCalc:"Previous period count",actualCalc:"Count of devices with activity in last 30 days"},
  {id:"M-002",name:"Platform Reliability",bu:"MOB",dept:"Engineering",bsc:"Internal Process",cat:"Quality",unit:"%",dir:"Higher is better",desc:"Uptime and stability of Mobion platform",scope:"",parent:null,targetSrc:"SLA commitments",actualSrc:"Monitoring",targetCalc:"99.5%+",baseCalc:"Previous quarter average",actualCalc:"Uptime minutes / Total minutes * 100"},
  {id:"M-003",name:"Client Onboarding Time",bu:"MOB",dept:"Operations",bsc:"Internal Process",cat:"Efficiency",unit:"days",dir:"Lower is better",desc:"Average days from contract to live deployment",scope:"Client Type",parent:null,targetSrc:"Operations standards",actualSrc:"Project tracking",targetCalc:"30 days",baseCalc:"Previous quarter average",actualCalc:"Avg (go-live date - contract date) for new clients"},
  {id:"M-004",name:"Geo Data Accuracy",bu:"MOB",dept:"Geo Data",bsc:"Internal Process",cat:"Quality",unit:"%",dir:"Higher is better",desc:"Accuracy of geospatial data in the platform",scope:"Region",parent:null,targetSrc:"Quality standards",actualSrc:"QA audits",targetCalc:"98%+",baseCalc:"Previous audit results",actualCalc:"Correct data points / Total audited points * 100"},
  {id:"C-001",name:"Time to Hire",bu:"CORE",dept:"HR",bsc:"Internal Process",cat:"Efficiency",unit:"days",dir:"Lower is better",desc:"Average calendar days from job opening to accepted offer",scope:"Department, Level",parent:null,targetSrc:"Recruitment standards",actualSrc:"ATS",targetCalc:"30 days (tech), 21 days (non-tech)",baseCalc:"Previous quarter average",actualCalc:"Sum of (offer accepted date - req open date) / Total hires"},
  {id:"C-002",name:"Employee Turnover Rate",bu:"CORE",dept:"HR",bsc:"Learning & Growth",cat:"Engagement",unit:"%",dir:"Lower is better",desc:"Percentage of employees who left voluntarily",scope:"BU, Department",parent:null,targetSrc:"Industry benchmark",actualSrc:"HRIS",targetCalc:"<12% annually",baseCalc:"Industry average (15-18% for IT Ukraine)",actualCalc:"Voluntary leavers / Average headcount * 100 * (12/months)"},
  {id:"C-003",name:"Training Hours per Employee",bu:"CORE",dept:"HR",bsc:"Learning & Growth",cat:"Growth",unit:"hours",dir:"Higher is better",desc:"Average training/development hours per employee per quarter",scope:"BU",parent:null,targetSrc:"L&D strategy",actualSrc:"LMS",targetCalc:"20 hours/quarter",baseCalc:"Previous quarter actual",actualCalc:"Total training hours / Average headcount"},
  {id:"C-004",name:"eNPS",bu:"CORE",dept:"HR",bsc:"Learning & Growth",cat:"Engagement",unit:"score",dir:"Higher is better",desc:"Employee Net Promoter Score from quarterly pulse surveys",scope:"BU",parent:null,targetSrc:"Engagement strategy",actualSrc:"Survey platform",targetCalc:"30+ (good), 50+ (excellent)",baseCalc:"Previous survey result",actualCalc:"(Promoters% - Detractors%) * 100"},
  {id:"C-005",name:"Budget Variance",bu:"CORE",dept:"Finance",bsc:"Financial",cat:"Efficiency",unit:"%",dir:"Lower is better",desc:"Absolute deviation of actual spend from approved budget",scope:"BU, Cost Category",parent:null,targetSrc:"Budget policy",actualSrc:"ERP / Accounting",targetCalc:"<5%",baseCalc:"0% (perfect accuracy)",actualCalc:"|Actual spend - Budget| / Budget * 100"},
  {id:"C-006",name:"Month-End Close Time",bu:"CORE",dept:"Finance",bsc:"Internal Process",cat:"Efficiency",unit:"business days",dir:"Lower is better",desc:"Number of business days to complete monthly financial close",scope:"",parent:null,targetSrc:"Accounting standards",actualSrc:"Close checklist",targetCalc:"5 business days",baseCalc:"Previous quarter average",actualCalc:"Date of final close entry - Period end date (business days)"},
  {id:"C-007",name:"Forecast Accuracy",bu:"CORE",dept:"Finance",bsc:"Internal Process",cat:"Quality",unit:"%",dir:"Higher is better",desc:"Accuracy of quarterly revenue and cost forecasts",scope:"BU",parent:null,targetSrc:"FP&A standards",actualSrc:"ERP comparison",targetCalc:"Within 5% of actual",baseCalc:"Previous quarter accuracy",actualCalc:"1 - |Forecast - Actual| / Actual * 100"},
  {id:"C-008",name:"System Uptime",bu:"CORE",dept:"IT",bsc:"Internal Process",cat:"Quality",unit:"%",dir:"Higher is better",desc:"Availability of critical internal systems",scope:"System",parent:null,targetSrc:"IT SLA",actualSrc:"Monitoring",targetCalc:"99.5%+",baseCalc:"Previous quarter",actualCalc:"Uptime minutes / Total minutes * 100"},
  {id:"C-009",name:"Process Maturity Score",bu:"CORE",dept:"OpEx",bsc:"Internal Process",cat:"Quality",unit:"level",dir:"Higher is better",desc:"CMMI maturity assessment score across process areas",scope:"Process Area",parent:null,targetSrc:"CMMI roadmap",actualSrc:"Internal assessment",targetCalc:"Level 2 by end of 2026",baseCalc:"Current assessment baseline",actualCalc:"Weighted score across assessed process areas"},
];

const SEED_PROFILES = (() => {
  // Factory: kpiType always "Quantitative", projectLink always null
  const K = (metric_id,weight,scope,targetMethod,baseRules,maxIndicator,benchmark,estimatedTarget,strategicLink) =>
    ({metric_id,weight,scope,kpiType:"Quantitative",targetMethod,baseRules,maxIndicator,benchmark,estimatedTarget,strategicLink,projectLink:null});
  // Profile factory with common defaults
  const P = (id,bu,dept,role,scope,freq,iLim,kpis,opts={}) =>
    ({id,bu,dept,team:"",role,period:"Q1 2026",scope,frequency:freq,updatedAt:"2026-01-20",indicatorLimit:iLim,kpiScoreLimit:1.2,kpis,...opts});
  return [
    // P-001: Head of Sales (custom dates)
    {...P("P-001","DEV","Sales","Head of Sales","All products, All regions","Quarterly",1.5,[
      K("D-001",30,"All","FP&A quarterly target","Previous quarter actual",1.5,null,"450000","O1: Revenue Growth"),
      K("D-002",25,"All","Expiring base * 85% renewal rate","Previous quarter actual",1.3,"Industry 80%","320000","O1: Revenue Growth"),
      K("D-003",15,"All","Max 12% quarterly","Industry benchmark 15%",1.5,"15-20% for dev tools","12","O1: Revenue Growth"),
      K("D-011",20,"All","110%+","Previous quarter NRR",1.3,"100% = no net loss","112","O1: Revenue Growth"),
      K("D-009",10,"All","4.2+ score","Previous quarter average",1.2,"4.0 industry average","4.3","O3: Customer Success"),
    ]),updatedAt:"2026-01-15"},
    // P-002: Acquisition Team Lead
    {...P("P-002","DEV","Marketing","Acquisition Team Lead","","Quarterly",1.2,[
      K("D-103",25,"Database tools","Quarterly improvement target","Previous quarter index",1.2,null,null,null),
      K("D-103",15,"Connectivity","Quarterly improvement target","Previous quarter index",1.2,null,null,null),
      K("D-103",10,"TMetric","Quarterly improvement target","Previous quarter index",1.2,null,null,null),
      K("D-122",25,"org/dir/ref/ppc/dbForge","Campaign targets aggregated","Previous period actual",1.2,null,null,null),
      K("D-123",25,"TMetric","Monthly growth target","Previous period actual",1.2,null,null,null),
    ]),team:"Acquisition",updatedAt:"2026-02-21"},
    // P-003: Operations Manager (custom dates)
    {...P("P-003","OTX","Operations","Operations Manager","Kyiv","Monthly",1.5,[
      K("O-001",25,"Kyiv","Monthly ops plan","Previous month",1.5,null,"45000","O1: Growth"),
      K("O-002",20,"Kyiv","65%+","Previous month",1.3,null,"65","O2: Efficiency"),
      K("O-005",30,"Kyiv","Avg 6m + 2%, max 95%","Target - 5%",1.5,null,"88","O3: Quality"),
      K("O-003",15,"Kyiv","4.5+","Previous quarter",1.2,null,"4.5","O3: Quality"),
      K("O-004",10,"Kyiv","90%+","Previous month",1.2,null,"91","O2: Efficiency"),
    ]),team:"Kyiv City",updatedAt:"2026-01-15"},
    P("P-004","DEV","Engineering","Engineering Team Lead","dbForge product line","Quarterly",1.5,[
      K("D-012",35,"dbForge team","Rolling 4-sprint avg + 5%","Rolling 4-sprint average",1.3,null,"42","O2: Engineering Excellence"),
      K("D-008",35,"dbForge releases","Max 2 per release","Previous 3-release average",1.5,null,"2","O2: Engineering Excellence"),
      K("D-007",30,"dbForge roadmap","90% of planned scope","Previous quarter rate",1.3,null,"92","O2: Engineering Excellence"),
    ]),
    P("P-005","DEV","Product","Product Manager","Connectivity product line","Quarterly",1.3,[
      K("D-007",40,"Connectivity","90% of planned scope","Previous quarter rate",1.3,null,"90","O2: Product Delivery"),
      K("D-009",30,"Connectivity","4.2+ score","Previous quarter average",1.2,"4.0 industry average","4.3","O3: Customer Success"),
      K("D-008",30,"Connectivity releases","Max 2 per release","Previous 3-release average",1.3,null,"2","O2: Product Quality"),
    ]),
    P("P-006","DEV","Support","Support Team Lead","All products","Monthly",1.3,[
      K("D-009",40,"All products","4.2+ score","Previous quarter average",1.2,"4.0 industry average","4.3","O3: Customer Success"),
      K("D-010",35,"All products","P1: 1h, P2: 4h","Previous month average",1.3,null,"3.5","O3: Customer Success"),
      K("D-003",25,"All products","Max 12% quarterly","Industry benchmark 15%",1.3,"15-20% for dev tools","12","O1: Revenue Retention"),
    ]),
    P("P-007","SKY","Sales","Sales Manager","All plans","Monthly",1.5,[
      K("S-001",45,"All plans","Annual target / 12","Previous month actual",1.5,null,"25000","O1: Revenue Growth"),
      K("S-006",30,"All plans","Pricing strategy target","Previous quarter ARPU",1.3,null,"35","O1: Revenue Growth"),
      K("S-002",25,"All plans","Funnel optimization target","Previous quarter average",1.3,null,"8","O1: Revenue Growth"),
    ]),
    P("P-008","SKY","Engineering","Platform Engineer Lead","Skyvia platform","Monthly",1.3,[
      K("S-003",45,"Skyvia platform","99.9% SLA","99.5% minimum",1.2,"99.9% SaaS standard","99.9","O2: Platform Reliability"),
      K("S-004",35,"All connectors","<0.5%","Previous quarter average",1.3,null,"0.4","O2: Platform Quality"),
      K("S-005",20,"Skyvia platform","5% MoM","Previous 3-month average",1.3,null,"5","O1: Growth"),
    ]),
    P("P-009","SKY","Product","Product Manager","Skyvia platform","Quarterly",1.3,[
      K("S-005",40,"Skyvia platform","5% MoM growth","Previous 3-month average",1.3,null,"5","O1: User Growth"),
      K("S-002",35,"All plans","Funnel optimization","Previous quarter average",1.3,null,"8","O1: Conversion"),
      K("S-003",25,"Skyvia platform","99.9%","99.5% minimum",1.2,null,"99.9","O2: Reliability"),
    ]),
    P("P-010","SKY","Marketing","Growth Marketing Manager","Skyvia","Monthly",1.3,[
      K("S-002",40,"All plans","A/B test improvements","Previous quarter average",1.3,null,"8","O1: Conversion"),
      K("S-005",35,"Skyvia platform","5% MoM","Previous 3-month average",1.3,null,"5","O1: Growth"),
      K("S-001",25,"Marketing-sourced","Marketing-sourced MRR target","Previous month",1.3,null,"8000","O1: Revenue"),
    ]),
    P("P-011","OTX","Platform","Platform Engineer","All cities","Monthly",1.3,[
      K("O-004",50,"All cities","90%+ within 2 min","Previous month accuracy",1.3,null,"91","O2: Platform Quality"),
      K("O-002",30,"All cities","65%+ matching efficiency","Previous month",1.3,null,"66","O2: Efficiency"),
      K("O-003",20,"All cities","4.5+","Previous quarter",1.2,null,"4.5","O3: Quality"),
    ]),
    P("P-012","MOB","Operations","Client Success Manager","All clients","Monthly",1.3,[
      K("M-003",40,"New clients","30 days max","Previous quarter average",1.3,null,"28","O2: Operational Excellence"),
      K("M-001",35,"Assigned clients","Client deployment schedule","Previous period count",1.3,null,"150","O1: Growth"),
      K("M-002",25,"All","99.5%+","Previous quarter average",1.2,null,"99.5","O2: Reliability"),
    ]),
    P("P-013","MOB","Engineering","Engineering Lead","Mobion platform","Quarterly",1.3,[
      K("M-002",50,"Mobion platform","99.5%+","Previous quarter average",1.3,null,"99.6","O2: Platform Reliability"),
      K("M-001",30,"All clients","Zero regression on active","Previous period count",1.2,null,"200","O1: Growth"),
      K("M-004",20,"Platform data layer","98%+","Previous audit",1.2,null,"98","O2: Data Quality"),
    ]),
    P("P-014","MOB","Product","Product Manager","Mobion platform","Quarterly",1.3,[
      K("M-001",45,"All clients","Client deployment schedule","Previous period count",1.3,null,"220","O1: Growth"),
      K("M-002",30,"Mobion platform","99.5%+","Previous quarter average",1.2,null,"99.5","O2: Reliability"),
      K("M-003",25,"New clients","30 days","Previous quarter average",1.2,null,"30","O2: Efficiency"),
    ]),
    P("P-015","MOB","QA","QA Lead","Mobion platform","Quarterly",1.3,[
      K("M-004",40,"All regions","98%+","Previous audit results",1.3,null,"98.5","O2: Data Quality"),
      K("M-002",35,"Mobion platform","99.5%+","Previous quarter average",1.3,null,"99.5","O2: Platform Reliability"),
      K("M-001",25,"All clients","Zero critical bugs on active","Previous period",1.2,null,"200","O2: Quality"),
    ]),
    P("P-016","MOB","Geo Data","Geo Data Analyst Lead","All regions","Quarterly",1.3,[
      K("M-004",60,"All regions","98%+","Previous audit results",1.3,null,"98.5","O2: Data Accuracy"),
      K("M-001",40,"Geo-dependent clients","Coverage for new deployments","Previous period",1.2,null,"180","O1: Coverage"),
    ]),
    P("P-017","CORE","HR","HR Manager","All BUs","Quarterly",1.3,[
      K("C-001",30,"All BUs","30 days tech, 21 non-tech","Previous quarter average",1.3,null,"28","O2: Talent Acquisition"),
      K("C-002",30,"All BUs","<12% annually","Industry average 15-18%",1.3,"15-18% IT Ukraine","11","O2: Retention"),
      K("C-004",25,"All BUs","30+ score","Previous survey result",1.2,"30+ good, 50+ excellent","35","O2: Engagement"),
      K("C-003",15,"All BUs","20 hours/quarter","Previous quarter actual",1.2,null,"20","O2: Development"),
    ]),
    P("P-018","CORE","Finance","Finance Manager","All BUs","Monthly",1.3,[
      K("C-005",30,"All BUs","<5% variance","0% perfect accuracy",1.3,null,"4","O2: Financial Discipline"),
      K("C-006",35,"Group","5 business days","Previous quarter average",1.3,null,"5","O2: Process Efficiency"),
      K("C-007",35,"All BUs","Within 5% of actual","Previous quarter accuracy",1.3,null,"96","O2: Forecast Quality"),
    ]),
    P("P-019","CORE","IT","IT Operations Manager","All systems","Monthly",1.3,[
      K("C-008",60,"Critical systems","99.5%+ SLA","Previous quarter",1.2,"99.5% IT standard","99.6","O2: Infrastructure Reliability"),
      K("C-009",40,"IT processes","Level 2 by end 2026","Current assessment baseline",1.2,null,"2","O2: Process Maturity"),
    ]),
    P("P-020","CORE","OpEx","Process Excellence Manager","All process areas","Quarterly",1.3,[
      K("C-009",50,"All process areas","Level 2 by end 2026","Current assessment",1.3,null,"2","O2: CMMI Certification"),
      K("C-001",25,"Process-impacted depts","Improvement from process changes","Pre-implementation baseline",1.2,null,"25","O2: Process Impact"),
      K("C-004",25,"All BUs","30+ after process rollouts","Previous survey",1.2,null,"32","O2: Change Adoption"),
    ]),
  ];
})();

const SEED_TRACKERS = (() => {
  const E = (ki,mid,b,t,a) => ({kpi_index:ki,metric_id:mid,baseline:b,target:t,actual:a});
  const M = (ki,mid,rows) => ({kpi_index:ki,metric_id:mid,memberData:rows.map(([b,t,a])=>({baseline:b,target:t,actual:a}))});
  return [
    // DEV Sales: 2 periods (P-001)
    {id:"T-001",profile_id:"P-001",type:"personal",period:"Q4 2025",name:"Oleksandr Koval",actualScope:"All products, All regions",members:null,
      entries:[E(0,"D-001",350000,420000,415000),E(1,"D-002",270000,300000,298000),E(2,"D-003",16,13,14.1),E(3,"D-011",102,110,107),E(4,"D-009",3.9,4.2,4.1)],
      createdAt:"2025-10-05",updatedAt:"2026-01-10"},
    {id:"T-002",profile_id:"P-001",type:"personal",period:"Q1 2026",name:"Oleksandr Koval",actualScope:"All products, All regions",members:null,
      entries:[E(0,"D-001",380000,450000,465000),E(1,"D-002",290000,320000,305000),E(2,"D-003",15,12,11.2),E(3,"D-011",105,112,109),E(4,"D-009",4.0,4.3,4.4)],
      createdAt:"2026-01-05",updatedAt:"2026-02-01"},
    // OTX Operations: 2 periods, team (P-003)
    {id:"T-003",profile_id:"P-003",type:"team",period:"December 2025",name:null,actualScope:"Kyiv",
      members:["Dmytro Shevchenko","Iryna Melnyk","Artem Bondar"],
      entries:[
        M(0,"O-001",[[38000,43000,44100],[36000,42000,40800],[39000,44000,43500]]),
        M(1,"O-002",[[56,63,64],[53,63,59],[58,63,62]]),
        M(2,"O-005",[[81,86,87],[80,86,83],[82,86,86]]),
        M(3,"O-003",[[4.1,4.4,4.5],[4.0,4.4,4.2],[4.2,4.4,4.4]]),
        M(4,"O-004",[[83,89,90],[82,89,86],[84,89,88]]),
      ],createdAt:"2025-12-05",updatedAt:"2026-01-08"},
    {id:"T-004",profile_id:"P-003",type:"team",period:"January 2026",name:null,actualScope:"Kyiv",
      members:["Dmytro Shevchenko","Iryna Melnyk","Artem Bondar"],
      entries:[
        M(0,"O-001",[[40000,45000,47200],[38000,44000,42500],[41000,46000,null]]),
        M(1,"O-002",[[58,65,67],[55,65,61],[60,65,null]]),
        M(2,"O-005",[[83,88,90],[82,88,85],[84,88,89]]),
        M(3,"O-003",[[4.2,4.5,4.6],[4.1,4.5,4.3],[4.3,4.5,null]]),
        M(4,"O-004",[[85,91,92],[84,91,88],[86,91,90]]),
      ],createdAt:"2026-01-05",updatedAt:"2026-02-01"},
    // DEV Engineering (P-004) - solid performer
    {id:"T-005",profile_id:"P-004",type:"personal",period:"Q1 2026",name:"Andrii Lysenko",actualScope:"dbForge product line",members:null,
      entries:[E(0,"D-012",38,42,44),E(1,"D-008",3.2,2,1.8),E(2,"D-007",85,92,90)],
      createdAt:"2026-01-10",updatedAt:"2026-02-15"},
    // DEV Product (P-005) - average
    {id:"T-006",profile_id:"P-005",type:"personal",period:"Q1 2026",name:"Yulia Bondarenko",actualScope:"Connectivity product line",members:null,
      entries:[E(0,"D-007",82,90,87),E(1,"D-009",3.8,4.3,4.1),E(2,"D-008",3.5,2,2.6)],
      createdAt:"2026-01-10",updatedAt:"2026-02-15"},
    // DEV Support (P-006) - needs attention
    {id:"T-007",profile_id:"P-006",type:"personal",period:"Q1 2026",name:"Maryna Kravchuk",actualScope:"All products",members:null,
      entries:[E(0,"D-009",3.8,4.3,4.0),E(1,"D-010",5.2,3.5,4.1),E(2,"D-003",16,12,15.5)],
      createdAt:"2026-01-10",updatedAt:"2026-02-15"},
    // DEV Marketing (P-002) - strong
    {id:"T-008",profile_id:"P-002",type:"personal",period:"Q1 2026",name:"Olena Marchenko",actualScope:"Acquisition",members:null,
      entries:[E(0,"D-103",62,70,72),E(1,"D-103",45,52,50),E(2,"D-103",30,36,35),E(3,"D-122",4200,5000,5350),E(4,"D-123",1800,2200,2150)],
      createdAt:"2026-01-10",updatedAt:"2026-02-15"},
    // SKY Sales (P-007) - good
    {id:"T-009",profile_id:"P-007",type:"personal",period:"Q1 2026",name:"Maksym Tkachenko",actualScope:"All plans",members:null,
      entries:[E(0,"S-001",20000,25000,26800),E(1,"S-006",30,35,33),E(2,"S-002",6,8,7.5)],
      createdAt:"2026-01-10",updatedAt:"2026-02-15"},
    // SKY Engineering (P-008) - excellent
    {id:"T-010",profile_id:"P-008",type:"personal",period:"Q1 2026",name:"Roman Savchenko",actualScope:"Skyvia platform",members:null,
      entries:[E(0,"S-003",99.5,99.9,99.92),E(1,"S-004",0.7,0.4,0.35),E(2,"S-005",3,5,4.8)],
      createdAt:"2026-01-10",updatedAt:"2026-02-15"},
    // MOB Operations (P-012) - average
    {id:"T-011",profile_id:"P-012",type:"personal",period:"Q1 2026",name:"Kateryna Polishchuk",actualScope:"All clients",members:null,
      entries:[E(0,"M-003",35,28,30),E(1,"M-001",120,150,142),E(2,"M-002",99.0,99.5,99.4)],
      createdAt:"2026-01-10",updatedAt:"2026-02-15"},
    // MOB Engineering (P-013) - solid
    {id:"T-012",profile_id:"P-013",type:"personal",period:"Q1 2026",name:"Viktor Rudenko",actualScope:"Mobion platform",members:null,
      entries:[E(0,"M-002",99.1,99.6,99.7),E(1,"M-001",170,200,195),E(2,"M-004",96,98,97.5)],
      createdAt:"2026-01-10",updatedAt:"2026-02-15"},
    // CORE HR (P-017) - mixed
    {id:"T-013",profile_id:"P-017",type:"personal",period:"Q1 2026",name:"Svitlana Omelchenko",actualScope:"All BUs",members:null,
      entries:[E(0,"C-001",35,28,31),E(1,"C-002",14,11,12.5),E(2,"C-004",25,35,30),E(3,"C-003",15,20,18)],
      createdAt:"2026-01-10",updatedAt:"2026-02-15"},
    // CORE Finance (P-018) - strong
    {id:"T-014",profile_id:"P-018",type:"personal",period:"Q1 2026",name:"Dmytro Kovalenko",actualScope:"All BUs",members:null,
      entries:[E(0,"C-005",7,4,3.8),E(1,"C-006",7,5,4.5),E(2,"C-007",90,96,95)],
      createdAt:"2026-01-10",updatedAt:"2026-02-15"},
  ];
})();

// ═══════════════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════════════

async function loadS(key, fb) {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fb; }
  catch { return fb; }
}
async function saveS(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch(e) { console.error(e); }
}

// ═══════════════════════════════════════════════════════
// INDICATOR CALCULATION
// ═══════════════════════════════════════════════════════

function calcIndicator(actual, baseline, target, direction, maxInd) {
  if (actual === null || actual === undefined || actual === "") return null;
  if (baseline === null || baseline === undefined || target === null || target === undefined) return null;
  const a = parseFloat(actual), b = parseFloat(baseline), t = parseFloat(target);
  if (isNaN(a) || isNaN(b) || isNaN(t)) return null;
  if (t === b) return a === t ? 1.0 : 0;
  let ind;
  if (direction === "Lower is better") {
    ind = (b - a) / (b - t);
  } else if (direction === "Target is exact") {
    const deviation = Math.abs(a - t);
    const range = Math.abs(t - b);
    ind = range === 0 ? (a === t ? 1.0 : 0) : Math.max(0, 1 - deviation / range);
  } else {
    ind = (a - b) / (t - b);
  }
  if (ind < 0) ind = 0;
  const cap = parseFloat(maxInd) || 1.5;
  return Math.min(ind, cap);
}

function indColor(val) {
  if (val === null || val === undefined) return C.grey;
  if (val >= 1.0) return C.grn;
  if (val >= 0.7) return C.ylw;
  return C.red;
}

function fmtPct(val) {
  if (val === null || val === undefined) return "-";
  return (val * 100).toFixed(1) + "%";
}

function fmtNum(val) {
  if (val === null || val === undefined || val === "") return "-";
  const n = parseFloat(val);
  if (isNaN(n)) return val;
  if (Math.abs(n) >= 1000) return n.toLocaleString("en-US", {maximumFractionDigits:1});
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}

// ═══════════════════════════════════════════════════════
// SHARED UI
// ═══════════════════════════════════════════════════════

const S = {
  overlay: {position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000},
  modal: {background:C.wh,borderRadius:8,width:"92%",maxWidth:720,maxHeight:"92vh",display:"flex",flexDirection:"column",boxShadow:"0 8px 32px rgba(0,0,0,0.2)"},
  mHead: {padding:"14px 20px",borderBottom:`1px solid ${C.brd}`,display:"flex",justifyContent:"space-between",alignItems:"center"},
  mBody: {padding:20,overflowY:"auto",flex:1},
  mFoot: {padding:"12px 20px",borderTop:`1px solid ${C.brd}`,display:"flex",justifyContent:"space-between",gap:8},
  btn:(bg,fg=C.wh)=>({background:bg,color:fg,border:"none",borderRadius:4,padding:"8px 16px",cursor:"pointer",fontSize:13,fontWeight:600}),
  btnO:{background:"transparent",color:C.dk,border:`1px solid ${C.brd}`,borderRadius:4,padding:"8px 16px",cursor:"pointer",fontSize:13},
  inp:{width:"100%",padding:"8px 10px",border:`1px solid ${C.brd}`,borderRadius:4,fontSize:13,boxSizing:"border-box"},
  sel:{width:"100%",padding:"8px 10px",border:`1px solid ${C.brd}`,borderRadius:4,fontSize:13,boxSizing:"border-box",background:C.wh},
  lbl:{fontSize:12,fontWeight:600,color:C.dk,marginBottom:4,display:"block"},
  fg:{marginBottom:14},
  badge:(bg,fg)=>({display:"inline-block",padding:"2px 8px",borderRadius:10,fontSize:11,fontWeight:600,background:bg,color:fg,marginRight:4}),
};

const Badge = ({children,bg=C.lt,fg=C.dk}) => <span style={S.badge(bg,fg)}>{children}</span>;
const InfoRow = ({label,value}) => (!value&&value!==0)?null:(
  <div style={{display:"flex",gap:8,marginBottom:6,fontSize:13}}>
    <span style={{color:C.grey,minWidth:150,flexShrink:0}}>{label}</span>
    <span style={{color:C.bk,wordBreak:"break-word"}}>{value}</span>
  </div>
);

// ── Cascading Org Filter: BU → Dept → Team ──

function OrgFilter({items,getProfile,bu,setBu,dept,setDept,team,setTeam,profiles:allProfiles}) {
  // Extract org hierarchy from items via profile lookup
  const orgData=useMemo(()=>{
    const buMap={};
    items.forEach(item=>{
      const p=getProfile?getProfile(item):item;
      if(!p) return;
      if(!buMap[p.bu])buMap[p.bu]={count:0,depts:{}};
      buMap[p.bu].count++;
      const d=p.dept||"";
      if(!buMap[p.bu].depts[d])buMap[p.bu].depts[d]={count:0,teams:{}};
      buMap[p.bu].depts[d].count++;
      const t=p.team||"";
      if(t){
        if(!buMap[p.bu].depts[d].teams[t])buMap[p.bu].depts[d].teams[t]=0;
        buMap[p.bu].depts[d].teams[t]++;
      }
    });
    return buMap;
  },[items,getProfile]);

  const buOpts=Object.entries(BU_CFG).filter(([k])=>orgData[k]).map(([k,v])=>({key:k,name:v.name,count:orgData[k].count}));
  const deptOpts=bu!=="__all__"&&orgData[bu]?Object.entries(orgData[bu].depts).map(([d,v])=>({key:d,name:d,count:v.count})):[];
  const teamOpts=bu!=="__all__"&&dept!=="__all__"&&orgData[bu]?.depts[dept]?Object.entries(orgData[bu].depts[dept].teams).map(([t,c])=>({key:t,name:t,count:c})):[];

  return <div style={{padding:"6px 10px",borderBottom:`1px solid ${C.brd}`,display:"flex",gap:4,flexWrap:"wrap"}}>
    <select style={{...S.sel,padding:"3px 6px",fontSize:11,flex:"1 1 80px",minWidth:0}} value={bu} onChange={e=>{setBu(e.target.value);setDept("__all__");setTeam("__all__");}}>
      <option value="__all__">All BUs</option>
      {buOpts.map(b=><option key={b.key} value={b.key}>{b.name} ({b.count})</option>)}
    </select>
    {bu!=="__all__"&&deptOpts.length>0&&<select style={{...S.sel,padding:"3px 6px",fontSize:11,flex:"1 1 80px",minWidth:0}} value={dept} onChange={e=>{setDept(e.target.value);setTeam("__all__");}}>
      <option value="__all__">All Depts</option>
      {deptOpts.map(d=><option key={d.key} value={d.key}>{d.name} ({d.count})</option>)}
    </select>}
    {dept!=="__all__"&&teamOpts.length>0&&<select style={{...S.sel,padding:"3px 6px",fontSize:11,flex:"1 1 80px",minWidth:0}} value={team} onChange={e=>setTeam(e.target.value)}>
      <option value="__all__">All Teams</option>
      {teamOpts.map(t=><option key={t.key} value={t.key}>{t.name} ({t.count})</option>)}
    </select>}
  </div>;
}

// Shared filter logic
function applyOrgFilter(items,getProfile,bu,dept,team){
  return items.filter(item=>{
    const p=getProfile?getProfile(item):item;
    if(!p) return true;
    if(bu!=="__all__"&&p.bu!==bu) return false;
    if(dept!=="__all__"&&p.dept!==dept) return false;
    if(team!=="__all__"&&(p.team||"")!==team) return false;
    return true;
  });
}

function Steps({steps,current}) {
  return <div style={{display:"flex",gap:4,marginBottom:16}}>
    {steps.map((s,i)=><div key={i} style={{flex:1,textAlign:"center"}}>
      <div style={{height:4,borderRadius:2,background:i<=current?C.md:C.brd,marginBottom:4}}/>
      <span style={{fontSize:11,color:i<=current?C.dk:C.grey}}>{s}</span>
    </div>)}
  </div>;
}

function Empty({icon,title,sub,action,onAction}) {
  return <div style={{textAlign:"center",padding:40,color:C.grey}}>
    <div style={{fontSize:32,marginBottom:8,opacity:0.5}}>{icon}</div>
    <div style={{fontSize:15,fontWeight:600,color:C.dk,marginBottom:4}}>{title}</div>
    <div style={{fontSize:13,marginBottom:16}}>{sub}</div>
    {action&&<button style={S.btn(C.md)} onClick={onAction}>{action}</button>}
  </div>;
}

function Confirm({title,msg,onOk,onNo,okLabel="Delete",okColor=C.red}) {
  return <div style={S.overlay} onClick={onNo}>
    <div style={{...S.modal,maxWidth:400}} onClick={e=>e.stopPropagation()}>
      <div style={S.mHead}><strong>{title}</strong></div>
      <div style={S.mBody}><p style={{fontSize:13,margin:0}}>{msg}</p></div>
      <div style={S.mFoot}>
        <button style={S.btnO} onClick={onNo}>Cancel</button>
        <button style={S.btn(okColor)} onClick={onOk}>{okLabel}</button>
      </div>
    </div>
  </div>;
}

function CalcBlock({title,source,method}) {
  return <div style={{marginBottom:12,padding:12,background:C.pl,borderRadius:6,border:`1px solid ${C.lt}`}}>
    <div style={{fontSize:12,fontWeight:600,color:C.dk,marginBottom:6}}>{title}</div>
    {source&&<div style={{fontSize:12,color:C.grey,marginBottom:4}}>Source: {source}</div>}
    <div style={{fontSize:13,fontFamily:"monospace",color:C.bk,whiteSpace:"pre-wrap"}}>{method}</div>
  </div>;
}

// ═══════════════════════════════════════════════════════
// MODULE 1: METRIC MAP
// ═══════════════════════════════════════════════════════

function MetricMapModule({metrics,setMetrics,onSelect,selectedId}) {
  const [search,setSearch]=useState(""); const [fBU,setFBU]=useState("ALL"); const [fBsc,setFBsc]=useState("ALL");
  const [wizard,setWizard]=useState(false); const [editM,setEditM]=useState(null); const [delId,setDelId]=useState(null);

  const filtered = useMemo(()=>{
    let r=metrics;
    if(fBU!=="ALL") r=r.filter(m=>m.bu===fBU);
    if(fBsc!=="ALL") r=r.filter(m=>m.bsc===fBsc);
    if(search){ const s=search.toLowerCase(); r=r.filter(m=>m.name.toLowerCase().includes(s)||m.id.toLowerCase().includes(s)||(m.desc||"").toLowerCase().includes(s)); }
    return r;
  },[metrics,fBU,fBsc,search]);

  const tree = useMemo(()=>{
    const t={}; filtered.forEach(m=>{ if(!t[m.bu])t[m.bu]={}; if(!t[m.bu][m.dept])t[m.bu][m.dept]=[]; t[m.bu][m.dept].push(m); }); return t;
  },[filtered]);

  const handleSave=(m)=>{ if(editM){setMetrics(p=>p.map(x=>x.id===m.id?m:x));}else{setMetrics(p=>[...p,m]);} setWizard(false);setEditM(null); };
  const handleDel=(id)=>{ setMetrics(p=>p.filter(x=>x.id!==id)); if(selectedId===id)onSelect(null); setDelId(null); };
  const sel = metrics.find(m=>m.id===selectedId);

  return <div style={{display:"flex",height:"100%",overflow:"hidden"}}>
    <div style={{width:310,borderRight:`1px solid ${C.brd}`,display:"flex",flexDirection:"column",flexShrink:0}}>
      <div style={{padding:12,borderBottom:`1px solid ${C.brd}`}}>
        <input placeholder="Search metrics..." value={search} onChange={e=>setSearch(e.target.value)} style={{...S.inp,marginBottom:8}}/>
        <div style={{display:"flex",gap:6}}>
          <select value={fBU} onChange={e=>setFBU(e.target.value)} style={{...S.sel,flex:1}}>
            <option value="ALL">All BUs</option>
            {Object.entries(BU_CFG).map(([k,v])=><option key={k} value={k}>{v.name}</option>)}
          </select>
          <select value={fBsc} onChange={e=>setFBsc(e.target.value)} style={{...S.sel,flex:1}}>
            <option value="ALL">All Perspectives</option>
            {BSC.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:8}}>
        <div style={{marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:12,color:C.grey}}>{filtered.length} metrics</span>
          <button style={{...S.btn(C.md),padding:"4px 10px",fontSize:12}} onClick={()=>{setEditM(null);setWizard(true);}}>+ New</button>
        </div>
        {Object.entries(tree).map(([bk,depts])=><TreeBU key={bk} bk={bk} depts={depts} sid={selectedId} onSel={onSelect}/>)}
        {filtered.length===0&&<div style={{textAlign:"center",padding:20,color:C.grey,fontSize:13}}>No metrics found</div>}
      </div>
    </div>
    <div style={{flex:1,overflowY:"auto"}}>
      {sel?<MDetail m={sel} metrics={metrics} onEdit={()=>{setEditM(sel);setWizard(true);}} onDel={()=>setDelId(sel.id)}/>
        :<Empty icon="[M]" title="Select a metric" sub="Choose from the tree to view details"/>}
    </div>
    {wizard&&<MWizard init={editM} metrics={metrics} onSave={handleSave} onClose={()=>{setWizard(false);setEditM(null);}}/>}
    {delId&&<Confirm title="Delete Metric" msg={`Delete "${metrics.find(m=>m.id===delId)?.name}"?`} onOk={()=>handleDel(delId)} onNo={()=>setDelId(null)}/>}
  </div>;
}

function TreeBU({bk,depts,sid,onSel}) {
  const [o,setO]=useState(false);
  const cnt=Object.values(depts).flat().length;
  return <div style={{marginBottom:4}}>
    <div onClick={()=>setO(!o)} style={{cursor:"pointer",padding:"4px 6px",fontSize:13,fontWeight:600,color:C.dk,display:"flex",alignItems:"center",gap:4}}>
      <span style={{fontSize:10,transform:o?"rotate(90deg)":"none",transition:"0.15s"}}>&#9654;</span>
      {BU_CFG[bk]?.name||bk}<span style={{fontSize:11,color:C.grey,fontWeight:400,marginLeft:"auto"}}>{cnt}</span>
    </div>
    {o&&Object.entries(depts).map(([d,ms])=><TreeDept key={d} d={d} ms={ms} sid={sid} onSel={onSel}/>)}
  </div>;
}

function TreeDept({d,ms,sid,onSel}) {
  const [o,setO]=useState(false);
  return <div style={{marginLeft:16}}>
    <div onClick={()=>setO(!o)} style={{cursor:"pointer",padding:"3px 6px",fontSize:12,color:C.grey,display:"flex",alignItems:"center",gap:4}}>
      <span style={{fontSize:9,transform:o?"rotate(90deg)":"none",transition:"0.15s"}}>&#9654;</span>
      {d}<span style={{fontSize:11,marginLeft:"auto"}}>{ms.length}</span>
    </div>
    {o&&ms.map(m=><div key={m.id} onClick={()=>onSel(m.id)} style={{marginLeft:16,padding:"4px 8px",fontSize:12,cursor:"pointer",borderRadius:4,background:sid===m.id?C.lt:"transparent",color:sid===m.id?C.dk:C.bk}}>
      <span style={{color:C.grey,marginRight:4}}>{m.id}</span>{m.name}
    </div>)}
  </div>;
}

function MDetail({m,metrics,onEdit,onDel}) {
  const [tab,setTab]=useState("desc");
  const parent=m.parent?metrics.find(x=>x.id===m.parent):null;
  const children=metrics.filter(x=>x.parent===m.id);
  return <div style={{padding:20}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
      <div>
        <div style={{fontSize:12,color:C.grey,marginBottom:2}}>{m.id}</div>
        <h3 style={{margin:0,fontSize:18,color:C.dk}}>{m.name}</h3>
      </div>
      <div style={{display:"flex",gap:6}}>
        <button style={S.btnO} onClick={onEdit}>Edit</button>
        <button style={{...S.btnO,color:C.red,borderColor:C.red}} onClick={onDel}>Delete</button>
      </div>
    </div>
    <div style={{display:"flex",gap:4,marginBottom:12,flexWrap:"wrap"}}>
      <Badge bg={C.lt} fg={C.dk}>{BU_CFG[m.bu]?.name}</Badge>
      <Badge bg="#E8DAEF" fg={C.purp}>{m.bsc}</Badge>
      <Badge bg="#FEF9E7" fg="#B7950B">{m.cat}</Badge>
      <Badge bg={m.dir==="Lower is better"?"#FDEDEC":"#EAFAF1"} fg={m.dir==="Lower is better"?C.red:C.grn}>{m.dir}</Badge>
    </div>
    <div style={{display:"flex",gap:0,marginBottom:16,borderBottom:`1px solid ${C.brd}`}}>
      {[["desc","Descriptive"],["calc","Calculation"]].map(([k,l])=>
        <button key={k} onClick={()=>setTab(k)} style={{padding:"8px 16px",border:"none",background:"transparent",
          borderBottom:tab===k?`2px solid ${C.md}`:"2px solid transparent",
          color:tab===k?C.md:C.grey,fontSize:13,fontWeight:tab===k?600:400,cursor:"pointer"}}>{l}</button>
      )}
    </div>
    {tab==="desc"&&<div>
      <InfoRow label="Description" value={m.desc}/>
      <InfoRow label="Unit" value={m.unit}/>
      <InfoRow label="Department" value={m.dept}/>
      <InfoRow label="Scope Dimensions" value={m.scope}/>
      {parent&&<InfoRow label="Parent Metric" value={`${parent.id} - ${parent.name}`}/>}
      {children.length>0&&<InfoRow label="Child Metrics" value={children.map(c=>`${c.id} ${c.name}`).join(", ")}/>}
    </div>}
    {tab==="calc"&&<div>
      <CalcBlock title="Target Calculation" source={m.targetSrc} method={m.targetCalc}/>
      <CalcBlock title="Baseline Calculation" source="Defined per metric" method={m.baseCalc}/>
      <CalcBlock title="Actual Calculation" source={m.actualSrc} method={m.actualCalc}/>
    </div>}
  </div>;
}

function MWizard({init,metrics,onSave,onClose}) {
  const [step,setStep]=useState(0);
  const steps=["Name & Class","Scope & Source","Calculation","Review"];
  const [f,setF]=useState(init||{id:`D-${String(metrics.length+1).padStart(3,"0")}`,name:"",bu:"DEV",dept:"Engineering",bsc:"Financial",cat:"Revenue",unit:"",dir:"Higher is better",desc:"",scope:"",parent:null,targetSrc:"",actualSrc:"",targetCalc:"",baseCalc:"",actualCalc:""});
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const depts=BU_CFG[f.bu]?.depts||[];
  return <div style={S.overlay} onClick={onClose}>
    <div style={S.modal} onClick={e=>e.stopPropagation()}>
      <div style={S.mHead}><strong>{init?"Edit":"New"} Metric</strong><button onClick={onClose} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:C.grey}}>x</button></div>
      <div style={S.mBody}>
        <Steps steps={steps} current={step}/>
        {step===0&&<div>
          <div style={S.fg}><label style={S.lbl}>Metric ID</label><input style={S.inp} value={f.id} onChange={e=>set("id",e.target.value)}/></div>
          <div style={S.fg}><label style={S.lbl}>Metric Name *</label><input style={S.inp} value={f.name} onChange={e=>set("name",e.target.value)} placeholder="e.g. New Revenue"/></div>
          <div style={{display:"flex",gap:10}}>
            <div style={{...S.fg,flex:1}}><label style={S.lbl}>BU</label><select style={S.sel} value={f.bu} onChange={e=>{set("bu",e.target.value);set("dept",BU_CFG[e.target.value]?.depts[0]||"");}}>{Object.entries(BU_CFG).map(([k,v])=><option key={k} value={k}>{v.name}</option>)}</select></div>
            <div style={{...S.fg,flex:1}}><label style={S.lbl}>Department</label><select style={S.sel} value={f.dept} onChange={e=>set("dept",e.target.value)}>{depts.map(d=><option key={d} value={d}>{d}</option>)}</select></div>
          </div>
          <div style={{display:"flex",gap:10}}>
            <div style={{...S.fg,flex:1}}><label style={S.lbl}>BSC Perspective</label><select style={S.sel} value={f.bsc} onChange={e=>set("bsc",e.target.value)}>{BSC.map(b=><option key={b} value={b}>{b}</option>)}</select></div>
            <div style={{...S.fg,flex:1}}><label style={S.lbl}>Category</label><select style={S.sel} value={f.cat} onChange={e=>set("cat",e.target.value)}>{CATS.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
          </div>
          <div style={S.fg}><label style={S.lbl}>Direction</label><select style={S.sel} value={f.dir} onChange={e=>set("dir",e.target.value)}>{DIRECTIONS.map(d=><option key={d} value={d}>{d}</option>)}</select></div>
        </div>}
        {step===1&&<div>
          <div style={S.fg}><label style={S.lbl}>Description</label><textarea style={{...S.inp,minHeight:60}} value={f.desc} onChange={e=>set("desc",e.target.value)}/></div>
          <div style={{display:"flex",gap:10}}>
            <div style={{...S.fg,flex:1}}><label style={S.lbl}>Unit</label><input style={S.inp} value={f.unit} onChange={e=>set("unit",e.target.value)} placeholder="USD, %, days..."/></div>
            <div style={{...S.fg,flex:1}}><label style={S.lbl}>Scope Dimensions</label><input style={S.inp} value={f.scope||""} onChange={e=>set("scope",e.target.value)} placeholder="Product Line, Region"/></div>
          </div>
          <div style={{display:"flex",gap:10}}>
            <div style={{...S.fg,flex:1}}><label style={S.lbl}>Target Source</label><input style={S.inp} value={f.targetSrc} onChange={e=>set("targetSrc",e.target.value)}/></div>
            <div style={{...S.fg,flex:1}}><label style={S.lbl}>Actual Source</label><input style={S.inp} value={f.actualSrc} onChange={e=>set("actualSrc",e.target.value)}/></div>
          </div>
          <div style={S.fg}><label style={S.lbl}>Parent Metric</label><select style={S.sel} value={f.parent||""} onChange={e=>set("parent",e.target.value||null)}><option value="">None</option>{metrics.filter(m=>m.id!==f.id).map(m=><option key={m.id} value={m.id}>{m.id} - {m.name}</option>)}</select></div>
        </div>}
        {step===2&&<div>
          <div style={S.fg}><label style={S.lbl}>Target Calculation Method</label><textarea style={{...S.inp,minHeight:50,fontFamily:"monospace",fontSize:12}} value={f.targetCalc} onChange={e=>set("targetCalc",e.target.value)}/></div>
          <div style={S.fg}><label style={S.lbl}>Baseline Calculation</label><textarea style={{...S.inp,minHeight:50,fontFamily:"monospace",fontSize:12}} value={f.baseCalc} onChange={e=>set("baseCalc",e.target.value)}/></div>
          <div style={S.fg}><label style={S.lbl}>Actual Calculation</label><textarea style={{...S.inp,minHeight:50,fontFamily:"monospace",fontSize:12}} value={f.actualCalc} onChange={e=>set("actualCalc",e.target.value)}/></div>
        </div>}
        {step===3&&<div style={{fontSize:13}}>
          <h4 style={{margin:"0 0 12px",color:C.dk}}>Review</h4>
          <InfoRow label="ID" value={f.id}/><InfoRow label="Name" value={f.name}/>
          <InfoRow label="BU / Dept" value={`${BU_CFG[f.bu]?.name} / ${f.dept}`}/>
          <InfoRow label="BSC / Category" value={`${f.bsc} / ${f.cat}`}/>
          <InfoRow label="Direction" value={f.dir}/><InfoRow label="Unit" value={f.unit}/>
          <InfoRow label="Scope" value={f.scope}/><InfoRow label="Description" value={f.desc}/>
        </div>}
      </div>
      <div style={S.mFoot}>
        <button style={S.btnO} onClick={step===0?onClose:()=>setStep(step-1)}>{step===0?"Cancel":"Back"}</button>
        {step<3?<button style={S.btn(C.md)} onClick={()=>setStep(step+1)} disabled={step===0&&!f.name}>Next</button>
          :<button style={S.btn(C.grn)} onClick={()=>onSave(f)}>Save Metric</button>}
      </div>
    </div>
  </div>;
}

// ═══════════════════════════════════════════════════════
// MODULE 2: KPI PROFILES (compact - full wizard preserved)
// ═══════════════════════════════════════════════════════

function ProfilesModule({profiles,setProfiles,metrics}) {
  const [selId,setSelId]=useState(null); const [wizard,setWizard]=useState(false);
  const [editP,setEditP]=useState(null); const [delId,setDelId]=useState(null);
  const [buF,setBuF]=useState("__all__"); const [deptF,setDeptF]=useState("__all__"); const [teamF,setTeamF]=useState("__all__");
  const [expanded,setExpanded]=useState({});
  const sel=profiles.find(p=>p.id===selId);
  const handleSave=(p)=>{if(editP){setProfiles(prev=>prev.map(x=>x.id===p.id?p:x));}else{setProfiles(prev=>[...prev,p]);}setWizard(false);setEditP(null);setSelId(p.id);};
  const handleDel=(id)=>{setProfiles(p=>p.filter(x=>x.id!==id));if(selId===id)setSelId(null);setDelId(null);};
  const toggleC=(k)=>setExpanded(p=>({...p,[k]:!p[k]}));

  const filtered=useMemo(()=>applyOrgFilter(profiles,null,buF,deptF,teamF),[profiles,buF,deptF,teamF]);

  // 2-level tree: BU → Dept → profiles
  const tree=useMemo(()=>{
    const t=new Map();
    filtered.forEach(p=>{
      const buKey=p.bu; const dKey=p.dept||"General";
      if(!t.has(buKey))t.set(buKey,new Map());
      const bu=t.get(buKey);
      if(!bu.has(dKey))bu.set(dKey,[]);
      bu.get(dKey).push(p);
    });
    return [...t.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([buKey,depts])=>({
      buKey,buName:BU_CFG[buKey]?.name||buKey,
      count:[...depts.values()].reduce((s,arr)=>s+arr.length,0),
      depts:[...depts.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([dk,items])=>({deptKey:dk,items}))
    }));
  },[filtered]);

  const showTree=buF==="__all__"||deptF==="__all__";

  return <div style={{display:"flex",height:"100%",overflow:"hidden"}}>
    <div style={{width:310,borderRight:`1px solid ${C.brd}`,display:"flex",flexDirection:"column",flexShrink:0}}>
      <div style={{padding:12,borderBottom:`1px solid ${C.brd}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:13,fontWeight:600,color:C.dk}}>KPI Profiles ({filtered.length}/{profiles.length})</span>
        <button style={{...S.btn(C.md),padding:"4px 10px",fontSize:12}} onClick={()=>{setEditP(null);setWizard(true);}}>+ New</button>
      </div>
      <OrgFilter items={profiles} getProfile={null} bu={buF} setBu={setBuF} dept={deptF} setDept={setDeptF} team={teamF} setTeam={setTeamF}/>
      <div style={{flex:1,overflowY:"auto",padding:8}}>
        {filtered.length===0?<Empty icon="[P]" title="No profiles" sub={buF!=="__all__"?"No profiles for this filter":"Create a KPI Profile for a role"} action="+ New" onAction={()=>setWizard(true)}/>
          :showTree?tree.map(({buKey,buName,count,depts})=><div key={buKey} style={{marginBottom:2}}>
            {buF==="__all__"&&<div onClick={()=>toggleC("bu:"+buKey)} style={{padding:"6px 8px",marginBottom:2,cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontSize:13,fontWeight:600,color:C.dk,background:C.pl,borderRadius:4,userSelect:"none"}}>
              <span style={{fontSize:10,color:C.grey}}>{expanded["bu:"+buKey]?"\u25bc":"\u25b6"}</span>
              {buName}
              <span style={{fontWeight:400,color:C.grey,fontSize:11}}>({count})</span>
            </div>}
            {(buF!=="__all__"||expanded["bu:"+buKey])&&depts.map(({deptKey,items})=><div key={deptKey} style={{marginLeft:buF==="__all__"?12:0}}>
              {deptF==="__all__"&&<div onClick={()=>toggleC("d:"+buKey+"/"+deptKey)} style={{padding:"4px 8px",marginBottom:2,cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontSize:12,fontWeight:500,color:C.grey,userSelect:"none"}}>
                <span style={{fontSize:9}}>{expanded["d:"+buKey+"/"+deptKey]?"\u25bc":"\u25b6"}</span>
                {deptKey}
                <span style={{fontSize:11,fontWeight:400}}>({items.length})</span>
              </div>}
              {(deptF!=="__all__"||expanded["d:"+buKey+"/"+deptKey])&&items.map(p=>{
                const tw=p.kpis.reduce((s,k)=>s+k.weight,0);
                return <div key={p.id} onClick={()=>setSelId(p.id)} style={{padding:10,marginLeft:deptF==="__all__"?12:0,marginBottom:6,borderRadius:6,cursor:"pointer",border:`1px solid ${selId===p.id?C.md:C.brd}`,background:selId===p.id?C.pl:C.wh}}>
                  <div style={{fontSize:14,fontWeight:600,color:C.dk}}>{p.role}</div>
                  {p.team&&<div style={{fontSize:12,color:C.grey,marginBottom:4}}>{p.team}</div>}
                  <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                    <Badge bg={C.lt} fg={C.dk}>{p.period}</Badge><Badge bg={C.lt} fg={C.dk}>{p.frequency}</Badge>
                    {p.team&&teamF==="__all__"&&!p.team&&<Badge bg="#FEF9E7" fg="#B7950B">{p.team}</Badge>}
                    <span style={{fontSize:11,color:C.grey,marginLeft:"auto"}}>{p.kpis.length} KPIs</span>
                    {tw!==100&&<span style={{fontSize:11,color:C.red,fontWeight:600}}>W:{tw}%</span>}
                  </div>
                </div>;
              })}
            </div>)}
          </div>)
          :filtered.map(p=>{
            const tw=p.kpis.reduce((s,k)=>s+k.weight,0);
            return <div key={p.id} onClick={()=>setSelId(p.id)} style={{padding:10,marginBottom:6,borderRadius:6,cursor:"pointer",border:`1px solid ${selId===p.id?C.md:C.brd}`,background:selId===p.id?C.pl:C.wh}}>
              <div style={{fontSize:14,fontWeight:600,color:C.dk}}>{p.role}</div>
              {p.team&&<div style={{fontSize:12,color:C.grey,marginBottom:4}}>{p.team}</div>}
              <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                <Badge bg={C.lt} fg={C.dk}>{p.period}</Badge><Badge bg={C.lt} fg={C.dk}>{p.frequency}</Badge>
                <span style={{fontSize:11,color:C.grey,marginLeft:"auto"}}>{p.kpis.length} KPIs</span>
                {tw!==100&&<span style={{fontSize:11,color:C.red,fontWeight:600}}>W:{tw}%</span>}
              </div>
            </div>;
          })
        }
      </div>
    </div>
    <div style={{flex:1,overflowY:"auto"}}>
      {sel?<PDetail p={sel} metrics={metrics} onEdit={()=>{setEditP(sel);setWizard(true);}} onDel={()=>setDelId(sel.id)}/>
        :<Empty icon="[P]" title="Select a profile" sub="Choose from the list to view KPI details"/>}
    </div>
    {wizard&&<PWizard init={editP} profiles={profiles} metrics={metrics} onSave={handleSave} onClose={()=>{setWizard(false);setEditP(null);}}/>}
    {delId&&<Confirm title="Delete Profile" msg={`Delete "${profiles.find(p=>p.id===delId)?.role}"?`} onOk={()=>handleDel(delId)} onNo={()=>setDelId(null)}/>}
  </div>;
}

function PDetail({p,metrics,onEdit,onDel}) {
  const tw=p.kpis.reduce((s,k)=>s+k.weight,0);
  return <div style={{padding:20}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
      <div><div style={{fontSize:12,color:C.grey,marginBottom:2}}>{p.id}</div><h3 style={{margin:0,fontSize:18,color:C.dk}}>{p.role}</h3><div style={{fontSize:13,color:C.grey}}>{BU_CFG[p.bu]?.name} / {p.dept}{p.team?` / ${p.team}`:""}</div></div>
      <div style={{display:"flex",gap:6}}><button style={S.btnO} onClick={onEdit}>Edit</button><button style={{...S.btnO,color:C.red,borderColor:C.red}} onClick={onDel}>Delete</button></div>
    </div>
    <div style={{display:"flex",gap:4,marginBottom:6,flexWrap:"wrap"}}>
      <Badge bg={C.lt} fg={C.dk}>{p.period}</Badge><Badge bg={C.lt} fg={C.dk}>{p.frequency}</Badge>
      <Badge bg={tw===100?"#EAFAF1":"#FDEDEC"} fg={tw===100?C.grn:C.red}>Weight: {tw}%</Badge>
    </div>
    <div style={{display:"flex",gap:4,marginBottom:16,flexWrap:"wrap"}}>
      {p.scope&&<Badge bg="#FEF9E7" fg="#B7950B">Scope: {p.scope}</Badge>}
      <Badge bg={C.pl} fg={C.dk}>Indicator Limit: {p.indicatorLimit||1.5}x</Badge>
      <Badge bg={C.pl} fg={C.dk}>KPI Score Limit: {p.kpiScoreLimit||1.2}x</Badge>
    </div>
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead><tr style={{background:C.pl}}>
          {["#","KPI Name","Type","Weight","Scope","Max Ind.","Target Est."].map(h=>
            <th key={h} style={{padding:"8px 10px",textAlign:"left",fontWeight:600,color:C.dk,borderBottom:`2px solid ${C.brd}`,whiteSpace:"nowrap"}}>{h}</th>)}
        </tr></thead>
        <tbody>{p.kpis.map((k,i)=>{
          const m=metrics.find(x=>x.id===k.metric_id);
          return <tr key={i} style={{borderBottom:`1px solid ${C.brd}`}}>
            <td style={{padding:"8px 10px",color:C.grey}}>{i+1}</td>
            <td style={{padding:"8px 10px"}}><div style={{fontWeight:600}}>{m?.name||k.metric_id}</div><div style={{fontSize:11,color:C.grey}}>{k.metric_id} / {m?.unit||""}</div></td>
            <td style={{padding:"8px 10px"}}><Badge bg={k.kpiType==="Smart task"?"#FEF9E7":k.kpiType==="Qualitative"?"#E8DAEF":C.lt} fg={k.kpiType==="Smart task"?"#B7950B":k.kpiType==="Qualitative"?C.purp:C.dk}>{k.kpiType||"Quantitative"}</Badge></td>
            <td style={{padding:"8px 10px"}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:50,height:5,background:C.brd,borderRadius:3,overflow:"hidden"}}><div style={{width:`${k.weight}%`,height:"100%",background:C.md,borderRadius:3}}/></div><span style={{fontWeight:600}}>{k.weight}%</span></div></td>
            <td style={{padding:"8px 10px",fontSize:11}}>{k.scope||"-"}</td>
            <td style={{padding:"8px 10px",fontFamily:"monospace"}}>{k.maxIndicator||1.5}x</td>
            <td style={{padding:"8px 10px",fontFamily:"monospace"}}>{k.estimatedTarget||"-"}</td>
          </tr>;
        })}</tbody>
      </table>
    </div>
  </div>;
}

function PWizard({init,profiles,metrics,onSave,onClose}) {
  const [step,setStep]=useState(0);
  const steps=["Role Info","Select KPIs","Scope & Config","Weights","Review"];
  const [f,setF]=useState(()=>{
    if(init) return {...init,team:init.team||"",kpis:init.kpis.map(k=>({...k}))};
    return {id:`P-${String(profiles.length+1).padStart(3,"0")}`,bu:"DEV",dept:"Engineering",team:"",role:"",period:"Q1 2026",scope:"",frequency:"Quarterly",updatedAt:new Date().toISOString().slice(0,10),indicatorLimit:1.5,kpiScoreLimit:1.2,kpis:[]};
  });
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const depts=BU_CFG[f.bu]?.depts||[];
  const [mSearch,setMSearch]=useState("");
  const avail=useMemo(()=>[...metrics].sort((a,b)=>{if(a.bu===f.bu&&b.bu!==f.bu)return -1;if(b.bu===f.bu&&a.bu!==f.bu)return 1;return 0;}),[metrics,f.bu]);
  const filteredM=useMemo(()=>{if(!mSearch)return avail;const s=mSearch.toLowerCase();return avail.filter(m=>m.name.toLowerCase().includes(s)||m.id.toLowerCase().includes(s));},[avail,mSearch]);
  const tw=f.kpis.reduce((s,k)=>s+(k.weight||0),0);

  // Extract existing teams for current BU/dept for autocomplete
  const existingTeams=useMemo(()=>{
    const teams=new Set();
    profiles.forEach(p=>{if(p.bu===f.bu&&p.dept===f.dept&&p.team)teams.add(p.team);});
    return [...teams].sort();
  },[profiles,f.bu,f.dept]);

  function addKpiRow(mId){const m=metrics.find(x=>x.id===mId);setF(p=>({...p,kpis:[...p.kpis,{metric_id:mId,weight:0,scope:"",kpiType:"Quantitative",targetMethod:m?.targetCalc||"",baseRules:m?.baseCalc||"",maxIndicator:p.indicatorLimit||1.5,benchmark:"",estimatedTarget:"",strategicLink:"",projectLink:""}]}));}
  function removeKpiRow(idx){setF(p=>({...p,kpis:p.kpis.filter((_,i)=>i!==idx)}));}
  function updateKpi(idx,field,value){setF(p=>{const nk=[...p.kpis];nk[idx]={...nk[idx],[field]:value};return{...p,kpis:nk};});}
  function distributeEvenly(){if(f.kpis.length===0)return;const base=Math.floor(100/f.kpis.length);const rem=100-base*f.kpis.length;setF(p=>({...p,kpis:p.kpis.map((k,i)=>({...k,weight:base+(i<rem?1:0)}))}));}
  const canNext=()=>{if(step===0)return f.role&&f.bu&&f.dept;if(step===1)return f.kpis.length>0;if(step===3)return tw===100;return true;};

  return <div style={S.overlay} onClick={onClose}>
    <div style={{...S.modal,maxWidth:760}} onClick={e=>e.stopPropagation()}>
      <div style={S.mHead}><strong>{init?"Edit":"New"} KPI Profile</strong><button onClick={onClose} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:C.grey}}>x</button></div>
      <div style={S.mBody}>
        <Steps steps={steps} current={step}/>
        {step===0&&<div>
          <div style={S.fg}><label style={S.lbl}>Role Title *</label><input style={S.inp} value={f.role} onChange={e=>set("role",e.target.value)} placeholder="e.g. Head of Sales"/></div>
          <div style={{display:"flex",gap:10}}><div style={{...S.fg,flex:1}}><label style={S.lbl}>BU</label><select style={S.sel} value={f.bu} onChange={e=>{set("bu",e.target.value);set("dept",BU_CFG[e.target.value]?.depts[0]||"");set("team","");}}>{Object.entries(BU_CFG).map(([k,v])=><option key={k} value={k}>{v.name}</option>)}</select></div><div style={{...S.fg,flex:1}}><label style={S.lbl}>Department</label><select style={S.sel} value={f.dept} onChange={e=>{set("dept",e.target.value);set("team","");}}>{depts.map(d=><option key={d} value={d}>{d}</option>)}</select></div></div>
          <div style={S.fg}><label style={S.lbl}>Team <span style={{fontWeight:400,color:C.grey}}>(optional)</span></label>
            <div style={{position:"relative"}}><input style={S.inp} value={f.team||""} onChange={e=>set("team",e.target.value)} placeholder="e.g. Acquisition, Kyiv City" list="team-list"/>
            {existingTeams.length>0&&<datalist id="team-list">{existingTeams.map(t=><option key={t} value={t}/>)}</datalist>}
            </div>
          </div>
          <div style={{display:"flex",gap:10}}><div style={{...S.fg,flex:1}}><label style={S.lbl}>Period</label><input style={S.inp} value={f.period} onChange={e=>set("period",e.target.value)} placeholder="Q1 2026"/></div><div style={{...S.fg,flex:1}}><label style={S.lbl}>Frequency</label><select style={S.sel} value={f.frequency} onChange={e=>set("frequency",e.target.value)}>{FREQ.map(x=><option key={x} value={x}>{x}</option>)}</select></div></div>
          <div style={S.fg}><label style={S.lbl}>Profile Scope</label><input style={S.inp} value={f.scope||""} onChange={e=>set("scope",e.target.value)} placeholder="e.g. All products, EMEA"/></div>
          <div style={{display:"flex",gap:10}}><div style={{...S.fg,flex:1}}><label style={S.lbl}>Indicator Limit</label><input type="number" step="0.1" style={S.inp} value={f.indicatorLimit||1.5} onChange={e=>set("indicatorLimit",parseFloat(e.target.value)||1.5)}/></div><div style={{...S.fg,flex:1}}><label style={S.lbl}>KPI Score Limit</label><input type="number" step="0.1" style={S.inp} value={f.kpiScoreLimit||1.2} onChange={e=>set("kpiScoreLimit",parseFloat(e.target.value)||1.2)}/></div></div>
        </div>}
        {step===1&&<div>
          <div style={{marginBottom:10,fontSize:12,color:C.grey}}>{f.kpis.length} KPI rows added (same metric allowed with different scope)</div>
          {f.kpis.length>0&&<div style={{marginBottom:12,border:`1px solid ${C.brd}`,borderRadius:6,overflow:"hidden"}}>{f.kpis.map((k,i)=>{const m=metrics.find(x=>x.id===k.metric_id);return <div key={i} style={{padding:"6px 12px",borderBottom:`1px solid ${C.brd}`,display:"flex",alignItems:"center",gap:8,background:C.pl,fontSize:12}}><span style={{fontWeight:600}}>{i+1}.</span><span style={{flex:1}}><span style={{color:C.grey}}>{k.metric_id}</span> {m?.name}</span>{k.scope&&<Badge bg="#FEF9E7" fg="#B7950B">{k.scope}</Badge>}<button onClick={()=>removeKpiRow(i)} style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:14,padding:"2px 6px"}}>x</button></div>;})}</div>}
          <input placeholder="Search metrics to add..." value={mSearch} onChange={e=>setMSearch(e.target.value)} style={{...S.inp,marginBottom:8}}/>
          <div style={{maxHeight:280,overflowY:"auto",border:`1px solid ${C.brd}`,borderRadius:6}}>{filteredM.map(m=>(<div key={m.id+Math.random()} onClick={()=>addKpiRow(m.id)} style={{padding:"8px 12px",borderBottom:`1px solid ${C.brd}`,cursor:"pointer",display:"flex",alignItems:"center",gap:8,fontSize:12}}><span style={{color:C.md,fontWeight:600,fontSize:16}}>+</span><div style={{flex:1}}><div><span style={{color:C.grey,marginRight:4}}>{m.id}</span>{m.name}</div><div style={{fontSize:11,color:C.grey}}>{BU_CFG[m.bu]?.name} / {m.dept} / {m.unit}</div></div></div>))}</div>
        </div>}
        {step===2&&<div>
          <p style={{fontSize:12,color:C.grey,margin:"0 0 12px"}}>Configure scope, type, and parameters for each KPI row</p>
          {f.kpis.map((k,i)=>{const m=metrics.find(x=>x.id===k.metric_id);return <div key={i} style={{marginBottom:14,padding:12,border:`1px solid ${C.brd}`,borderRadius:6}}>
            <div style={{fontWeight:600,color:C.dk,marginBottom:8,fontSize:13}}>{i+1}. {m?.name||k.metric_id}<span style={{fontWeight:400,color:C.grey,marginLeft:6,fontSize:11}}>{m?.unit} {m?.scope?`(dims: ${m.scope})`:""}</span></div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:6}}><div style={{flex:"1 1 200px"}}><label style={{...S.lbl,fontSize:11}}>Scope</label><input style={{...S.inp,padding:"4px 6px",fontSize:12}} value={k.scope||""} onChange={e=>updateKpi(i,"scope",e.target.value)} placeholder="e.g. Database tools"/></div><div style={{flex:"0 0 140px"}}><label style={{...S.lbl,fontSize:11}}>KPI Type</label><select style={{...S.sel,padding:"4px 6px",fontSize:12}} value={k.kpiType||"Quantitative"} onChange={e=>updateKpi(i,"kpiType",e.target.value)}>{KPI_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div></div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><div style={{flex:"1 1 200px"}}><label style={{...S.lbl,fontSize:11}}>Target Method</label><input style={{...S.inp,padding:"4px 6px",fontSize:12}} value={k.targetMethod||""} onChange={e=>updateKpi(i,"targetMethod",e.target.value)}/></div><div style={{flex:"1 1 200px"}}><label style={{...S.lbl,fontSize:11}}>Baseline Rules</label><input style={{...S.inp,padding:"4px 6px",fontSize:12}} value={k.baseRules||""} onChange={e=>updateKpi(i,"baseRules",e.target.value)}/></div></div>
            <div style={{display:"flex",gap:8,marginTop:6,flexWrap:"wrap"}}><div style={{flex:"1 1 90px"}}><label style={{...S.lbl,fontSize:11}}>Max Indicator</label><input type="number" step="0.1" style={{...S.inp,padding:"4px 6px",fontSize:12}} value={k.maxIndicator||1.5} onChange={e=>updateKpi(i,"maxIndicator",parseFloat(e.target.value)||1.5)}/></div><div style={{flex:"1 1 90px"}}><label style={{...S.lbl,fontSize:11}}>Est. Target</label><input style={{...S.inp,padding:"4px 6px",fontSize:12}} value={k.estimatedTarget||""} onChange={e=>updateKpi(i,"estimatedTarget",e.target.value)}/></div><div style={{flex:"1 1 90px"}}><label style={{...S.lbl,fontSize:11}}>Benchmark</label><input style={{...S.inp,padding:"4px 6px",fontSize:12}} value={k.benchmark||""} onChange={e=>updateKpi(i,"benchmark",e.target.value)}/></div></div>
          </div>;})}
        </div>}
        {step===3&&<div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><div><span style={{fontSize:14,fontWeight:600,color:tw===100?C.grn:C.red}}>Total: {tw}%</span>{tw!==100&&<span style={{fontSize:12,color:C.red,marginLeft:8}}>Must equal 100%</span>}</div><button style={S.btnO} onClick={distributeEvenly}>Distribute Evenly</button></div>
          {f.kpis.map((k,i)=>{const m=metrics.find(x=>x.id===k.metric_id);return <div key={i} style={{marginBottom:8,display:"flex",alignItems:"center",gap:10}}><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:500}}>{m?.name||k.metric_id}</div><div style={{fontSize:11,color:C.grey}}>{k.scope||"All"}</div></div><input type="range" min={0} max={100} step={5} value={k.weight||0} onChange={e=>updateKpi(i,"weight",parseInt(e.target.value))} style={{width:100,accentColor:C.md}}/><input type="number" min={0} max={100} value={k.weight||0} onChange={e=>updateKpi(i,"weight",Math.min(100,Math.max(0,parseInt(e.target.value)||0)))} style={{...S.inp,width:50,textAlign:"center",padding:"4px"}}/><span style={{fontSize:12,color:C.grey,width:14}}>%</span></div>;})}
        </div>}
        {step===4&&<div>
          <div style={{padding:12,background:C.pl,borderRadius:6,marginBottom:16}}><InfoRow label="Profile ID" value={f.id}/><InfoRow label="Role" value={f.role}/><InfoRow label="BU / Dept" value={`${BU_CFG[f.bu]?.name} / ${f.dept}`}/>{f.team&&<InfoRow label="Team" value={f.team}/>}<InfoRow label="Period" value={f.period}/><InfoRow label="Frequency" value={f.frequency}/><InfoRow label="Scope" value={f.scope||"-"}/><InfoRow label="Indicator Limit" value={`${f.indicatorLimit}x`}/><InfoRow label="KPI Score Limit" value={`${f.kpiScoreLimit}x`}/></div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr style={{background:C.pl}}>{["KPI","Type","Scope","Weight","Target"].map(h=><th key={h} style={{padding:"6px 8px",textAlign:"left",fontWeight:600,borderBottom:`1px solid ${C.brd}`}}>{h}</th>)}</tr></thead><tbody>{f.kpis.map((k,i)=>{const m=metrics.find(x=>x.id===k.metric_id);return <tr key={i} style={{borderBottom:`1px solid ${C.brd}`}}><td style={{padding:"6px 8px"}}><strong>{m?.name}</strong><br/><span style={{color:C.grey}}>{k.metric_id}</span></td><td style={{padding:"6px 8px"}}>{k.kpiType}</td><td style={{padding:"6px 8px",fontSize:11}}>{k.scope||"All"}</td><td style={{padding:"6px 8px",fontWeight:600}}>{k.weight}%</td><td style={{padding:"6px 8px",fontSize:11}}>{k.estimatedTarget||"-"}</td></tr>;})}</tbody></table>
        </div>}
      </div>
      <div style={S.mFoot}>
        <button style={S.btnO} onClick={step===0?onClose:()=>setStep(step-1)}>{step===0?"Cancel":"Back"}</button>
        {step<4?<button style={S.btn(C.md)} onClick={()=>setStep(step+1)} disabled={!canNext()}>Next</button>
          :<button style={S.btn(C.grn)} onClick={()=>onSave(f)} disabled={tw!==100}>Save Profile</button>}
      </div>
    </div>
  </div>;
}

// ═══════════════════════════════════════════════════════
// MODULE 3: KPI TRACKER
// ═══════════════════════════════════════════════════════

function TrackerModule({trackers,setTrackers,profiles,metrics}) {
  const [selId,setSelId]=useState(null); const [wizard,setWizard]=useState(false);
  const [delId,setDelId]=useState(null); const [cardKpi,setCardKpi]=useState(null);
  const [buF,setBuF]=useState("__all__"); const [deptF,setDeptF]=useState("__all__"); const [teamF,setTeamF]=useState("__all__");
  const [periodFilter,setPeriodFilter]=useState("__latest__");
  const [expanded,setExpanded]=useState({});
  const sel=trackers.find(t=>t.id===selId);

  const getProf=(t)=>profiles.find(p=>p.id===t.profile_id);

  // Org-filtered trackers
  const orgFiltered=useMemo(()=>applyOrgFilter(trackers,getProf,buF,deptF,teamF),[trackers,profiles,buF,deptF,teamF]);

  // Extract unique periods from org-filtered
  const periods=useMemo(()=>{
    const pm=new Map();
    orgFiltered.forEach(t=>{if(!pm.has(t.period)||t.createdAt>pm.get(t.period))pm.set(t.period,t.createdAt);});
    return [...pm.entries()].sort((a,b)=>b[1].localeCompare(a[1])).map(e=>e[0]);
  },[orgFiltered]);

  // Find latest tracker per profile within org-filtered
  const latestPerProfile=useMemo(()=>{
    const m=new Map();
    orgFiltered.forEach(t=>{
      const prev=m.get(t.profile_id);
      if(!prev||t.createdAt>prev.createdAt) m.set(t.profile_id,t);
    });
    return new Set([...m.values()].map(t=>t.id));
  },[orgFiltered]);

  // Period-filtered
  const filtered=useMemo(()=>{
    if(periodFilter==="__all__") return orgFiltered;
    if(periodFilter==="__latest__") return orgFiltered.filter(t=>latestPerProfile.has(t.id));
    return orgFiltered.filter(t=>t.period===periodFilter);
  },[orgFiltered,periodFilter,latestPerProfile]);

  // Group filtered by period
  const grouped=useMemo(()=>{
    const g=new Map();
    filtered.forEach(t=>{if(!g.has(t.period))g.set(t.period,[]);g.get(t.period).push(t);});
    return [...g.entries()].sort((a,b)=>{
      const ia=periods.indexOf(a[0]),ib=periods.indexOf(b[0]);
      return ia-ib;
    });
  },[filtered,periods]);

  const toggleCollapse=(p)=>setExpanded(prev=>({...prev,[p]:!prev[p]}));

  const handleSave=(t)=>{
    const ex=trackers.find(x=>x.id===t.id);
    if(ex){setTrackers(prev=>prev.map(x=>x.id===t.id?t:x));}
    else{setTrackers(prev=>[...prev,t]);}
    setWizard(false);setSelId(t.id);setPeriodFilter("__all__");
  };
  const handleDel=(id)=>{setTrackers(p=>p.filter(x=>x.id!==id));if(selId===id)setSelId(null);setDelId(null);};

  const handleActualChange=(trackerId,entryIdx,value,memberIdx)=>{
    setTrackers(prev=>prev.map(t=>{
      if(t.id!==trackerId) return t;
      const entries=[...t.entries.map(e=>({...e,memberData:e.memberData?e.memberData.map(md=>({...md})):undefined}))];
      const profile=profiles.find(p=>p.id===t.profile_id);
      if(!profile) return t;

      if(t.type==="personal"){
        entries[entryIdx]={...entries[entryIdx],actual:value===""?null:parseFloat(value)};
        const e=entries[entryIdx];
        const kpi=profile.kpis[e.kpi_index];
        const m=metrics.find(x=>x.id===e.metric_id);
        e.indicator=calcIndicator(e.actual,e.baseline,e.target,m?.dir,kpi?.maxIndicator);
        e.weightedScore=e.indicator!==null?(e.indicator*(kpi?.weight||0)/100):null;
      } else {
        const md=[...entries[entryIdx].memberData];
        md[memberIdx]={...md[memberIdx],actual:value===""?null:parseFloat(value)};
        const kpi=profile.kpis[entries[entryIdx].kpi_index];
        const m=metrics.find(x=>x.id===entries[entryIdx].metric_id);
        md[memberIdx].indicator=calcIndicator(md[memberIdx].actual,md[memberIdx].baseline,md[memberIdx].target,m?.dir,kpi?.maxIndicator);
        md[memberIdx].weightedScore=md[memberIdx].indicator!==null?(md[memberIdx].indicator*(kpi?.weight||0)/100):null;
        entries[entryIdx]={...entries[entryIdx],memberData:md};
      }

      let totalScore;
      if(t.type==="personal"){
        const sum=entries.reduce((s,e)=>s+(e.weightedScore||0),0);
        totalScore=Math.min(sum,profile.kpiScoreLimit||1.2);
      } else {
        totalScore=t.members.map((_,mi)=>{
          const sum=entries.reduce((s,e)=>s+((e.memberData[mi]?.weightedScore)||0),0);
          return Math.min(sum,profile.kpiScoreLimit||1.2);
        });
      }
      return {...t,entries,totalScore,updatedAt:new Date().toISOString().slice(0,10)};
    }));
  };

  return <div style={{display:"flex",height:"100%",overflow:"hidden"}}>
    <div style={{width:310,borderRight:`1px solid ${C.brd}`,display:"flex",flexDirection:"column",flexShrink:0}}>
      <div style={{padding:12,borderBottom:`1px solid ${C.brd}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:13,fontWeight:600,color:C.dk}}>KPI Trackers ({trackers.length})</span>
        <button style={{...S.btn(C.md),padding:"4px 10px",fontSize:12}} onClick={()=>setWizard(true)} disabled={profiles.length===0}>+ New</button>
      </div>
      <OrgFilter items={trackers} getProfile={getProf} bu={buF} setBu={(v)=>{setBuF(v);setDeptF("__all__");setTeamF("__all__");setPeriodFilter("__latest__");}} dept={deptF} setDept={(v)=>{setDeptF(v);setTeamF("__all__");setPeriodFilter("__latest__");}} team={teamF} setTeam={(v)=>{setTeamF(v);setPeriodFilter("__latest__");}}/>
      {/* Period filter */}
      <div style={{padding:"4px 10px 6px",borderBottom:`1px solid ${C.brd}`}}>
        <select style={{...S.sel,padding:"3px 6px",fontSize:11,width:"100%"}} value={periodFilter} onChange={e=>setPeriodFilter(e.target.value)}>
          <option value="__latest__">Latest per role ({[...latestPerProfile].length})</option>
          <option value="__all__">All periods ({orgFiltered.length})</option>
          {periods.map(p=><option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:8}}>
        {filtered.length===0?<Empty icon="[T]" title="No trackers" sub={profiles.length===0?"Create a KPI Profile first":"No trackers for this filter"} action={profiles.length>0?"+ New Tracker":null} onAction={()=>setWizard(true)}/>
          :grouped.map(([period,items])=><div key={period}>
            {grouped.length>1&&<div onClick={()=>toggleCollapse(period)} style={{padding:"6px 8px",marginBottom:4,cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontSize:12,fontWeight:600,color:C.dk,background:C.pl,borderRadius:4,userSelect:"none"}}>
              <span style={{fontSize:10,color:C.grey}}>{expanded[period]?"\u25bc":"\u25b6"}</span>
              {period}
              <span style={{fontWeight:400,color:C.grey}}>({items.length})</span>
            </div>}
            {expanded[period]&&items.map(t=>{
              const p=profiles.find(x=>x.id===t.profile_id);
              const isLatest=latestPerProfile.has(t.id);
              return <div key={t.id} onClick={()=>setSelId(t.id)} style={{padding:10,marginBottom:6,borderRadius:6,cursor:"pointer",border:`1px solid ${selId===t.id?C.md:C.brd}`,background:selId===t.id?C.pl:C.wh}}>
                <div style={{fontSize:14,fontWeight:600,color:C.dk,display:"flex",alignItems:"center",gap:6}}>
                  {p?.role||t.profile_id}
                  {isLatest&&periodFilter==="__all__"&&<span style={{fontSize:9,padding:"1px 5px",borderRadius:8,background:C.grn,color:C.wh,fontWeight:700}}>latest</span>}
                </div>
                <div style={{fontSize:12,color:C.grey,marginBottom:4}}>{t.type==="personal"?t.name:"Team"}{grouped.length<=1?` - ${t.period}`:""}</div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
                  <Badge bg={t.type==="personal"?C.lt:"#E8DAEF"} fg={t.type==="personal"?C.dk:C.purp}>{t.type==="personal"?"Personal":"Team"}</Badge>
                  {buF==="__all__"&&<Badge bg={C.lt} fg={C.dk}>{BU_CFG[p?.bu]?.name||""}</Badge>}
                  {buF!=="__all__"&&deptF==="__all__"&&<Badge bg={C.lt} fg={C.dk}>{p?.dept}</Badge>}
                  {deptF!=="__all__"&&p?.team&&teamF==="__all__"&&<Badge bg="#FEF9E7" fg="#B7950B">{p.team}</Badge>}
                  {t.type==="personal"&&t.totalScore!==undefined&&t.totalScore!==null&&<span style={{marginLeft:"auto",fontSize:12,fontWeight:700,color:indColor(t.totalScore)}}>{fmtPct(t.totalScore)}</span>}
                  {t.type==="team"&&Array.isArray(t.totalScore)&&t.totalScore.length>0&&(()=>{const avg=t.totalScore.reduce((s,v)=>s+v,0)/t.totalScore.length;return <span style={{marginLeft:"auto",fontSize:11,fontWeight:700,color:indColor(avg)}}>avg {fmtPct(avg)}</span>;})()}
                </div>
              </div>;
            })}
          </div>)}
      </div>
    </div>
    <div style={{flex:1,overflowY:"auto"}}>
      {sel?<TrackerDetail t={sel} profiles={profiles} metrics={metrics} trackers={trackers} onActualChange={handleActualChange} onShowCard={setCardKpi} onDel={()=>setDelId(sel.id)}/>
        :<Empty icon="[T]" title="Select a tracker" sub="Choose from the list or create a new one"/>}
    </div>
    {wizard&&<TrackerWizard trackers={trackers} profiles={profiles} metrics={metrics} onSave={handleSave} onClose={()=>setWizard(false)}/>}
    {delId&&(()=>{const dt=trackers.find(x=>x.id===delId);const dp=profiles.find(p=>p.id===dt?.profile_id);return <Confirm title="Delete Tracker" msg={`Delete "${dp?.role||dt?.profile_id}" tracker for ${dt?.type==="personal"?dt?.name:"team"} (${dt?.period})? This cannot be undone.`} onOk={()=>handleDel(delId)} onNo={()=>setDelId(null)}/>;})()}
    {cardKpi&&<KPICard data={cardKpi} metrics={metrics} onClose={()=>setCardKpi(null)}/>}
  </div>;
}

// ── Tracker Detail View ──

function TrackerDetail({t,profiles,metrics,trackers,onActualChange,onShowCard,onDel}) {
  const profile=profiles.find(p=>p.id===t.profile_id);
  if(!profile) return <Empty icon="[!]" title="Profile not found" sub={`Profile ${t.profile_id} has been deleted`}/>;

  // Find previous tracker for same profile
  const prevTracker=useMemo(()=>{
    const sameProfile=trackers.filter(x=>x.profile_id===t.profile_id&&x.id!==t.id&&x.createdAt<t.createdAt);
    return sameProfile.sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0]||null;
  },[trackers,t]);

  return <div style={{padding:20}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
      <div>
        <div style={{fontSize:12,color:C.grey,marginBottom:2}}>{t.id}</div>
        <h3 style={{margin:0,fontSize:18,color:C.dk}}>{profile.role}</h3>
        <div style={{fontSize:13,color:C.grey}}>{BU_CFG[profile.bu]?.name} / {profile.dept}{profile.team?` / ${profile.team}`:""}</div>
      </div>
      <button style={{...S.btnO,color:C.red,borderColor:C.red}} onClick={onDel}>Delete</button>
    </div>
    <div style={{display:"flex",gap:4,marginBottom:16,flexWrap:"wrap"}}>
      <Badge bg={t.type==="personal"?C.lt:"#E8DAEF"} fg={t.type==="personal"?C.dk:C.purp}>{t.type==="personal"?"Personal":"Team"}</Badge>
      <Badge bg={C.lt} fg={C.dk}>{t.period}</Badge>
      {t.type==="personal"&&<Badge bg="#FEF9E7" fg="#B7950B">{t.name}</Badge>}
      {t.actualScope&&<Badge bg="#FEF9E7" fg="#B7950B">Scope: {t.actualScope}</Badge>}
      {t.type==="team"&&<Badge bg={C.lt} fg={C.dk}>{t.members?.length||0} members</Badge>}
      {prevTracker&&<Badge bg="#FADBD8" fg="#922B21">prev: {prevTracker.period}</Badge>}
    </div>

    {t.type==="personal"?
      <PersonalTrackerTable t={t} profile={profile} metrics={metrics} prevTracker={prevTracker} onActualChange={onActualChange} onShowCard={onShowCard}/>
      :<TeamTrackerTable t={t} profile={profile} metrics={metrics} onActualChange={onActualChange} onShowCard={onShowCard}/>}
  </div>;
}

// ── Personal Tracker Table ──

function PersonalTrackerTable({t,profile,metrics,prevTracker,onActualChange,onShowCard}) {
  const hasPrev=!!prevTracker;
  return <div style={{overflowX:"auto"}}>
    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
      <thead><tr style={{background:C.pl}}>
        {["#","KPI Name","Type","Weight","Baseline","Target",hasPrev?"Prev":"",  "Actual","Indicator","W.Score"].filter(Boolean).map(h=>
          <th key={h} style={{padding:"8px 8px",textAlign:h==="Actual"||h==="Prev"?"center":"left",fontWeight:600,color:h==="Prev"?C.grey:C.dk,borderBottom:`2px solid ${C.brd}`,whiteSpace:"nowrap",fontSize:h==="Prev"?11:12}}>{h}</th>)}
      </tr></thead>
      <tbody>
        {t.entries.map((e,i)=>{
          const kpi=profile.kpis[e.kpi_index];
          const m=metrics.find(x=>x.id===e.metric_id);
          if(!kpi||!m) return <tr key={i} style={{borderBottom:`1px solid ${C.brd}`,background:"#FEF9E7"}}><td style={{padding:"8px",color:C.grey}}>{i+1}</td><td colSpan={hasPrev?9:8} style={{padding:"8px",color:C.ylw,fontSize:12}}>KPI data unavailable - {!kpi?"profile KPI removed":"metric "+e.metric_id+" deleted"}</td></tr>;
          const ind=calcIndicator(e.actual,e.baseline,e.target,m.dir,kpi.maxIndicator);
          const ws=ind!==null?(ind*(kpi.weight||0)/100):null;
          const prevEntry=prevTracker?.entries?.find(pe=>pe.kpi_index===e.kpi_index);
          const prevActual=prevEntry?.actual;
          return <tr key={i} style={{borderBottom:`1px solid ${C.brd}`}}>
            <td style={{padding:"8px",color:C.grey}}>{i+1}</td>
            <td style={{padding:"8px"}}>
              <span style={{fontWeight:600,cursor:"pointer",color:C.md,textDecoration:"underline"}} onClick={()=>onShowCard({entry:e,kpi,metric:m,profile,tracker:t})}>{m.name}</span>
              <div style={{fontSize:11,color:C.grey}}>{e.metric_id}{kpi.scope?` / ${kpi.scope}`:""}</div>
            </td>
            <td style={{padding:"8px"}}><Badge bg={kpi.kpiType==="Smart task"?"#FEF9E7":kpi.kpiType==="Qualitative"?"#E8DAEF":C.lt} fg={kpi.kpiType==="Smart task"?"#B7950B":kpi.kpiType==="Qualitative"?C.purp:C.dk}>{kpi.kpiType}</Badge></td>
            <td style={{padding:"8px",fontWeight:600}}>{kpi.weight}%</td>
            <td style={{padding:"8px",fontFamily:"monospace"}}>{fmtNum(e.baseline)}</td>
            <td style={{padding:"8px",fontFamily:"monospace"}}>{fmtNum(e.target)}</td>
            {hasPrev&&<td style={{padding:"8px",fontFamily:"monospace",fontSize:11,color:C.grey,textAlign:"center"}}>{fmtNum(prevActual)}</td>}
            <td style={{padding:"8px",textAlign:"center"}}>
              <input type="number" step="any" value={e.actual===null||e.actual===undefined?"":e.actual}
                onChange={ev=>onActualChange(t.id,i,ev.target.value)}
                style={{...S.inp,width:80,textAlign:"center",padding:"4px 6px",fontSize:12,fontFamily:"monospace"}}/>
            </td>
            <td style={{padding:"8px",fontWeight:700,color:indColor(ind),fontFamily:"monospace"}}>{fmtPct(ind)}</td>
            <td style={{padding:"8px",fontFamily:"monospace",color:ws!==null?C.bk:C.grey}}>{ws!==null?(ws*100).toFixed(1)+"%":"-"}</td>
          </tr>;
        })}
      </tbody>
      <tfoot>
        <tr style={{background:C.pl,fontWeight:700}}>
          <td colSpan={hasPrev?8:7} style={{padding:"10px 8px",textAlign:"right",fontSize:13,color:C.dk}}>KPI Score</td>
          <td colSpan={2} style={{padding:"10px 8px",fontSize:16,fontFamily:"monospace",color:indColor(t.totalScore)}}>
            {t.totalScore!==null&&t.totalScore!==undefined?fmtPct(t.totalScore):"-"}
            {t.totalScore!==null&&t.totalScore>=profile.kpiScoreLimit&&<span style={{fontSize:10,color:C.grey,marginLeft:4}}>(capped)</span>}
          </td>
        </tr>
      </tfoot>
    </table>
  </div>;
}

// ── Team Tracker Table ──

function TeamTrackerTable({t,profile,metrics,onActualChange,onShowCard}) {
  const members=t.members||[];
  return <div style={{overflowX:"auto"}}>
    <table style={{borderCollapse:"collapse",fontSize:11}}>
      <thead>
        <tr style={{background:C.dk}}>
          <th colSpan={3} style={{padding:"6px 8px",color:C.wh,textAlign:"left",borderRight:`2px solid ${C.wh}`}}></th>
          {members.map((m,mi)=><th key={mi} colSpan={4} style={{padding:"6px 8px",color:C.wh,textAlign:"center",borderRight:mi<members.length-1?`2px solid ${C.wh}`:undefined}}>{m}</th>)}
        </tr>
        <tr style={{background:C.pl}}>
          <th style={{padding:"6px 6px",textAlign:"left",fontWeight:600,color:C.dk,borderBottom:`2px solid ${C.brd}`,whiteSpace:"nowrap"}}>KPI</th>
          <th style={{padding:"6px 6px",textAlign:"left",fontWeight:600,color:C.dk,borderBottom:`2px solid ${C.brd}`}}>Type</th>
          <th style={{padding:"6px 6px",textAlign:"left",fontWeight:600,color:C.dk,borderBottom:`2px solid ${C.brd}`,borderRight:`2px solid ${C.brd}`}}>W</th>
          {members.map((_,mi)=>
            ["Base","Tgt","Act","Ind"].map((h,hi)=>
              <th key={`${mi}-${hi}`} style={{padding:"6px 4px",textAlign:"center",fontWeight:600,color:C.dk,borderBottom:`2px solid ${C.brd}`,
                borderRight:hi===3&&mi<members.length-1?`2px solid ${C.brd}`:undefined,whiteSpace:"nowrap",fontSize:10}}>{h}</th>
            )
          )}
        </tr>
      </thead>
      <tbody>
        {t.entries.map((e,ei)=>{
          const kpi=profile.kpis[e.kpi_index];
          const m=metrics.find(x=>x.id===e.metric_id);
          if(!kpi||!m) return <tr key={ei} style={{borderBottom:`1px solid ${C.brd}`,background:"#FEF9E7"}}><td colSpan={3+members.length*4} style={{padding:"6px",color:C.ylw,fontSize:11}}>KPI data unavailable - {!kpi?"profile KPI removed":"metric "+e.metric_id+" deleted"}</td></tr>;
          return <tr key={ei} style={{borderBottom:`1px solid ${C.brd}`}}>
            <td style={{padding:"6px 6px",maxWidth:140}}>
              <span style={{fontWeight:600,cursor:"pointer",color:C.md,textDecoration:"underline",fontSize:11}} onClick={()=>onShowCard({entry:e,kpi,metric:m,profile,tracker:t})}>{m.name}</span>
              <div style={{fontSize:10,color:C.grey}}>{kpi.scope||""}</div>
            </td>
            <td style={{padding:"6px 6px"}}><span style={{fontSize:10}}>{kpi.kpiType?.slice(0,4)}</span></td>
            <td style={{padding:"6px 6px",fontWeight:600,borderRight:`2px solid ${C.brd}`}}>{kpi.weight}%</td>
            {members.map((_, mi)=>{
              const md=e.memberData?.[mi]||{};
              const ind=calcIndicator(md.actual,md.baseline,md.target,m.dir,kpi.maxIndicator);
              return [
                <td key={`${mi}-b`} style={{padding:"4px 3px",textAlign:"center",fontFamily:"monospace",fontSize:10}}>{fmtNum(md.baseline)}</td>,
                <td key={`${mi}-t`} style={{padding:"4px 3px",textAlign:"center",fontFamily:"monospace",fontSize:10}}>{fmtNum(md.target)}</td>,
                <td key={`${mi}-a`} style={{padding:"4px 3px",textAlign:"center"}}>
                  <input type="number" step="any" value={md.actual===null||md.actual===undefined?"":md.actual}
                    onChange={ev=>onActualChange(t.id,ei,ev.target.value,mi)}
                    style={{width:52,padding:"2px 3px",border:`1px solid ${C.brd}`,borderRadius:3,fontSize:10,textAlign:"center",fontFamily:"monospace",boxSizing:"border-box"}}/>
                </td>,
                <td key={`${mi}-i`} style={{padding:"4px 3px",textAlign:"center",fontWeight:700,color:indColor(ind),fontFamily:"monospace",fontSize:10,
                  borderRight:mi<members.length-1?`2px solid ${C.brd}`:undefined}}>{fmtPct(ind)}</td>,
              ];
            })}
          </tr>;
        })}
      </tbody>
      <tfoot>
        <tr style={{background:C.pl,fontWeight:700}}>
          <td colSpan={3} style={{padding:"8px 6px",textAlign:"right",fontSize:12,color:C.dk,borderRight:`2px solid ${C.brd}`}}>KPI Score</td>
          {members.map((_,mi)=>{
            const score=Array.isArray(t.totalScore)?t.totalScore[mi]:null;
            // Recalc for display
            const sum=t.entries.reduce((s,e)=>{
              const md=e.memberData?.[mi];
              const kpi=profile.kpis[e.kpi_index];
              const m2=metrics.find(x=>x.id===e.metric_id);
              if(!md||!kpi||!m2) return s;
              const ind=calcIndicator(md.actual,md.baseline,md.target,m2.dir,kpi.maxIndicator);
              return s+(ind!==null?(ind*kpi.weight/100):0);
            },0);
            const capped=Math.min(sum,profile.kpiScoreLimit||1.2);
            const hasData=t.entries.some(e=>e.memberData?.[mi]?.actual!==null&&e.memberData?.[mi]?.actual!==undefined);
            return <td key={mi} colSpan={4} style={{padding:"8px 4px",textAlign:"center",fontSize:13,fontFamily:"monospace",
              color:hasData?indColor(capped):C.grey,borderRight:mi<members.length-1?`2px solid ${C.brd}`:undefined}}>
              {hasData?fmtPct(capped):"-"}
            </td>;
          })}
        </tr>
      </tfoot>
    </table>
  </div>;
}

// ── KPI Card (Business Planning deep-dive) ──

function KPICard({data,metrics,onClose}) {
  const {entry,kpi,metric:m,profile,tracker}=data;
  const formula = m.dir==="Lower is better"?"(Base - Actual) / (Base - Target)":"(Actual - Base) / (Target - Base)";
  return <div style={S.overlay} onClick={onClose}>
    <div style={{...S.modal,maxWidth:640}} onClick={e=>e.stopPropagation()}>
      <div style={S.mHead}><strong>KPI Card</strong><button onClick={onClose} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:C.grey}}>x</button></div>
      <div style={S.mBody}>
        <h3 style={{margin:"0 0 4px",color:C.dk}}>{m.name}</h3>
        <div style={{fontSize:12,color:C.grey,marginBottom:16}}>{m.id} - {m.desc}</div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:2}}>
          <InfoRow label="BU" value={BU_CFG[profile.bu]?.name}/>
          <InfoRow label="Department" value={profile.dept}/>
          <InfoRow label="Role" value={profile.role}/>
          <InfoRow label="Period" value={tracker.period}/>
          <InfoRow label="KPI Type" value={kpi.kpiType}/>
          <InfoRow label="BSC Perspective" value={m.bsc}/>
          <InfoRow label="Scope" value={kpi.scope||"-"}/>
          <InfoRow label="Reporting Frequency" value={profile.frequency}/>
          <InfoRow label="Strategic Link" value={kpi.strategicLink}/>
          <InfoRow label="Project Link" value={kpi.projectLink}/>
        </div>

        <div style={{marginTop:16}}>
          <CalcBlock title="Target Calculation Method" source={m.targetSrc} method={kpi.targetMethod||m.targetCalc}/>
          <CalcBlock title="Baseline Rules" source="Defined per metric" method={kpi.baseRules||m.baseCalc}/>
          <div style={{marginBottom:12,padding:12,background:C.pl,borderRadius:6,border:`1px solid ${C.lt}`}}>
            <div style={{fontSize:12,fontWeight:600,color:C.dk,marginBottom:6}}>Indicator Formula</div>
            <div style={{fontSize:13,fontFamily:"monospace",color:C.bk}}>{formula}</div>
            <div style={{fontSize:11,color:C.grey,marginTop:4}}>Capped at {kpi.maxIndicator||1.5}x</div>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:2}}>
          <InfoRow label="Benchmark" value={kpi.benchmark||"-"}/>
          <InfoRow label="Estimated Target" value={kpi.estimatedTarget||"-"}/>
          <InfoRow label="Direction" value={m.dir}/>
          <InfoRow label="Unit" value={m.unit}/>
        </div>
      </div>
      <div style={S.mFoot}><button style={S.btnO} onClick={onClose}>Close</button></div>
    </div>
  </div>;
}

// ── Tracker Wizard ──

function TrackerWizard({trackers,profiles,metrics,onSave,onClose}) {
  const [step,setStep]=useState(0);
  const steps=["Select Profile","Type & Period","Set Targets","Review"];
  const [profileId,setProfileId]=useState(profiles[0]?.id||"");
  const [tType,setTType]=useState("personal");
  const [period,setPeriod]=useState("Q2 2026");
  const [name,setName]=useState("");
  const [membersStr,setMembersStr]=useState("");
  const [entries,setEntries]=useState([]);

  const profile=profiles.find(p=>p.id===profileId);

  // Find previous tracker for selected profile (most recent by createdAt)
  const prevTracker=useMemo(()=>{
    const sameProfile=trackers.filter(x=>x.profile_id===profileId).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    return sameProfile[0]||null;
  },[trackers,profileId]);

  // Auto-populate type/name/members from previous tracker when switching profiles
  useEffect(()=>{
    if(!prevTracker) return;
    setTType(prevTracker.type);
    if(prevTracker.type==="personal"&&prevTracker.name) setName(prevTracker.name);
    if(prevTracker.type==="team"&&prevTracker.members) setMembersStr(prevTracker.members.join(", "));
  },[profileId]);

  useEffect(()=>{
    if(!profile) return;
    setEntries(profile.kpis.map((k,i)=>{
      if(tType==="personal"){
        return {kpi_index:i,metric_id:k.metric_id,baseline:"",target:k.estimatedTarget||"",actual:null};
      } else {
        const members=(membersStr||"").split(",").map(s=>s.trim()).filter(Boolean);
        return {kpi_index:i,metric_id:k.metric_id,memberData:members.map(()=>({baseline:"",target:k.estimatedTarget||"",actual:null}))};
      }
    }));
  },[profileId,tType]);

  // Copy from previous: pre-fill baseline and target from previous tracker
  const copyFromPrev=()=>{
    if(!prevTracker||!profile) return;
    setEntries(prev=>prev.map((e,i)=>{
      const prevEntry=prevTracker.entries.find(pe=>pe.kpi_index===e.kpi_index);
      if(!prevEntry) return e;
      if(tType==="personal"){
        return {...e,
          baseline:prevEntry.baseline??"",
          target:prevEntry.target??"",
        };
      } else {
        // For team, copy baselines/targets per member (if member count matches)
        if(!prevEntry.memberData) return e;
        const members=(membersStr||"").split(",").map(s=>s.trim()).filter(Boolean);
        return {...e,memberData:members.map((_,mi)=>{
          const pd=prevEntry.memberData[mi];
          return pd?{baseline:pd.baseline??"",target:pd.target??"",actual:null}:{baseline:"",target:"",actual:null};
        })};
      }
    }));
    // Pre-fill type and members from previous tracker
    if(prevTracker.type==="team"&&prevTracker.members&&tType==="team"&&!membersStr){
      setMembersStr(prevTracker.members.join(", "));
    }
    if(prevTracker.type==="personal"&&prevTracker.name&&tType==="personal"&&!name){
      setName(prevTracker.name);
    }
  };

  const updateEntry=(idx,field,val)=>{
    setEntries(p=>{const n=[...p];n[idx]={...n[idx],[field]:val===""?"":parseFloat(val)};return n;});
  };
  const updateMemberEntry=(idx,mi,field,val)=>{
    setEntries(p=>{const n=[...p];const md=[...n[idx].memberData];md[mi]={...md[mi],[field]:val===""?"":parseFloat(val)};n[idx]={...n[idx],memberData:md};return n;});
  };

  const members=(membersStr||"").split(",").map(s=>s.trim()).filter(Boolean);

  const canNext=()=>{
    if(step===0) return !!profileId;
    if(step===1){
      if(tType==="personal") return !!name;
      return members.length>0;
    }
    return true;
  };

  const doSave=()=>{
    if(!profile) return;
    const maxNum=trackers.reduce((mx,x)=>{const n=parseInt(x.id.replace("T-",""));return n>mx?n:mx;},0);
    const id=`T-${String(maxNum+1).padStart(3,"0")}`;
    const now=new Date().toISOString().slice(0,10);

    // Calc indicators and scores
    const finalEntries=entries.map(e=>{
      const kpi=profile.kpis[e.kpi_index];
      const m=metrics.find(x=>x.id===e.metric_id);
      if(tType==="personal"){
        const ind=calcIndicator(e.actual,e.baseline,e.target,m?.dir,kpi?.maxIndicator);
        const ws=ind!==null?(ind*(kpi?.weight||0)/100):null;
        return {...e,indicator:ind,weightedScore:ws};
      } else {
        const md=e.memberData.map(d=>{
          const ind=calcIndicator(d.actual,d.baseline,d.target,m?.dir,kpi?.maxIndicator);
          const ws=ind!==null?(ind*(kpi?.weight||0)/100):null;
          return {...d,indicator:ind,weightedScore:ws};
        });
        return {...e,memberData:md};
      }
    });

    let totalScore;
    if(tType==="personal"){
      const sum=finalEntries.reduce((s,e)=>s+(e.weightedScore||0),0);
      totalScore=Math.min(sum,profile.kpiScoreLimit||1.2);
    } else {
      totalScore=members.map((_,mi)=>{
        const sum=finalEntries.reduce((s,e)=>s+((e.memberData[mi]?.weightedScore)||0),0);
        return Math.min(sum,profile.kpiScoreLimit||1.2);
      });
    }

    onSave({
      id,profile_id:profileId,type:tType,period,
      name:tType==="personal"?name:null,
      actualScope:profile.scope||"",
      members:tType==="team"?members:null,
      entries:finalEntries,totalScore,createdAt:now,updatedAt:now,
    });
  };

  return <div style={S.overlay} onClick={onClose}>
    <div style={{...S.modal,maxWidth:720}} onClick={e=>e.stopPropagation()}>
      <div style={S.mHead}><strong>New KPI Tracker</strong><button onClick={onClose} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:C.grey}}>x</button></div>
      <div style={S.mBody}>
        <Steps steps={steps} current={step}/>

        {step===0&&<div>
          <div style={S.fg}><label style={S.lbl}>Select Profile</label>
            <select style={S.sel} value={profileId} onChange={e=>setProfileId(e.target.value)}>
              {profiles.map(p=><option key={p.id} value={p.id}>{p.role} ({BU_CFG[p.bu]?.name} / {p.dept})</option>)}
            </select>
          </div>
          {profile&&<div style={{padding:12,background:C.pl,borderRadius:6}}>
            <InfoRow label="Profile" value={`${profile.id} - ${profile.role}`}/>
            <InfoRow label="BU / Dept" value={`${BU_CFG[profile.bu]?.name} / ${profile.dept}`}/>
            <InfoRow label="Period" value={profile.period}/>
            <InfoRow label="KPIs" value={profile.kpis.length}/>
            <InfoRow label="Indicator Limit" value={`${profile.indicatorLimit}x`}/>
            <InfoRow label="KPI Score Limit" value={`${profile.kpiScoreLimit}x`}/>
          </div>}
          {prevTracker&&<div style={{marginTop:10,padding:10,background:"#FEF9E7",borderRadius:6,fontSize:12}}>
            <div style={{fontWeight:600,color:"#B7950B",marginBottom:4}}>Previous tracker exists</div>
            <div style={{color:C.grey}}>{prevTracker.period} - {prevTracker.type==="personal"?prevTracker.name:"Team"} ({prevTracker.id})</div>
            <div style={{color:C.grey,fontSize:11,marginTop:2}}>You can copy baseline & target values in Step 3</div>
          </div>}
        </div>}

        {step===1&&<div>
          <div style={S.fg}><label style={S.lbl}>Tracker Type</label>
            <div style={{display:"flex",gap:8}}>
              {["personal","team"].map(tt=><button key={tt} onClick={()=>setTType(tt)} style={{...tt===tType?S.btn(C.md):S.btnO,flex:1,textTransform:"capitalize"}}>{tt}</button>)}
            </div>
          </div>
          <div style={S.fg}><label style={S.lbl}>Reporting Period</label><input style={S.inp} value={period} onChange={e=>setPeriod(e.target.value)} placeholder="January 2026, Q1 2026"/></div>
          {tType==="personal"?
            <div style={S.fg}><label style={S.lbl}>Person Name</label><input style={S.inp} value={name} onChange={e=>setName(e.target.value)} placeholder="Full name"/></div>
            :<div style={S.fg}><label style={S.lbl}>Team Members (comma-separated)</label><input style={S.inp} value={membersStr} onChange={e=>setMembersStr(e.target.value)} placeholder="Name 1, Name 2, Name 3"/>
              {members.length>0&&<div style={{fontSize:12,color:C.grey,marginTop:4}}>{members.length} members: {members.join(", ")}</div>}
            </div>}
        </div>}

        {step===2&&<div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <p style={{fontSize:12,color:C.grey,margin:0}}>Set Baseline and Target values per KPI for this period</p>
            {prevTracker&&<button style={{...S.btnO,padding:"4px 10px",fontSize:11}} onClick={copyFromPrev}>Copy from {prevTracker.period}</button>}
          </div>
          {profile&&entries.map((e,i)=>{
            const kpi=profile.kpis[e.kpi_index];
            const m=metrics.find(x=>x.id===e.metric_id);
            if(!kpi||!m) return null;
            return <div key={i} style={{marginBottom:10,padding:10,border:`1px solid ${C.brd}`,borderRadius:6}}>
              <div style={{fontWeight:600,color:C.dk,marginBottom:6,fontSize:12}}>{i+1}. {m.name}<span style={{fontWeight:400,color:C.grey,marginLeft:6}}>{kpi.scope||""} ({m.unit}, {m.dir})</span></div>
              {(()=>{const pe=prevTracker?.entries?.find(x=>x.kpi_index===e.kpi_index);return pe?<div style={{fontSize:10,color:C.grey,marginBottom:4}}>prev: base={fmtNum(pe.baseline)}, tgt={fmtNum(pe.target)}, act={fmtNum(pe.actual)}</div>:null;})()}
              {tType==="personal"?
                <div style={{display:"flex",gap:8}}>
                  <div style={{flex:1}}><label style={{...S.lbl,fontSize:10}}>Baseline</label><input type="number" step="any" style={{...S.inp,fontSize:12,padding:"4px 6px"}} value={e.baseline} onChange={ev=>updateEntry(i,"baseline",ev.target.value)}/></div>
                  <div style={{flex:1}}><label style={{...S.lbl,fontSize:10}}>Target</label><input type="number" step="any" style={{...S.inp,fontSize:12,padding:"4px 6px"}} value={e.target} onChange={ev=>updateEntry(i,"target",ev.target.value)}/></div>
                </div>
                :<div>
                  {members.map((mn,mi)=><div key={mi} style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
                    <span style={{fontSize:11,color:C.grey,minWidth:80,flexShrink:0}}>{mn}</span>
                    <div style={{flex:1}}><input type="number" step="any" placeholder="Base" style={{...S.inp,fontSize:11,padding:"3px 5px"}} value={e.memberData?.[mi]?.baseline??""}  onChange={ev=>updateMemberEntry(i,mi,"baseline",ev.target.value)}/></div>
                    <div style={{flex:1}}><input type="number" step="any" placeholder="Target" style={{...S.inp,fontSize:11,padding:"3px 5px"}} value={e.memberData?.[mi]?.target??""} onChange={ev=>updateMemberEntry(i,mi,"target",ev.target.value)}/>{kpi.estimatedTarget&&<div style={{fontSize:10,color:C.grey,marginTop:2}}>Est: {kpi.estimatedTarget}</div>}</div>
                  </div>)}
                </div>}
            </div>;
          })}
        </div>}

        {step===3&&<div>
          <div style={{padding:12,background:C.pl,borderRadius:6,marginBottom:16}}>
            <InfoRow label="Profile" value={`${profile?.id} - ${profile?.role}`}/>
            <InfoRow label="Type" value={tType}/>
            <InfoRow label="Period" value={period}/>
            {tType==="personal"&&<InfoRow label="Name" value={name}/>}
            {tType==="team"&&<InfoRow label="Members" value={members.join(", ")}/>}
            <InfoRow label="KPI Rows" value={entries.length}/>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{background:C.pl}}>
              {["KPI","Weight",tType==="personal"?"Baseline":"Members",tType==="personal"?"Target":""].map((h,hi)=>h?<th key={hi} style={{padding:"6px 8px",textAlign:"left",fontWeight:600,borderBottom:`1px solid ${C.brd}`}}>{h}</th>:null)}
            </tr></thead>
            <tbody>{entries.map((e,i)=>{
              const kpi=profile?.kpis[e.kpi_index];
              const m=metrics.find(x=>x.id===e.metric_id);
              return <tr key={i} style={{borderBottom:`1px solid ${C.brd}`}}>
                <td style={{padding:"6px 8px"}}><strong>{m?.name}</strong>{kpi?.scope?<span style={{color:C.grey}}> / {kpi.scope}</span>:null}</td>
                <td style={{padding:"6px 8px",fontWeight:600}}>{kpi?.weight}%</td>
                <td style={{padding:"6px 8px",fontFamily:"monospace"}}>{tType==="personal"?fmtNum(e.baseline):`${members.length} members`}</td>
                {tType==="personal"&&<td style={{padding:"6px 8px",fontFamily:"monospace"}}>{fmtNum(e.target)}</td>}
              </tr>;
            })}</tbody>
          </table>
        </div>}
      </div>
      <div style={S.mFoot}>
        <button style={S.btnO} onClick={step===0?onClose:()=>setStep(step-1)}>{step===0?"Cancel":"Back"}</button>
        {step<3?<button style={S.btn(C.md)} onClick={()=>{
          if(step===1&&tType==="team"&&members.length>0){
            // Rebuild entries with member data
            setEntries(profile.kpis.map((k,i)=>({
              kpi_index:i,metric_id:k.metric_id,
              memberData:members.map(()=>({baseline:"",target:k.estimatedTarget||"",actual:null}))
            })));
          }
          setStep(step+1);
        }} disabled={!canNext()}>Next</button>
          :<button style={S.btn(C.grn)} onClick={doSave}>Create Tracker</button>}
      </div>
    </div>
  </div>;
}

// ═══════════════════════════════════════════════════════
// MODULE 4: DASHBOARD
// ═══════════════════════════════════════════════════════

function getTrackerScore(tracker) {
  if (tracker.type === "personal") {
    return typeof tracker.totalScore === "number" ? tracker.totalScore : null;
  }
  if (Array.isArray(tracker.totalScore)) {
    const valid = tracker.totalScore.filter(s => typeof s === "number" && !isNaN(s));
    return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
  }
  return null;
}

function hasMissing(tracker) {
  if (tracker.type === "personal") {
    return tracker.entries.some(e => e.actual === null || e.actual === undefined || e.actual === "");
  }
  return tracker.entries.some(e =>
    e.memberData && e.memberData.some(d => d.actual === null || d.actual === undefined || d.actual === "")
  );
}

function DashboardModule({ metrics, profiles, trackers }) {
  const [view, setView] = useState("company");
  const [selBU, setSelBU] = useState(Object.keys(BU_CFG)[0]);
  const [periodFilter, setPeriodFilter] = useState("latest");

  // Extract available periods from trackers, grouped by year
  const periodOptions = useMemo(() => {
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const periods = [...new Set(trackers.map(t => t.period).filter(Boolean))];
    const parsed = periods.map(p => {
      const qm = p.match(/^Q(\d)\s+(\d{4})$/);
      if (qm) return { label: p, year: parseInt(qm[2]), sort: parseInt(qm[2]) * 100 + parseInt(qm[1]) * 25, type: "Quarter" };
      const mm = p.match(/^(\w+)\s+(\d{4})$/);
      if (mm) { const mi = months.indexOf(mm[1]); if (mi >= 0) return { label: p, year: parseInt(mm[2]), sort: parseInt(mm[2]) * 100 + mi, type: "Month" }; }
      return { label: p, year: 0, sort: 0, type: "Other" };
    }).sort((a, b) => b.sort - a.sort);
    const groups = {};
    parsed.forEach(p => { const yr = p.year || "Other"; if (!groups[yr]) groups[yr] = []; groups[yr].push(p); });
    return { all: parsed, groups };
  }, [trackers]);

  // Filter trackers by selected period
  const filteredTrackers = useMemo(() => {
    if (periodFilter === "all") return trackers;
    if (periodFilter === "latest") {
      const byProfile = {};
      trackers.forEach(t => { if (!byProfile[t.profile_id]) byProfile[t.profile_id] = []; byProfile[t.profile_id].push(t); });
      return Object.values(byProfile).map(pts => {
        const sorted = [...pts].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
        return sorted[sorted.length - 1];
      });
    }
    return trackers.filter(t => t.period === periodFilter);
  }, [trackers, periodFilter]);

  const stats = useMemo(() => {
    const buStats = {};
    Object.keys(BU_CFG).forEach(bk => {
      buStats[bk] = { profiles: 0, trackers: 0, scores: [], depts: {}, attention: [] };
    });
    profiles.forEach(p => { if (buStats[p.bu]) buStats[p.bu].profiles++; });
    filteredTrackers.forEach(t => {
      const p = profiles.find(pr => pr.id === t.profile_id);
      if (!p || !buStats[p.bu]) return;
      buStats[p.bu].trackers++;
      const score = getTrackerScore(t);
      if (score !== null) buStats[p.bu].scores.push(score);
      if (!buStats[p.bu].depts[p.dept]) buStats[p.bu].depts[p.dept] = { scores: [], trackers: [], profiles: 0 };
      buStats[p.bu].depts[p.dept].trackers.push(t);
      if (score !== null) buStats[p.bu].depts[p.dept].scores.push(score);
      if ((score !== null && score < 0.7) || hasMissing(t)) {
        buStats[p.bu].attention.push({ tracker: t, profile: p, score, missing: hasMissing(t) });
      }
    });
    profiles.forEach(p => {
      if (buStats[p.bu]?.depts[p.dept]) buStats[p.bu].depts[p.dept].profiles++;
    });

    const bscDist = {};
    BSC.forEach(b => { bscDist[b] = 0; });
    metrics.forEach(m => { if (bscDist[m.bsc] !== undefined) bscDist[m.bsc]++; });

    const weightIssues = profiles.filter(p => {
      const sum = p.kpis.reduce((s, k) => s + (k.weight || 0), 0);
      return Math.abs(sum - 100) > 0.5;
    });

    const coveredDepts = new Set();
    profiles.forEach(p => coveredDepts.add(`${p.bu}::${p.dept}`));
    const allDepts = [];
    Object.entries(BU_CFG).forEach(([bk, cfg]) => cfg.depts.forEach(d => allDepts.push({ bu: bk, dept: d })));
    const uncoveredDepts = allDepts.filter(d => !coveredDepts.has(`${d.bu}::${d.dept}`));

    // Coverage uses ALL trackers regardless of period filter
    const trackerProfiles = new Set(trackers.map(t => t.profile_id));
    const noTrackerProfiles = profiles.filter(p => !trackerProfiles.has(p.id));

    return { buStats, bscDist, weightIssues, uncoveredDepts, noTrackerProfiles, allDepts };
  }, [metrics, profiles, filteredTrackers, trackers]);

  const viewBtns = [
    { id: "company", label: "Company Overview" },
    { id: "bu", label: "BU Detail" },
    { id: "coverage", label: "Coverage & Health" },
  ];

  const cardS = { padding: 16, background: C.wh, border: `1px solid ${C.brd}`, borderRadius: 8 };
  const statNumS = { fontSize: 24, fontWeight: 700, color: C.dk, lineHeight: 1 };
  const statLblS = { fontSize: 11, color: C.grey, marginTop: 4 };

  return <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
    <div style={{ padding: "8px 16px", borderBottom: `1px solid ${C.brd}`, display: "flex", gap: 4, alignItems: "center", background: C.pl, flexShrink: 0 }}>
      {viewBtns.map(v => <button key={v.id} onClick={() => setView(v.id)} style={{
        padding: "6px 14px", border: `1px solid ${view === v.id ? C.md : C.brd}`, borderRadius: 4,
        background: view === v.id ? C.md : C.wh, color: view === v.id ? C.wh : C.bk,
        fontSize: 12, fontWeight: 500, cursor: "pointer"
      }}>{v.label}</button>)}
      {view === "bu" && <select style={{ ...S.sel, padding: "5px 8px", fontSize: 12, width: 160, marginLeft: 8 }}
        value={selBU} onChange={e => setSelBU(e.target.value)}>
        {Object.entries(BU_CFG).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
      </select>}
      {view !== "coverage" && <>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: C.grey, fontWeight: 500 }}>Period:</span>
          <select style={{ ...S.sel, padding: "5px 8px", fontSize: 12, width: 180 }}
            value={periodFilter} onChange={e => setPeriodFilter(e.target.value)}>
            <option value="latest">Latest</option>
            <option value="all">All periods</option>
            {Object.entries(periodOptions.groups).sort(([a],[b]) => Number(b) - Number(a)).map(([yr, items]) =>
              <optgroup key={yr} label={yr}>
                {items.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
              </optgroup>
            )}
          </select>
        </div>
      </>}
    </div>
    <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
      {view === "company" && <DashCompany stats={stats} profiles={profiles} trackers={filteredTrackers} allTrackers={trackers} periodFilter={periodFilter} cardS={cardS} statNumS={statNumS} statLblS={statLblS} />}
      {view === "bu" && <DashBU bu={selBU} stats={stats} profiles={profiles} trackers={filteredTrackers} allTrackers={trackers} metrics={metrics} periodFilter={periodFilter} cardS={cardS} statNumS={statNumS} statLblS={statLblS} />}
      {view === "coverage" && <DashCoverage stats={stats} profiles={profiles} trackers={trackers} cardS={cardS} />}
    </div>
  </div>;
}

function DashCompany({ stats, profiles, trackers, allTrackers, periodFilter, cardS, statNumS, statLblS }) {
  // Trend helper: compare with previous period using ALL trackers
  const buTrends = useMemo(() => {
    const trends = {};
    Object.keys(BU_CFG).forEach(bk => { trends[bk] = { prev: [], curr: [] }; });
    const byProfile = {};
    allTrackers.forEach(t => {
      if (!byProfile[t.profile_id]) byProfile[t.profile_id] = [];
      byProfile[t.profile_id].push(t);
    });
    Object.values(byProfile).forEach(pts => {
      if (pts.length < 2) return;
      const sorted = [...pts].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
      const prev = sorted[sorted.length - 2], curr = sorted[sorted.length - 1];
      const p = profiles.find(pr => pr.id === curr.profile_id);
      if (!p) return;
      const ps = getTrackerScore(prev), cs = getTrackerScore(curr);
      if (ps !== null) trends[p.bu].prev.push(ps);
      if (cs !== null) trends[p.bu].curr.push(cs);
    });
    return trends;
  }, [allTrackers, profiles]);

  const buData = useMemo(() => Object.entries(BU_CFG).map(([bk, cfg]) => {
    const s = stats.buStats[bk];
    const avg = s.scores.length > 0 ? s.scores.reduce((a, b) => a + b, 0) / s.scores.length : null;
    const t = buTrends[bk];
    const prevAvg = t.prev.length > 0 ? t.prev.reduce((a, b) => a + b, 0) / t.prev.length : null;
    const currAvg = t.curr.length > 0 ? t.curr.reduce((a, b) => a + b, 0) / t.curr.length : null;
    const delta = (prevAvg !== null && currAvg !== null) ? currAvg - prevAvg : null;
    return { key: bk, name: cfg.name, avg, profiles: s.profiles, trackers: s.trackers, attention: s.attention.length, delta };
  }), [stats, buTrends]);

  const chartData = buData.filter(d => d.avg !== null).map(d => ({ name: d.name.replace(" BU", ""), score: parseFloat((d.avg * 100).toFixed(1)), raw: d.avg }));

  const totalTrackers = trackers.length;
  const totalProfiles = profiles.length;
  const allScores = trackers.map(getTrackerScore).filter(s => s !== null);
  const companyAvg = allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : null;
  const attentionCount = Object.values(stats.buStats).reduce((s, b) => s + b.attention.length, 0);
  const reportingBUs = buData.filter(d => d.trackers > 0).length;
  const totalBUs = Object.keys(BU_CFG).length;

  // Coverage per BU uses ALL trackers (structural, not period-dependent)
  const coverageData = useMemo(() => Object.entries(BU_CFG).map(([bk, cfg]) => {
    const s = stats.buStats[bk];
    const trackerPids = new Set(allTrackers.filter(t => { const p = profiles.find(pr => pr.id === t.profile_id); return p && p.bu === bk; }).map(t => t.profile_id));
    const pct = s.profiles > 0 ? Math.round(trackerPids.size / s.profiles * 100) : 0;
    return { name: cfg.name.replace(" BU", ""), pct, covered: trackerPids.size, total: s.profiles };
  }), [stats, allTrackers, profiles]);

  // Executive summary
  const periodLabel = periodFilter === "latest" ? "Latest period" : periodFilter === "all" ? "All periods" : periodFilter;
  const trendingUp = buData.filter(d => d.delta !== null && d.delta > 0.01).map(d => d.name.replace(" BU", ""));
  const trendingDown = buData.filter(d => d.delta !== null && d.delta < -0.01).map(d => d.name.replace(" BU", ""));
  const summaryParts = [];
  summaryParts.push(periodLabel);
  summaryParts.push(`${reportingBUs} of ${totalBUs} BUs reporting`);
  if (attentionCount > 0) summaryParts.push(`${attentionCount} need attention`);
  if (trendingUp.length > 0) summaryParts.push(`${trendingUp.join(", ")} trending up`);
  if (trendingDown.length > 0) summaryParts.push(`${trendingDown.join(", ")} trending down`);

  return <div>
    <div style={{ padding: "10px 14px", marginBottom: 16, background: C.pl, borderRadius: 6, border: `1px solid ${C.lt}`, fontSize: 13, color: C.dk }}>
      {summaryParts.join("  /  ")}
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
      <div style={cardS}>
        <div style={statNumS}>{companyAvg !== null ? fmtPct(companyAvg) : "-"}</div>
        <div style={statLblS}>Company Avg Score</div>
        <div style={{ fontSize: 10, color: C.grey, marginTop: 2 }}>{reportingBUs}/{totalBUs} BUs, {totalTrackers}/{totalProfiles} profiles tracked</div>
      </div>
      <div style={cardS}>
        <div style={statNumS}>{totalProfiles}</div>
        <div style={statLblS}>KPI Profiles</div>
      </div>
      <div style={cardS}>
        <div style={statNumS}>{totalTrackers}</div>
        <div style={statLblS}>Active Trackers</div>
      </div>
      <div style={{ ...cardS, borderColor: attentionCount > 0 ? C.ylw : C.brd }}>
        <div style={{ ...statNumS, color: attentionCount > 0 ? C.red : C.grn }}>{attentionCount}</div>
        <div style={statLblS}>Need Attention</div>
      </div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
      <div style={{ ...cardS, padding: 0 }}>
        <div style={{ padding: "12px 16px", fontWeight: 600, fontSize: 13, color: C.dk, borderBottom: `1px solid ${C.brd}` }}>KPI Score by BU</div>
        {chartData.length > 0 ? <div style={{ padding: "8px 8px 4px" }}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.brd} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={[0, 120]} tickFormatter={v => v + "%"} />
              <Tooltip formatter={(v) => v + "%"} />
              <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                {chartData.map((d, i) => <Cell key={i} fill={d.raw >= 1.0 ? C.grn : d.raw >= 0.7 ? C.ylw : C.red} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div> : <div style={{ padding: 32, textAlign: "center", color: C.grey, fontSize: 13 }}>No tracker data available</div>}
      </div>

      <div style={{ ...cardS, padding: 0 }}>
        <div style={{ padding: "12px 16px", fontWeight: 600, fontSize: 13, color: C.dk, borderBottom: `1px solid ${C.brd}` }}>Tracker Coverage by BU</div>
        <div style={{ padding: 12 }}>
          {coverageData.map(d => <div key={d.name} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
              <span style={{ color: C.dk, fontWeight: 500 }}>{d.name}</span>
              <span style={{ color: C.grey }}>{d.covered}/{d.total} profiles</span>
            </div>
            <div style={{ height: 8, background: C.brd, borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: d.pct + "%", background: d.pct >= 80 ? C.grn : d.pct >= 40 ? C.ylw : d.pct > 0 ? C.red : C.brd, borderRadius: 4, transition: "width 0.3s" }} />
            </div>
          </div>)}
        </div>
      </div>
    </div>

    <div style={{ ...cardS, padding: 0 }}>
      <div style={{ padding: "12px 16px", fontWeight: 600, fontSize: 13, color: C.dk, borderBottom: `1px solid ${C.brd}` }}>BU Overview</div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: C.pl }}>
            <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, fontSize: 12, color: C.dk }}>Business Unit</th>
            <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600, fontSize: 12, color: C.dk }}>Avg Score</th>
            <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600, fontSize: 12, color: C.dk }}>Trend</th>
            <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600, fontSize: 12, color: C.dk }}>Profiles</th>
            <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600, fontSize: 12, color: C.dk }}>Trackers</th>
            <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600, fontSize: 12, color: C.dk }}>Attention</th>
          </tr>
        </thead>
        <tbody>
          {buData.map(d => <tr key={d.key} style={{ borderBottom: `1px solid ${C.brd}` }}>
            <td style={{ padding: "8px 12px", fontWeight: 500 }}>{d.name}</td>
            <td style={{ padding: "8px 12px", textAlign: "center" }}>
              {d.avg !== null ? <span style={{ color: indColor(d.avg), fontWeight: 600 }}>{fmtPct(d.avg)}</span> : <span style={{ color: C.grey }}>-</span>}
            </td>
            <td style={{ padding: "8px 12px", textAlign: "center" }}>
              {d.delta !== null ? <span style={{ color: d.delta > 0.01 ? C.grn : d.delta < -0.01 ? C.red : C.grey, fontWeight: 600, fontSize: 12 }}>
                {d.delta > 0.01 ? "+" : ""}{(d.delta * 100).toFixed(1)}%{d.delta > 0.01 ? " ^" : d.delta < -0.01 ? " v" : ""}
              </span> : <span style={{ color: C.grey }}>-</span>}
            </td>
            <td style={{ padding: "8px 12px", textAlign: "center" }}>{d.profiles}</td>
            <td style={{ padding: "8px 12px", textAlign: "center" }}>{d.trackers || <span style={{ color: C.grey }}>0</span>}</td>
            <td style={{ padding: "8px 12px", textAlign: "center" }}>
              {d.attention > 0 ? <Badge bg="#FDEDEC" fg={C.red}>{d.attention}</Badge> : <span style={{ color: C.grey }}>-</span>}
            </td>
          </tr>)}
        </tbody>
      </table>
    </div>

    {Object.values(stats.buStats).some(b => b.attention.length > 0) && <div style={{ ...cardS, padding: 0, marginTop: 16 }}>
      <div style={{ padding: "12px 16px", fontWeight: 600, fontSize: 13, color: C.red, borderBottom: `1px solid ${C.brd}` }}>Attention Needed</div>
      <div style={{ padding: 8 }}>
        {Object.entries(stats.buStats).filter(([, b]) => b.attention.length > 0).map(([bk, b]) =>
          b.attention.map((a, i) => <div key={`${bk}-${i}`} style={{ padding: "6px 10px", marginBottom: 4, borderRadius: 4, background: C.pl, fontSize: 12, display: "flex", gap: 8, alignItems: "center" }}>
            <Badge bg={C.lt} fg={C.dk}>{BU_CFG[bk]?.name}</Badge>
            <span style={{ fontWeight: 500 }}>{a.profile.role}</span>
            <span style={{ color: C.grey }}>{a.tracker.period}</span>
            {a.score !== null && a.score < 0.7 && <Badge bg="#FDEDEC" fg={C.red}>Score {fmtPct(a.score)}</Badge>}
            {a.missing && <Badge bg="#FEF9E7" fg="#B7950B">Missing data</Badge>}
          </div>)
        )}
      </div>
    </div>}
  </div>;
}

function DashBU({ bu, stats, profiles, trackers, allTrackers, metrics, periodFilter, cardS, statNumS, statLblS }) {
  const buS = stats.buStats[bu] || { profiles: 0, trackers: 0, scores: [], depts: {}, attention: [] };
  const avg = buS.scores.length > 0 ? buS.scores.reduce((a, b) => a + b, 0) / buS.scores.length : null;

  const deptData = useMemo(() => {
    return Object.entries(buS.depts).map(([dept, d]) => {
      const dAvg = d.scores.length > 0 ? d.scores.reduce((a, b) => a + b, 0) / d.scores.length : null;
      return { dept, avg: dAvg, trackers: d.trackers.length, profiles: d.profiles };
    }).sort((a, b) => (b.avg || 0) - (a.avg || 0));
  }, [buS]);

  const deptChartData = deptData.filter(d => d.avg !== null).map(d => ({ name: d.dept, score: parseFloat((d.avg * 100).toFixed(1)), raw: d.avg }));

  const buProfiles = profiles.filter(p => p.bu === bu);
  const buTrackers = trackers.filter(t => {
    const p = profiles.find(pr => pr.id === t.profile_id);
    return p && p.bu === bu;
  });
  // All trackers for this BU (for trend computation)
  const buAllTrackers = allTrackers.filter(t => {
    const p = profiles.find(pr => pr.id === t.profile_id);
    return p && p.bu === bu;
  });

  const roleRows = useMemo(() => {
    return buProfiles.map(p => {
      // Use all trackers for trend comparison
      const pAllTrackers = buAllTrackers.filter(t => t.profile_id === p.id).sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
      // Use filtered trackers for display
      const pTrackers = buTrackers.filter(t => t.profile_id === p.id).sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
      const scores = pTrackers.map(t => ({ period: t.period, score: getTrackerScore(t), missing: hasMissing(t) }));
      let delta = null;
      if (pAllTrackers.length >= 2) {
        const prevT = pAllTrackers[pAllTrackers.length - 2], currT = pAllTrackers[pAllTrackers.length - 1];
        const prev = getTrackerScore(prevT), curr = getTrackerScore(currT);
        if (prev !== null && curr !== null) delta = curr - prev;
      }
      return { profile: p, scores, delta };
    });
  }, [buProfiles, buTrackers, buAllTrackers]);

  return <div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
      <div style={cardS}>
        <div style={statNumS}>{avg !== null ? fmtPct(avg) : "-"}</div>
        <div style={statLblS}>{BU_CFG[bu]?.name} Avg Score</div>
      </div>
      <div style={cardS}>
        <div style={statNumS}>{buS.profiles}</div>
        <div style={statLblS}>Profiles</div>
      </div>
      <div style={cardS}>
        <div style={statNumS}>{buS.trackers}</div>
        <div style={statLblS}>Trackers</div>
      </div>
      <div style={cardS}>
        <div style={{ ...statNumS, color: buS.attention.length > 0 ? C.red : C.grn }}>{buS.attention.length}</div>
        <div style={statLblS}>Attention</div>
      </div>
    </div>

    {deptChartData.length > 0 && <div style={{ ...cardS, padding: 0, marginBottom: 16 }}>
      <div style={{ padding: "12px 16px", fontWeight: 600, fontSize: 13, color: C.dk, borderBottom: `1px solid ${C.brd}` }}>Department Scores</div>
      <div style={{ padding: "8px 8px 4px" }}>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={deptChartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.brd} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} domain={[0, 120]} tickFormatter={v => v + "%"} />
            <Tooltip formatter={(v) => v + "%"} />
            <Bar dataKey="score" radius={[4, 4, 0, 0]}>
              {deptChartData.map((d, i) => <Cell key={i} fill={d.raw >= 1.0 ? C.grn : d.raw >= 0.7 ? C.ylw : C.red} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>}

    <div style={{ ...cardS, padding: 0 }}>
      <div style={{ padding: "12px 16px", fontWeight: 600, fontSize: 13, color: C.dk, borderBottom: `1px solid ${C.brd}` }}>Roles & Scores</div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: C.pl }}>
            <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: C.dk }}>Dept</th>
            <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: C.dk }}>Role</th>
            <th style={{ padding: "8px 10px", textAlign: "center", fontWeight: 600, color: C.dk }}>Period(s)</th>
            <th style={{ padding: "8px 10px", textAlign: "center", fontWeight: 600, color: C.dk }}>Score</th>
            <th style={{ padding: "8px 10px", textAlign: "center", fontWeight: 600, color: C.dk }}>Trend</th>
            <th style={{ padding: "8px 10px", textAlign: "center", fontWeight: 600, color: C.dk }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {roleRows.map(r => <tr key={r.profile.id} style={{ borderBottom: `1px solid ${C.brd}` }}>
            <td style={{ padding: "8px 10px" }}>{r.profile.dept}</td>
            <td style={{ padding: "8px 10px", fontWeight: 500 }}>{r.profile.role}{r.profile.team ? ` (${r.profile.team})` : ""}</td>
            <td style={{ padding: "8px 10px", textAlign: "center", color: C.grey }}>
              {r.scores.length > 0 ? r.scores.map(s => s.period).join(", ") : "-"}
            </td>
            <td style={{ padding: "8px 10px", textAlign: "center" }}>
              {r.scores.length > 0 ? <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap" }}>
                {r.scores.map((s, i) => <span key={i} style={{ color: s.score !== null ? indColor(s.score) : C.grey, fontWeight: 600 }}>
                  {s.score !== null ? fmtPct(s.score) : "-"}
                </span>)}
              </div> : <span style={{ color: C.grey }}>No tracker</span>}
            </td>
            <td style={{ padding: "8px 10px", textAlign: "center" }}>
              {r.delta !== null ? <span style={{ color: r.delta > 0.01 ? C.grn : r.delta < -0.01 ? C.red : C.grey, fontWeight: 600, fontSize: 11 }}>
                {r.delta > 0.01 ? "+" : ""}{(r.delta * 100).toFixed(1)}%{r.delta > 0.01 ? " ^" : r.delta < -0.01 ? " v" : ""}
              </span> : <span style={{ color: C.grey }}>-</span>}
            </td>
            <td style={{ padding: "8px 10px", textAlign: "center" }}>
              {r.scores.length === 0 ? <Badge bg={C.lt} fg={C.grey}>No data</Badge>
                : r.scores.some(s => s.missing) ? <Badge bg="#FEF9E7" fg="#B7950B">Incomplete</Badge>
                : r.scores.some(s => s.score !== null && s.score < 0.7) ? <Badge bg="#FDEDEC" fg={C.red}>Below target</Badge>
                : <Badge bg="#EAFAF1" fg={C.grn}>OK</Badge>}
            </td>
          </tr>)}
          {roleRows.length === 0 && <tr><td colSpan={6} style={{ padding: 24, textAlign: "center", color: C.grey }}>No profiles for this BU</td></tr>}
        </tbody>
      </table>
    </div>
  </div>;
}

function DashCoverage({ stats, profiles, trackers, cardS }) {
  const tblHdS = { padding: "8px 10px", textAlign: "left", fontWeight: 600, fontSize: 12, color: C.dk };
  const tblCellS = { padding: "6px 10px", fontSize: 12 };

  const coveragePct = stats.allDepts.length > 0 ? ((stats.allDepts.length - stats.uncoveredDepts.length) / stats.allDepts.length * 100).toFixed(0) : 0;
  const trackerCovPct = profiles.length > 0 ? ((profiles.length - stats.noTrackerProfiles.length) / profiles.length * 100).toFixed(0) : 0;

  return <div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
      <div style={cardS}>
        <div style={{ fontSize: 24, fontWeight: 700, color: C.dk }}>{coveragePct}%</div>
        <div style={{ fontSize: 11, color: C.grey, marginTop: 4 }}>Dept Coverage</div>
      </div>
      <div style={cardS}>
        <div style={{ fontSize: 24, fontWeight: 700, color: C.dk }}>{trackerCovPct}%</div>
        <div style={{ fontSize: 11, color: C.grey, marginTop: 4 }}>Tracker Coverage</div>
      </div>
      <div style={cardS}>
        <div style={{ fontSize: 24, fontWeight: 700, color: stats.weightIssues.length > 0 ? C.ylw : C.grn }}>{stats.weightIssues.length}</div>
        <div style={{ fontSize: 11, color: C.grey, marginTop: 4 }}>Weight Issues</div>
      </div>
      <div style={cardS}>
        <div style={{ fontSize: 24, fontWeight: 700, color: stats.uncoveredDepts.length > 0 ? C.ylw : C.grn }}>{stats.uncoveredDepts.length}</div>
        <div style={{ fontSize: 11, color: C.grey, marginTop: 4 }}>Uncovered Depts</div>
      </div>
    </div>

    {stats.uncoveredDepts.length > 0 && <div style={{ ...cardS, padding: 0, marginBottom: 16 }}>
      <div style={{ padding: "12px 16px", fontWeight: 600, fontSize: 13, color: C.ylw, borderBottom: `1px solid ${C.brd}` }}>Departments Without Profiles</div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr style={{ background: C.pl }}>
          <th style={tblHdS}>BU</th><th style={tblHdS}>Department</th>
        </tr></thead>
        <tbody>
          {stats.uncoveredDepts.map((d, i) => <tr key={i} style={{ borderBottom: `1px solid ${C.brd}` }}>
            <td style={tblCellS}><Badge bg={C.lt} fg={C.dk}>{BU_CFG[d.bu]?.name}</Badge></td>
            <td style={tblCellS}>{d.dept}</td>
          </tr>)}
        </tbody>
      </table>
    </div>}

    {stats.noTrackerProfiles.length > 0 && <div style={{ ...cardS, padding: 0, marginBottom: 16 }}>
      <div style={{ padding: "12px 16px", fontWeight: 600, fontSize: 13, color: C.dk, borderBottom: `1px solid ${C.brd}` }}>Profiles Without Trackers</div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr style={{ background: C.pl }}>
          <th style={tblHdS}>BU</th><th style={tblHdS}>Dept</th><th style={tblHdS}>Role</th><th style={tblHdS}>Period</th>
        </tr></thead>
        <tbody>
          {stats.noTrackerProfiles.map(p => <tr key={p.id} style={{ borderBottom: `1px solid ${C.brd}` }}>
            <td style={tblCellS}><Badge bg={C.lt} fg={C.dk}>{BU_CFG[p.bu]?.name}</Badge></td>
            <td style={tblCellS}>{p.dept}</td>
            <td style={tblCellS}>{p.role}</td>
            <td style={{ ...tblCellS, color: C.grey }}>{p.period}</td>
          </tr>)}
        </tbody>
      </table>
    </div>}

    {stats.weightIssues.length > 0 && <div style={{ ...cardS, padding: 0 }}>
      <div style={{ padding: "12px 16px", fontWeight: 600, fontSize: 13, color: C.ylw, borderBottom: `1px solid ${C.brd}` }}>Weight Validation Issues</div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr style={{ background: C.pl }}>
          <th style={tblHdS}>Profile</th><th style={tblHdS}>Role</th><th style={tblHdS}>Total Weight</th>
        </tr></thead>
        <tbody>
          {stats.weightIssues.map(p => {
            const sum = p.kpis.reduce((s, k) => s + (k.weight || 0), 0);
            return <tr key={p.id} style={{ borderBottom: `1px solid ${C.brd}` }}>
              <td style={tblCellS}>{p.id}</td>
              <td style={tblCellS}>{p.role}</td>
              <td style={{ ...tblCellS, color: C.red, fontWeight: 600 }}>{sum}%</td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>}

    {stats.weightIssues.length === 0 && stats.uncoveredDepts.length === 0 && stats.noTrackerProfiles.length === 0 &&
      <div style={{ textAlign: "center", padding: 40, color: C.grey }}>
        <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.5 }}>OK</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: C.grn }}>All health checks passed</div>
      </div>}
  </div>;
}

// ═══════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════

export default function App() {
  const [metrics,setMetrics]=useState([]); const [profiles,setProfiles]=useState([]);
  const [trackers,setTrackers]=useState([]);
  const [tab,setTab]=useState("map"); const [selMId,setSelMId]=useState(null); const [loading,setLoading]=useState(true);

  useEffect(()=>{(async()=>{
    const sm=await loadS(STORAGE_METRICS,null); const sp=await loadS(STORAGE_PROFILES,null); const st=await loadS(STORAGE_TRACKERS,null);
    setMetrics(sm||SEED_METRICS); setProfiles(sp||SEED_PROFILES); setTrackers(st||SEED_TRACKERS); setLoading(false);
  })();},[]);

  useEffect(()=>{if(!loading)saveS(STORAGE_METRICS,metrics);},[metrics,loading]);
  useEffect(()=>{if(!loading)saveS(STORAGE_PROFILES,profiles);},[profiles,loading]);
  useEffect(()=>{if(!loading)saveS(STORAGE_TRACKERS,trackers);},[trackers,loading]);

  // Initialize seed tracker calculations
  useEffect(()=>{
    if(loading) return;
    setTrackers(prev=>prev.map(t=>{
      const profile=profiles.find(p=>p.id===t.profile_id);
      if(!profile) return t;
      const entries=t.entries.map(e=>{
        const kpi=profile.kpis[e.kpi_index];
        const m=metrics.find(x=>x.id===e.metric_id);
        if(t.type==="personal"){
          const ind=calcIndicator(e.actual,e.baseline,e.target,m?.dir,kpi?.maxIndicator);
          const ws=ind!==null?(ind*(kpi?.weight||0)/100):null;
          return {...e,indicator:ind,weightedScore:ws};
        } else if(e.memberData){
          const md=e.memberData.map(d=>{
            const ind=calcIndicator(d.actual,d.baseline,d.target,m?.dir,kpi?.maxIndicator);
            const ws=ind!==null?(ind*(kpi?.weight||0)/100):null;
            return {...d,indicator:ind,weightedScore:ws};
          });
          return {...e,memberData:md};
        }
        return e;
      });
      let totalScore;
      if(t.type==="personal"){
        const sum=entries.reduce((s,e)=>s+(e.weightedScore||0),0);
        totalScore=Math.min(sum,profile.kpiScoreLimit||1.2);
      } else {
        totalScore=(t.members||[]).map((_,mi)=>{
          const sum=entries.reduce((s,e)=>s+((e.memberData?.[mi]?.weightedScore)||0),0);
          return Math.min(sum,profile.kpiScoreLimit||1.2);
        });
      }
      return {...t,entries,totalScore};
    }));
  },[loading]);

  if(loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",color:C.grey}}>Loading...</div>;

  const tabs=[
    {id:"map",label:"Metric Map",cnt:metrics.length},
    {id:"profiles",label:"KPI Profiles",cnt:profiles.length},
    {id:"tracker",label:"KPI Tracker",cnt:trackers.length},
    {id:"dash",label:"Dashboard",cnt:null},
  ];

  return <div style={{height:"100vh",display:"flex",flexDirection:"column",fontFamily:"system-ui,-apple-system,sans-serif",color:C.bk,background:C.wh}}>
    <div style={{background:C.dk,color:C.wh,padding:"10px 20px",display:"flex",alignItems:"center",gap:16,flexShrink:0}}>
      <div style={{fontSize:16,fontWeight:700,letterSpacing:0.5}}>Devart Metric Hub</div>
      <div style={{display:"flex",gap:2,marginLeft:20}}>
        {tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{
          padding:"6px 14px",border:"none",borderRadius:"4px 4px 0 0",cursor:"pointer",fontSize:13,fontWeight:500,
          background:tab===t.id?C.wh:"transparent",color:tab===t.id?C.dk:"rgba(255,255,255,0.7)"}}>
          {t.label}{t.cnt!==null&&<span style={{marginLeft:4,fontSize:11,opacity:0.7}}>({t.cnt})</span>}
        </button>)}
      </div>
      <div style={{marginLeft:"auto",fontSize:11,opacity:0.5}}>v6.4</div>
    </div>
    <div style={{flex:1,overflow:"hidden"}}>
      {tab==="map"&&<MetricMapModule metrics={metrics} setMetrics={setMetrics} onSelect={setSelMId} selectedId={selMId}/>}
      {tab==="profiles"&&<ProfilesModule profiles={profiles} setProfiles={setProfiles} metrics={metrics}/>}
      {tab==="tracker"&&<TrackerModule trackers={trackers} setTrackers={setTrackers} profiles={profiles} metrics={metrics}/>}
      {tab==="dash"&&<DashboardModule metrics={metrics} profiles={profiles} trackers={trackers}/>}
    </div>
  </div>;
}
