// A deterministic review tool for course events. It never executes pasted code.
export function auditEventPayload(input){
 const rows=Array.isArray(input)?input:[input],issues=[],ids=new Set(),purchases=new Set();
 const problem=(row,message)=>issues.push({row:row+1,message});
 if(!rows.length||rows.length>300)return{passed:false,issues:[{row:0,message:'Supply between 1 and 300 events.'}],checked:0};
 const commerce=new Set(['view_item_list','select_item','view_item','add_to_wishlist','add_to_cart','remove_from_cart','view_cart','begin_checkout','add_shipping_info','add_payment_info','purchase','refund']);
 for(let n=0;n<rows.length;n++){
  const e=rows[n];if(!e||typeof e!=='object'||Array.isArray(e)){problem(n,'Event must be an object.');continue;}
  if(typeof e.event!=='string'||!e.event.trim())problem(n,'Missing event name.');
  if(e.event_id){if(ids.has(e.event_id))problem(n,'Repeated event_id: possible duplicate emission.');ids.add(e.event_id);}
  const visit=(v,depth=0)=>{if(!v||typeof v!=='object'||depth>8)return;for(const[k,x]of Object.entries(v)){if(/^(email|phone|phone_number|address|customer|customer_name|card_number|cvv|cvc|demo_number|demo_name|user_data)$/i.test(k))problem(n,'Private field found: '+k+'. Remove it from the event.');if(typeof x==='object')visit(x,depth+1);}};visit(e);
  if(!commerce.has(e.event))continue;
  const ec=e.ecommerce;if(!ec||typeof ec!=='object'){problem(n,'Missing ecommerce object.');continue;}
  if(ec.currency!=='EGP')problem(n,'This store uses currency EGP.');
  if(ec.value!==undefined&&(typeof ec.value!=='number'||!Number.isFinite(ec.value)||ec.value<0))problem(n,'value must be a non-negative number, not a string.');
  if(!Array.isArray(ec.items)||!ec.items.length){problem(n,'Supply a non-empty items array.');continue;}
  let sum=0,canSum=true;
  for(const it of ec.items){if(!it||typeof it!=='object'){problem(n,'Every item must be an object.');canSum=false;continue;}if(!it.item_id)problem(n,'Missing stable item_id.');if(!it.item_name)problem(n,'Missing item_name.');const q=it.quantity??1;if(!Number.isInteger(q)||q<1){problem(n,'Item quantity must be a positive integer.');canSum=false;}if(typeof it.price!=='number'||!Number.isFinite(it.price)||it.price<0){problem(n,'Item price must be a non-negative number.');canSum=false;}else sum+=it.price*q;}
  if(['purchase','refund'].includes(e.event)&&typeof ec.value!=='number')problem(n,'Purchase and refund require a numeric merchandise value.');
  if(['purchase','refund'].includes(e.event)&&!ec.transaction_id)problem(n,'Missing original transaction_id.');
  if(e.event==='purchase'&&ec.transaction_id){if(purchases.has(ec.transaction_id))problem(n,'Duplicate purchase transaction_id in this input.');purchases.add(ec.transaction_id);}
  if(canSum&&typeof ec.value==='number'&&Math.abs(sum-ec.value)>.02)problem(n,'Item price × quantity does not reconcile with merchandise value. Keep shipping separate.');
 }
 return{passed:issues.length===0,issues,checked:rows.length};
}
