const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: __dirname, encoding: 'utf8' }).trim()
const pdf = fs.readFileSync(path.join(root, 'out/ddirori/studio-r3-score-transfer/Studio-R3-Practice.pdf'))
http.createServer((request, response) => {
  const route = new URL(request.url, 'http://127.0.0.1').pathname
  if (route === '/') {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
    response.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Studio PDF handoff QA</title><h1>Studio PDF handoff QA</h1><p>Generated two-page score. Local test transport only.</p><p><a href="/Studio-R3-Practice.pdf" download="Studio-R3-Practice.pdf">Download Studio-R3-Practice.pdf</a></p>')
    return
  }
  if (route !== '/Studio-R3-Practice.pdf') {
    response.writeHead(404); response.end(); return
  }
  response.writeHead(200, { 'Content-Type': 'application/pdf', 'Content-Length': pdf.length,
    'Content-Disposition': 'attachment; filename="Studio-R3-Practice.pdf"', 'Cache-Control': 'no-store' })
  response.end(pdf)
  const entry = { at: new Date().toISOString(), method: request.method, file: 'Studio-R3-Practice.pdf', bytes: pdf.length }
  fs.appendFileSync(path.join(__dirname, 'score-downloads.jsonl'), JSON.stringify(entry) + '\n')
  console.log(JSON.stringify(entry))
}).listen(8867, '127.0.0.1', () => console.log('Dedicated synthetic PDF download: http://127.0.0.1:8867/Studio-R3-Practice.pdf'))
