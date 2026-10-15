import urllib.request, urllib.error, http.cookiejar, json, base64
base='http://127.0.0.1:5173'
jar=http.cookiejar.CookieJar(); client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
def request(path, data=None, headers=None, auth=True, method=None):
 req=urllib.request.Request(base+path,data=data,headers=headers or {},method=method)
 try:
  r=(client if auth else urllib.request.build_opener()).open(req)
  return r.status,r.read()
 except urllib.error.HTTPError as e:return e.code,e.read()
assert request('/api/health',auth=False)[0]==401
assert request('/api/files?id=missing',auth=False)[0]==401
request('/signin-with-chatgpt?return_to=/')
status,raw=request('/api/health');assert status==200;original=json.loads(raw)
status,_=request('/api/health',json.dumps({'state':original['state'],'revision':original['revision']}).encode(),{'Content-Type':'application/json'},method='PUT');assert status==200
status,_=request('/api/health',json.dumps(original).encode(),{'Content-Type':'application/json'},method='PUT');assert status==409
status,_=request('/api/health',b'{bad json',{'Content-Type':'application/json'},method='PUT');assert status==400
status,_=request('/api/health',b'{}',{'Content-Type':'application/json','Origin':'https://untrusted.example'},method='PUT');assert status==403
boundary='VesselTestBoundary'
png=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=')
body=(f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="fictional-test.png"\r\nContent-Type: image/png\r\n\r\n').encode()+png+(f'\r\n--{boundary}--\r\n').encode()
status,raw=request('/api/files',body,{'Content-Type':'multipart/form-data; boundary='+boundary},method='POST');assert status==200,(status,raw)
f=json.loads(raw);status,content=request('/api/files?id='+f['id']);assert status==200 and content==png
assert request('/api/files?id='+f['id'],auth=False)[0]==401
print('PASS: authentication, record round-trip, stale-write protection, malformed input, origin check, attachment round-trip, anonymous attachment denial')
