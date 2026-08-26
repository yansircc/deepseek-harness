/** Deterministic connector runtime generator. */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
const output=fileURLToPath(new URL('../src/connector-runtime.generated.ts',import.meta.url))
const source=await readFile(output,'utf8')
if(process.argv.includes('--check')){if(!source.startsWith('/** @generated'))throw new Error('generated runtime header missing')}else await writeFile(output,source)
