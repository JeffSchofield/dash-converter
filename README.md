# DASH Converter

DASH Converter is a [Node.js](https://nodejs.org/en/) tool to automate the encoding of multi-bitrate media for DASH delivery. Based on this [guide](https://accurate.video/docs/guides/encoding-multi-bitrate-content-optimal-dash-delivery/) by Jonas Sandberg of Codemill.

## Installation and Usage

To use DASH Converter as a command line tool, make sure [Node.js](https://nodejs.org/en/) and [mp4box](https://gpac.wp.imt.fr/downloads/) are installed on your machine. FFmpeg and FFprobe binaries are provided automatically.

Install globally with NPM:

```bash
$ npm install -g dash-converter
```

Create a new directory to store the files  `./input` and `./output` folders, and optionally a `config.json` file to configure your desired output formats. If you don't create one, a default one will be created when the converter is run. See the [configuration section](#configuration) for details on configuration options.

When ready, place all of your source video files into `./input` and run the following command:

```bash
$ dash-converter
```

DASH Converter will process every video file in the `./input` folder into an MPEG-DASH compatible format and store the results in `./output`.

For experimental NVENC hardware acceleration you can pass the `-hwaccel` flag:

```bash
$ dash-converter -hwaccel
```

### Building locally

Clone this repo and use `npm install` to install dependencies:

```bash
$ git clone https://github.com/JeffSchofield/dash-converter.git
$ cd dash-converter
$ npm install
```

Build the project with NPM:

```bash
$ npm run build
```

Use NPM link to make your local DASH Converter available to the command line:

```bash
$ npm link
$ dash-converter
```

### Programmatic Usage

You can integrate the converter into your Node.js application by installing and importing the DASH Converter lib:

```bash
$ npm install dash-converter
```

Example:

```ts
import { DASHConverter } from 'dash-converter'

async function init() {
	const dash = new DASHConverter({
		video_formats: [
			{ name: '1080p', args: {} }
		],
		audio_formats: [
			{ name: '', args: {} }
		]
	})

	let result = await dash.convert('./some_source_video.mp4', './output_folder')
}
```

## Configuration

DASH Converter will create a default `config.json` file for you when first run. Alter this file to specify video and audio formats to be transcoded.

### default_audio_args
- **Type:** FFmpegAudioArgs
- **Default:** `{ 'c:a': 'aac', 'b:a': '192k', 'vn': undefined }`

	Arguments that are always passed to FFmpeg during audio transcode.

### default_video_args
- **Type:** FFmpegVideoArgs
- **Default:** `{ 'c:v': 'libx264', 'profile:v': 'main', 'crf': 23, 'preset': "slow", 'pix_fmt': "yuv420p", 'an': undefined }`

	Arguments that are always passed to FFmpeg during video transcode.

### audio_formats
- **Type:** FFmpegAudioFormat[]

	List of audio formats to be transcoded to. Each format contains a name and a list of arguments to pass to FFMpeg in this shape: `{ name:string, args:FFmpegAudioArgs }`

### video_formats
- **Type:** FFmpegVideoFormat[]

	List of video formats to be transcoded to. Each format contains a name and a list of arguments to pass to FFMpeg in this shape: `{ name:string, args:FFmpegVideoArgs }`

## License

DASH Converter is [MIT](LICENSE) licensed.
