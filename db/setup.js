import {readFile} from 'node:fs/promises';
import pg from 'pg';
if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL təyin edilməyib. Node 22: node --env-file=.env db/setup.js');
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
try {await pool.query(await readFile(new URL('./schema.sql',import.meta.url),'utf8')); console.log('Database hazırdır.');} finally {await pool.end();}
