"""Local demo only: validate complete profile payloads without changing real entries."""
import urllib.request,urllib.error,http.cookiejar,json,uuid
base='http://127.0.0.1:5173'
client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
def req(path,data=None,method=None):
 body=None if data is None else json.dumps(data).encode()
 r=client.open(urllib.request.Request(base+path,data=body,headers={'Content-Type':'application/json'} if body else {},method=method))
 return json.load(r)
client.open(base+'/signin-with-chatgpt?return_to=/').read()
assert req('/api/session')['mode']=='demo','This check may only use local demo storage.'
key='qa-'+str(uuid.uuid4())
def change(fn):
 for _ in range(3):
  old=req('/api/health');fn(old['state'])
  try:return req('/api/health',old,'PUT')
  except urllib.error.HTTPError as e:
   if e.code!=409:raise
 raise RuntimeError('Concurrent saves prevented the check')
p={'id':key,'name':'Fictional QA profile','dob':'','relationship':'You','role':'Owner','monitoring':True,
 'records':[{'id':'doc','category':'Laboratory','title':'Fictional CBC','date':'2026-10-16','facility':'Test only','notes':'QA fixture','reviewed':True,'labs':[{'name':'Hemoglobin','value':'12','unit':'g/dL','low':'12','high':'16'}]}],
 'history':[{'id':'history','kind':'Allergy','title':'Fictional allergy','details':'Test only','date':'','facility':'','source':'Patient reported'}],
 'medicines':[{'id':'med','name':'Fictional medicine','dose':'Test dose','frequency':'Test frequency','start':'','end':'','kind':'Other','status':'Unconfirmed'}],
 'readings':[{'id':'reading','type':'Blood pressure','value':'120/70','unit':'mmHg','date':'2026-10-16T09:00:00+08:00','note':'Test only','author':'QA'}],
 'vaccines':[{'id':'vaccine','name':'Fictional vaccine','date':'2026-10-16','dose':'Test','facility':'Test only','due':'','notes':'Test only','lotNumber':'QA-LOT'}],
 'contacts':[{'id':'contact','name':'Fictional doctor','specialty':'Test specialty','secretary':'','phone':'','address':'','hours':'By appointment'}]}
try:
 change(lambda state:state['profiles'].append(p))
 saved=next(x for x in req('/api/health')['state']['profiles'] if x['id']==key)
 for field in ['name','dob','records','history','medicines','readings','vaccines','contacts']:assert saved[field]==p[field],field
 def edit(state):
  x=next(x for x in state['profiles'] if x['id']==key);x['vaccines'][0]['lotNumber']='QA-UPDATED';x['readings'][0]['note']='Updated test context'
 change(edit)
 saved=next(x for x in req('/api/health')['state']['profiles'] if x['id']==key)
 assert saved['vaccines'][0]['lotNumber']=='QA-UPDATED' and saved['readings'][0]['note']=='Updated test context'
 print('PASS: profile, lab values, history, medications, monitoring, vaccine lot, contacts; save/reload/edit round-trips')
finally:
 change(lambda state:state.update(profiles=[x for x in state['profiles'] if x['id']!=key]))
 assert not any(x['id']==key for x in req('/api/health')['state']['profiles'])
 print('Removed only the temporary QA profile; existing profiles preserved.')
