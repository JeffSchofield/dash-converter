import { spawn, spawnSync } from 'child_process'
import { objectToArgs } from './utils'
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';

const command = () => {
	let command = [process.env.MP4BOX, 'mp4box', './mp4box'].reduce((process, source) => {
		if (process) return process
		if (source) spawnSync(source, ['-h'], { windowsHide: true }).error ? undefined : source
	})
	if (!command) throw new Error('MP4box not found!')
	return command
}

export interface MP4BoxDashOptions {
	'dash'?:number|string
	'frag'?:number|string
	'fps'?:number|string
	'segment-name'?:string,
	'out'?:string
	'log'?:string
}

const DEFAULT_OPTIONS = { dash: 4000, frag: 4000, fps: 24 }

export function MP4BoxDash({ out, log, ...options }:MP4BoxDashOptions = { out: 'test' }, streams:string[] = []) {
	const args = objectToArgs(Object.assign(DEFAULT_OPTIONS, options))

	return new Promise((res, rej) => {
		let child = spawn(command(), args.concat(streams, ['-out', out!]))

		if (log) {
			pipeline(
				child.stderr,
				createWriteStream(log)
			)
		}

		child.on('error', rej)
		child.on('close', res)
		child.on('exit', res)
	})
}