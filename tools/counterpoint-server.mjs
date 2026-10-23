import { createHash, randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  stat,
  writeFile
} from 'node:fs/promises'
import { createServer } from 'node:http'
import { basename, extname, join, resolve, sep } from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const siteRoot = resolve(repoRoot, 'site')
const workRoot = resolve(repoRoot, '.tmp/counterpoint')
const port = Number(process.env.COUNTERPOINT_PORT ?? 4174)
const maxUploadBytes = 15 * 1024 * 1024
const jobs = new Map()

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.json', 'application/json; charset=utf-8'],
  ['.xml', 'application/xml; charset=utf-8'],
  ['.musicxml', 'application/vnd.recordare.musicxml+xml; charset=utf-8'],
  ['.mxl', 'application/vnd.recordare.musicxml']
])

const allowedInputs = new Set(['.pdf', '.png', '.jpg', '.jpeg'])

const sendJson = (response, statusCode, body) => {
  response.writeHead(statusCode, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8'
  })
  response.end(JSON.stringify(body))
}

const sendText = (response, statusCode, body) => {
  response.writeHead(statusCode, {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'text/plain; charset=utf-8'
  })
  response.end(body)
}

const readJsonBody = async (request) => {
  const chunks = []
  let length = 0
  for await (const chunk of request) {
    length += chunk.length
    if (length > maxUploadBytes * 1.4) {
      throw new Error('업로드가 너무 큽니다. 15MB 이하 파일로 테스트해 주세요.')
    }
    chunks.push(chunk)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

const safeFilename = (filename) => {
  const clean = basename(String(filename || 'score.pdf')).replace(/[^a-zA-Z0-9._-]/g, '-')
  return clean || 'score.pdf'
}

const estimatePages = (buffer, extension) => {
  if (extension !== '.pdf') return 1
  const matches = buffer.toString('latin1').match(/\/Type\s*\/Page\b/g)
  return Math.max(1, matches?.length ?? 1)
}

const escapeXml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const createMockMusicXml = ({ sourceName, checksum }) => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <work>
    <work-title>Counterpoint mock import</work-title>
  </work>
  <movement-title>${escapeXml(sourceName)}</movement-title>
  <identification>
    <creator type="software">Counterpoint local prototype</creator>
    <encoding>
      <software>Counterpoint mock adapter</software>
    </encoding>
    <miscellaneous>
      <miscellaneous-field name="source-checksum">${checksum}</miscellaneous-field>
    </miscellaneous>
  </identification>
  <part-list>
    <score-part id="P1">
      <part-name>Imported staff</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key>
          <fifths>0</fifths>
        </key>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
        <clef>
          <sign>G</sign>
          <line>2</line>
        </clef>
      </attributes>
      <note>
        <pitch>
          <step>C</step>
          <octave>4</octave>
        </pitch>
        <duration>4</duration>
        <type>whole</type>
      </note>
    </measure>
  </part>
</score-partwise>
`

const findOutputFile = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true })
  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      const nested = await findOutputFile(path)
      if (nested) return nested
    }
    if (['.mxl', '.musicxml', '.xml'].includes(extname(entry.name).toLowerCase())) {
      return path
    }
  }
  return undefined
}

const runProcess = (command, args, cwd) =>
  new Promise((resolveProcess, rejectProcess) => {
    const child = spawn(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => {
      stdout += chunk
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk
    })
    child.on('error', rejectProcess)
    child.on('close', (code) => {
      if (code === 0) {
        resolveProcess({ stdout, stderr })
        return
      }
      rejectProcess(new Error(stderr || stdout || `Audiveris exited with code ${code}`))
    })
  })

const runAudiveris = async ({ inputPath, jobDir }) => {
  const audiverisBin = process.env.AUDIVERIS_BIN
  if (!audiverisBin) return undefined

  const outputDir = join(jobDir, 'audiveris-output')
  await mkdir(outputDir, { recursive: true })
  await runProcess(audiverisBin, ['-batch', '-export', '-output', outputDir, inputPath], jobDir)
  const audiverisOutput = await findOutputFile(outputDir)
  if (!audiverisOutput) {
    throw new Error('Audiveris completed but no MusicXML/MXL output was found.')
  }

  return audiverisOutput
}

const processJob = async (job) => {
  job.status = 'processing'
  job.updatedAt = new Date().toISOString()
  try {
    const audiverisOutput = await runAudiveris(job)
    if (audiverisOutput) {
      const outputFilename = `${job.id}${extname(audiverisOutput).toLowerCase()}`
      const outputPath = join(job.jobDir, outputFilename)
      await copyFile(audiverisOutput, outputPath)
      job.status = 'complete'
      job.outputPath = outputPath
      job.report = {
        pages: job.pages,
        engine: 'Audiveris CLI',
        warnings: ['Audiveris 결과는 원본 악보와 대조해 검수해야 합니다.'],
        outputFilename,
        mode: 'audiveris'
      }
      return
    }

    const outputFilename = `${job.id}.musicxml`
    const outputPath = join(job.jobDir, outputFilename)
    const checksum = createHash('sha256').update(await readFile(job.inputPath)).digest('hex')
    await writeFile(
      outputPath,
      createMockMusicXml({ sourceName: job.sourceName, checksum }),
      'utf8'
    )
    job.status = 'complete'
    job.outputPath = outputPath
    job.report = {
      pages: job.pages,
      engine: 'Counterpoint mock adapter',
      warnings: [
        'AUDIVERIS_BIN이 설정되지 않아 mock MusicXML을 생성했습니다.',
        '이 파일은 UI 플로우 검증용이며 실제 OMR 결과가 아닙니다.'
      ],
      outputFilename,
      mode: 'mock'
    }
  } catch (error) {
    job.status = 'failed'
    job.error = error instanceof Error ? error.message : 'Unknown conversion error'
    job.report = {
      pages: job.pages,
      engine: process.env.AUDIVERIS_BIN ? 'Audiveris CLI' : 'Counterpoint mock adapter',
      warnings: [job.error],
      outputFilename: '',
      mode: process.env.AUDIVERIS_BIN ? 'audiveris' : 'mock'
    }
  } finally {
    job.updatedAt = new Date().toISOString()
  }
}

const createJob = async (request, response) => {
  try {
    const body = await readJsonBody(request)
    const filename = safeFilename(body.filename)
    const extension = extname(filename).toLowerCase()
    if (!allowedInputs.has(extension)) {
      sendJson(response, 400, { error: 'PDF, JPG, PNG 파일만 업로드할 수 있습니다.' })
      return
    }

    const buffer = Buffer.from(String(body.dataBase64 ?? ''), 'base64')
    if (!buffer.length || buffer.length > maxUploadBytes) {
      sendJson(response, 400, { error: '업로드 파일은 15MB 이하이어야 합니다.' })
      return
    }

    const id = randomUUID()
    const jobDir = join(workRoot, id)
    await mkdir(jobDir, { recursive: true })
    const inputPath = join(jobDir, `input${extension}`)
    await writeFile(inputPath, buffer)

    const now = new Date().toISOString()
    const job = {
      id,
      status: 'queued',
      sourceName: filename,
      inputPath,
      jobDir,
      pages: estimatePages(buffer, extension),
      createdAt: now,
      updatedAt: now,
      report: {
        pages: estimatePages(buffer, extension),
        engine: process.env.AUDIVERIS_BIN ? 'Audiveris CLI' : 'Counterpoint mock adapter',
        warnings: [],
        outputFilename: '',
        mode: process.env.AUDIVERIS_BIN ? 'audiveris' : 'mock'
      }
    }
    jobs.set(id, job)
    sendJson(response, 202, serializeJob(job))
    setTimeout(() => processJob(job), 160)
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : '잘못된 업로드 요청입니다.'
    })
  }
}

const serializeJob = (job) => ({
  id: job.id,
  status: job.status,
  sourceName: job.sourceName,
  createdAt: job.createdAt,
  updatedAt: job.updatedAt,
  error: job.error,
  report: job.report
})

const handleDownload = async (job, response) => {
  if (job.status !== 'complete' || !job.outputPath) {
    sendJson(response, 409, { error: '아직 다운로드할 결과가 없습니다.' })
    return
  }

  const extension = extname(job.outputPath).toLowerCase()
  const filename = job.report.outputFilename
  response.writeHead(200, {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': mimeTypes.get(extension) ?? 'application/octet-stream',
    'Content-Disposition': `attachment; filename="${filename}"`
  })
  createReadStream(job.outputPath).pipe(response)
}

const serveStatic = async (pathname, response) => {
  const route = pathname === '/' ? '/counterpoint.html' : pathname
  const decoded = decodeURIComponent(route)
  const path = resolve(siteRoot, `.${decoded}`)
  if (!path.startsWith(`${siteRoot}${sep}`) && path !== siteRoot) {
    sendText(response, 403, 'Forbidden')
    return
  }

  try {
    const fileStat = await stat(path)
    if (!fileStat.isFile()) throw new Error('Not a file')
    response.writeHead(200, {
      'Content-Type': mimeTypes.get(extname(path).toLowerCase()) ?? 'application/octet-stream'
    })
    createReadStream(path).pipe(response)
  } catch {
    sendText(response, 404, 'Not found')
  }
}

const server = createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {})
    return
  }

  const url = new URL(request.url ?? '/', `http://${request.headers.host}`)

  if (request.method === 'POST' && url.pathname === '/api/counterpoint/jobs') {
    await createJob(request, response)
    return
  }

  const jobMatch = url.pathname.match(/^\/api\/counterpoint\/jobs\/([^/]+)(\/download)?$/)
  if (request.method === 'GET' && jobMatch) {
    const job = jobs.get(jobMatch[1])
    if (!job) {
      sendJson(response, 404, { error: 'job을 찾을 수 없습니다.' })
      return
    }
    if (jobMatch[2]) {
      await handleDownload(job, response)
      return
    }
    sendJson(response, 200, serializeJob(job))
    return
  }

  if (request.method === 'GET') {
    await serveStatic(url.pathname, response)
    return
  }

  sendText(response, 405, 'Method not allowed')
})

await mkdir(workRoot, { recursive: true })
server.listen(port, '127.0.0.1', () => {
  console.log(`Counterpoint local server: http://127.0.0.1:${port}/counterpoint.html`)
  console.log(
    process.env.AUDIVERIS_BIN
      ? `Audiveris adapter enabled: ${process.env.AUDIVERIS_BIN}`
      : 'Audiveris adapter disabled; using mock MusicXML output.'
  )
})
