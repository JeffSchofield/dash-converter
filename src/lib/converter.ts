import { parse, join } from 'path'
import queue, { QueueWorker } from 'queue'
import { FFmpeg } from 'prism-media'
import { objectToArgs } from './utils'
import { pipeline } from 'stream/promises'
import { createReadStream, createWriteStream } from 'fs'
import { spawn } from 'child_process'
import { ensureDir, stat } from 'fs-extra'
import ffprobe from 'ffprobe'
import ffprobe_static from 'ffprobe-static'
import { MP4BoxDash } from './mp4box-dash'

const PatchedFFmpeg = Object.assign(FFmpeg, {
	create({ args, shell }:{ args:string[], shell?:boolean } = { args: [], shell:false }) {
		if (!args.includes('-i')) args.unshift('-i', '-')
		return spawn(FFmpeg.getInfo().command, args, { windowsHide: true, shell })
	}
})

const MEDIA_EXTENSIONS = ['.mp4', '.mov', '.qt', '.avi', '.webm', '.mkv', '.vob', '.ogv', '.ogg', '.ts', '.m2ts', '.mts', '.wmv', '.mpg', '.mpeg', '.3gp']
export class DASHConverter {
	public hwaccel = false

	private dash_queue = queue({ results: [] })
	private transcode_queue = queue({ results: [] })

	private config:DASHConverterConfig = {
		default_audio_args: {
			'c:a': 'aac',
			'b:a': '192k',
			'vn': undefined
		},
		default_video_args: {
			'c:v': 'libx264',
			'profile:v': 'main',
			'crf': 23,
			'preset': "slow",
			'pix_fmt': "yuv420p",
			'an': undefined
		},
		audio_formats: [],
		video_formats: []
	}

	constructor(config:Partial<DASHConverterConfig> = {}) {
		const { default_audio_args, default_video_args, ...remaining_config } = config
		Object.assign(this.config.default_audio_args, default_audio_args) // Merge default audio arguments
		Object.assign(this.config.default_video_args, default_video_args) // Merge default video arguments
		Object.assign(this.config, remaining_config) // Replace default config values with remaining passed config values

		this.dash_queue.autostart = true
		this.dash_queue.concurrency = 1
		this.dash_queue.setMaxListeners(Number.POSITIVE_INFINITY)

		this.transcode_queue.autostart = true
		this.transcode_queue.concurrency = 2
		this.transcode_queue.setMaxListeners(Number.POSITIVE_INFINITY)
	}

	convert(input_file:string, output_path:string):Promise<boolean> {
		const { audio_formats, video_formats } = this.config
		const { name, ext } = parse(input_file)

		if (MEDIA_EXTENSIONS.includes(ext)) { // Make sure the file has a supported media extension
			return new Promise((resolve, reject) => {
				this.dash_queue.push(async () => { // Add our main dash job to the queue
					console.log(`Converting ${ name }...`)
					output_path = join(output_path, name)
					let frame_rate = 24

					let video_streams:any[] = []
					let audio_streams:any[] = []
					let subtitle_streams:any[] = []

					const { streams } = await ffprobe(input_file, { path: ffprobe_static.path })
					for (let stream of streams) {
						if (stream.codec_type == 'video') {
							const { r_frame_rate } = stream
							frame_rate = r_frame_rate.split('/').reduce<number>((result, n) => result ? result/n : n)
							video_streams.push({...stream, frame_rate })
						}
						else if (stream.codec_type == 'audio') audio_streams.push(stream)
						else if (stream.codec_type == 'subtitle') subtitle_streams.push(stream)
					}

					try {
						await ensureDir(output_path) // Create the output path to store transcoded files
						await ensureDir(join(output_path, 'dash')) // Create dash folder to store resulting dash segments
						await ensureDir(join(output_path, 'logs')) // Make sure a logs folder exists
					} catch(e) {
						console.error(e)
					}

					// Main Dash Job
					//
					// Split into 2 main parts:
					// 1. Create transcode jobs for each format in the config
					//

					const transcode_jobs:Promise<any>[] = []

					for (let video_format of video_formats) {
						const { name: format_name, args } = video_format
						const output_file = join(output_path, `${name}${ format_name ? '_'+format_name : '' }.mp4`)

						const transcode_job = this.createVideoTranscode({
							frame_rate,
							input_file,
							output_file,
							args
						})

						transcode_jobs.push(this.createTranscodeJob(transcode_job))
					}

					for (let audio_format of audio_formats) {
						const { name: format_name, args } = audio_format
						const output_file = join(output_path, `${name}${ format_name ? '_'+format_name : '' }.m4a`)

						const transcode_job = this.createAudioTranscode({
							input_file,
							output_file,
							args
						})

						transcode_jobs.push(this.createTranscodeJob(transcode_job))
					}

					//
					// 2. When all of the transcode jobs are completed, use MP4Box to package the transcoded content
					//

					let results = await Promise.allSettled(transcode_jobs)

					for (let result of results) {
						if (result.status == "rejected") {
							console.log(`There were errors during the transcoding of ${ name }. Cannot finish conversion.`)
							return reject()
						}
					}

					console.log(`Transcoding of ${ name } completed successfully. Packaging into DASH...`)
					await MP4BoxDash({
						'dash': 4000,
						'frag': 4000,
						'fps': frame_rate,
						'segment-name': "segment_$RepresentationID$_",
						'out': join(output_path, 'dash', 'playlist.m3u8:dual'),
						'log': join(output_path, 'logs', 'mp4box-dash.log'),
					}, results.reduce<string[]>((results, job) => job.status == 'fulfilled' ? results.concat([`${job.value.output_file}#${ job.value.type }`]) : results, []))

					//
					// End Dash Job

					console.log(`Successfully packaged ${ name } into DASH.`)
					resolve(true)
				})
			})
		} else {
			return Promise.reject()
		}
	}

	createTranscodeJob(transcode_job:QueueWorker) {
		return new Promise((res, rej) => {

			this.transcode_queue.push(transcode_job)

			this.transcode_queue.on('success', finishJob)
			this.transcode_queue.on('error', errorJob)
			this.transcode_queue.on('timeout', timeoutJob)

			const off = () => {
				this.transcode_queue.off('success', finishJob)
				this.transcode_queue.off('error', errorJob)
				this.transcode_queue.off('timeout', timeoutJob)
			}

			function finishJob(result, job) {
				if (job == transcode_job) {
					off()
					res(result)
				}
			}

			function errorJob(error, job) {
				if (job == transcode_job) {
					off()
					rej(error)
				}
			}

			function timeoutJob(_, job) {
				if (job == transcode_job) {
					off()
					rej(new Error('Job timed out.'))
				}
			}
		})
	}

	createAudioTranscode(job_data:TranscodeAudioJob) {
		return async () => { // Returns an async function to be processed by the job queue
			const { dir, name, ext } = parse(job_data.output_file)
			console.log(`Transcoding audio '${ name }'...`);

			// This is a small patch to prism-media to allow for completely non-piped transcode
			// Create FFmpeg Duplex stream
			const audioTranscoder = new PatchedFFmpeg({
				args: objectToArgs({ ...this.config.default_audio_args, ...job_data.args }).concat(['-y', job_data.output_file])
			})

			if (audioTranscoder.process.stderr) {
				pipeline(
					audioTranscoder.process.stderr,
					createWriteStream(join(dir, 'logs',  `${ name + ext }.log`))
				)
			}

			// Build the transcode pipeline
			try {
				let result = await pipeline(
					createReadStream(job_data.input_file),
					audioTranscoder
				)

				console.log(`Transcoding audio '${ name }' complete.`)

				return { type: 'audio', ...job_data }
			} catch (e) {
				console.error(`Transcoding audio '${ name }' failed. ${ e }`)
				throw e
			}
		}
	}

	createVideoTranscode(job_data:TranscodeVideoJob) {
		return async () => { // Returns an async function to be processed by the job queue
			const { dir, name, ext } = parse(job_data.output_file)
			console.log(`Transcoding video '${ name }'...`);

			let args = objectToArgs({ ...this.config.default_video_args, ...job_data.args, 'r': job_data.frame_rate, 'x264opts': `keyint=${ Math.round(job_data.frame_rate*2) }:min-keyint=${ Math.round(job_data.frame_rate*2) }:no-scenecut`, 'y': undefined })
			if (this.hwaccel) {
				args = objectToArgs({
					...this.config.default_video_args,
					...job_data.args,
					'r': job_data.frame_rate,
					'c:v': 'h264_nvenc',
					'no-scenecut': 0, // no-scenecut
					'g': Math.round(job_data.frame_rate*2), // keyint
					'y': undefined
				})
			}

			// Create FFmpeg Duplex stream
			const videoTranscoder = new PatchedFFmpeg({
				args: args.concat([job_data.output_file])
			})

			if (videoTranscoder.process.stderr) {
				pipeline(
					videoTranscoder.process.stderr,
					createWriteStream(join(dir, 'logs',  `${ name + ext }.log`))
				)
			}

			// Build the transcode pipeline
			try {
				let result = await pipeline(
					createReadStream(job_data.input_file),
					videoTranscoder
				)

				console.log(`Transcoding video '${ name }' complete.`)

				return { type: 'video', ...job_data }
			} catch (e) {
				console.error(`Transcoding video '${ name }' failed. ${ e }`)
				throw e
			}
		}
	}
}

interface FFmpegAudioArgs {
	'map'?:string
	'c:a'?:string
	'b:a'?:string
	'profile:a'?:string
	'ar'?:number|string
	'ac'?:number|string
	'vn'?:undefined
}
interface FFmpegVideoArgs {
	'c:v'?:string
	'b:v'?:string
	'profile:v'?:string
	'x264opts'?:string
	'r'?:number|string
	'crf'?:number|string
	'maxrate'?:string
	'bufsize'?:string
	'preset'?:string
	'tune'?:string
	'pix_fmt'?:string
	'vf'?:string
	'movflags'?:string
	'an'?:undefined
}

interface FFmpegAudioFormat {
	'name':string
	'args':FFmpegAudioArgs
}
interface FFmpegVideoFormat {
	'name':string
	'args':FFmpegVideoArgs
}

interface DASHConverterConfig {
	'default_audio_args':FFmpegAudioArgs
	'default_video_args':FFmpegVideoArgs
	'audio_formats':FFmpegAudioFormat[]
	'video_formats':FFmpegVideoFormat[]
	'fallback_format'?:FFmpegAudioFormat
}

interface TranscodeAudioJob {
	input_file: string
	output_file: string
	args: FFmpegAudioArgs,
}

interface TranscodeVideoJob {
	frame_rate: number,
	input_file: string
	output_file: string
	args: FFmpegVideoArgs,
}
