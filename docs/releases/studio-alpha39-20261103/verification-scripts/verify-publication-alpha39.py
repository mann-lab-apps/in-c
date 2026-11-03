import subprocess,json,hashlib
from pathlib import Path
repo="mann-lab-apps/in-c"
tag="v0.1.0-alpha.39"
out=Path("out/release-qa/published-alpha39")
out.mkdir(exist_ok=True)
def gh(*args,timeout=120):
 return subprocess.check_output(["gh",*args],timeout=timeout)
data=json.loads(gh("api",f"repos/{repo}/releases/tags/{tag}"))
assert data["tag_name"]==tag and not data["draft"] and data["prerelease"]
expected={"SHA256SUMS.txt","Ddirori-Studio-0.1.0-alpha.39-mac-universal.dmg","Ddirori-Studio-0.1.0-alpha.39-mac-universal.zip","Ddirori-Studio-0.1.0-alpha.39-windows-x64-setup.exe","Ddirori-Studio-0.1.0-alpha.39-windows-x64-portable.exe","Ddirori-Studio-0.1.0-alpha.39-linux-x86_64.AppImage"}
actual={a["name"] for a in data["assets"]}
assert actual==expected,(actual,expected)
(out/"release-api.json").write_text(json.dumps(data,indent=2)+"\n")
gh("release","download",tag,"--repo",repo,"--dir",str(out),timeout=1200)
checks={}
for line in (out/"SHA256SUMS.txt").read_text().splitlines():
 digest,name=line.split(maxsplit=1);checks[name.lstrip("*")]=digest
assert set(checks)==expected-{"SHA256SUMS.txt"}
results=[]
for asset in data["assets"]:
 p=out/asset["name"]
 with p.open("rb") as f:h=hashlib.file_digest(f,"sha256").hexdigest()
 assert p.stat().st_size==asset["size"]
 if asset.get("digest"):assert asset["digest"]=="sha256:"+h
 if asset["name"] in checks:assert checks[asset["name"]]==h
 results.append({"name":asset["name"],"bytes":p.stat().st_size,"sha256":h,"url":asset["browser_download_url"]})
report={"tag":tag,"url":data["html_url"],"publishedAt":data["published_at"],"prerelease":True,"draft":False,"allDownloadsAndChecksumsVerified":True,"assets":results}
Path("docs/releases/studio-alpha39-20261103/publication.json").write_text(json.dumps(report,indent=2)+"\n")
print(json.dumps(report,indent=2))
