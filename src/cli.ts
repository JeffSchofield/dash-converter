#!/usr/bin/env node
// @ts-ignore
import { DASHConverter } from '../dist'
import { join, parse } from 'path';
import { ensureDir, readdir, stat, writeFile } from 'fs-extra'

const CWD = process.cwd()

const config_path = join(CWD, 'config.json')
const input_dir = join(CWD, 'input')
const output_dir = join(CWD, 'output')

const default_config_file = {
	"audio_formats": [
		{ "name": "192", "args": { "b:a": "192k", "ar": 48000, "ac": 2 } },
		{ "name": "128", "args": { "b:a": "128k", "ar": 48000, "ac": 2 } }
	],
	"video_formats": [
		{
			"name": "5800",
			"args": {
				"crf": 22,
				"b:v": "5800k",
				"maxrate": "5800k",
				"bufsize": "12000k"
			}
		},
		{
			"name": "4300",
			"args": {
				"b:v": "4300k",
				"maxrate": "4300k",
				"bufsize": "8600k"
			}
		},
		{
			"name": "3000",
			"args": {
				"b:v": "3000k",
				"maxrate": "3000k",
				"bufsize": "6000k",
				"vf": "scale=-2:720"
			}
		},
		{
			"name": "2350",
			"args": {
				"b:v": "2350k",
				"maxrate": "2350k",
				"bufsize": "4700k",
				"vf": "scale=-2:720"
			}
		},
		{
			"name": "1750",
			"args": {
				"b:v": "1750k",
				"maxrate": "1750k",
				"bufsize": "3500k",
				"vf": "scale=-2:480"
			}
		},
		{
			"name": "750",
			"args": {
				"b:v": "750k",
				"maxrate": "750k",
				"bufsize": "1500k",
				"vf": "scale=-2:384"
			}
		},
		{
			"name": "560",
			"args": {
				"b:v": "560k",
				"maxrate": "560k",
				"bufsize": "1120k",
				"vf": "scale=-2:384"
			}
		},
		{
			"name": "375",
			"args": {
				"b:v": "375k",
				"maxrate": "375k",
				"bufsize": "750k",
				"vf": "scale=-2:288"
			}
		},
		{
			"name": "235",
			"args": {
				"b:v": "235k",
				"maxrate": "235k",
				"bufsize": "470k",
				"vf": "scale=-2:240"
			}
		}
	]
}

async function init() {
	console.log('Initializing DASH converter...')

	try {
		await stat(input_dir) // Check if the input directory exists, error if it doesn't
	} catch(e) {
		throw new Error(`Input directory '${ input_dir }' does not exist!`)
	}

	await ensureDir(output_dir) // Make sure an output directory exists

	let config:object
	try {
		config = require(config_path)
		if (!config) throw new Error('Broken config')
	} catch(e) {
		config = {...default_config_file}
		await writeFile(config_path, JSON.stringify(config, undefined, '\t'))
	}

	const dash_converter = new DASHConverter(config)
	if (process.argv.includes('-hwaccel')) dash_converter.hwaccel = true

	let files = await readdir(input_dir)
	let conversions:Promise<boolean>[] = []
	for (let file of files) {
		const file_path = join(input_dir, file)
		conversions.push(dash_converter.convert(file_path, output_dir))
	}

	await Promise.allSettled(conversions)
	console.log('DASH Converter finished.')
}

init().catch(e => console.error(`DASH Converter Failed: ${ e }`))
