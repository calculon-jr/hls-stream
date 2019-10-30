const fs = require('fs');
const path = require('path');
const {spawn} = require('child_process');
const cli = require('commander');
const isUrl = require('is-url');
const isFile = require('is-file');
const express = require('express');
const app = express();

cli.usage("<input> [options]")
    .option('-v, --vcodec <string>', 'Video codec to transcode to', 'copy')
    .option('-a, --acodec <string>', 'Audio codec to transcode to', 'copy')
    .option('--vbitrate <string>', 'Video bitrate (bit/s)')
    .option('--abitrate <string>', 'Audio bitrate (bit/s)')
    .option('-p --port <number>', 'Port to stream to', 8080)
    .option('-d --streamdir <string>', 'Directory to use for stream files ', process.cwd())
    .parse(process.argv);

if (cli.args.length != 1) {
    cli.help();
    return;
}

var input = cli.args[0];
var videoCodec = cli.vcodec;
var audioCodec = cli.acodec;
var videoBitrate = cli.vbitrate;
var audioBitrate = cli.abitrate;
var port = cli.port;
var streamDir = path.normalize(
    path.isAbsolute(cli.streamdir) ? cli.streamdir : path.resolve(process.cwd(), cli.streamdir)
).replace(/(\\|\/)$/, ""); // remove trailing slash or backslash

var inputType;
if (isFile(input)) {
    inputType = 'file';
    console.log('Found file');
} else if (isUrl(input)) {
    inputType = 'url';
    console.log('Found url');
} else {
    console.log('Input type not recognized');
    return;
}

if (fs.existsSync(streamDir)) {    
    // delete temp files from previous stream
    fs.readdirSync(streamDir).filter(file => 
        file.endsWith('.m3u8') ||
        file.endsWith('.ts')   ||
        file.endsWith('.vtt')
    ).forEach(file => fs.unlinkSync(path.resolve(streamDir, file)));
} else {
    fs.mkdirSync(streamDir);
}

// start ffmpeg stream
var ffmpegArgs = [
    '-i', input, 
    '-y', // overwrite files
    '-c:v', videoCodec, 
    '-c:a', audioCodec, 
    '-ac', 2, // 2 channel audio
    '-movflags', '+frag_keyframe+empty_moov+faststart', 
    '-preset', 'veryfast',
    '-f', 'hls', 
    '-hls_time', 5, // segment length in seconds
    '-hls_list_size', 5, // number of segment files to keep at once
    '-hls_delete_threshold', 1, 
    '-hls_flags', 'split_by_time+delete_segments+second_level_segment_index', 
    '-strftime', 1, 
    '-hls_base_url', path.normalize(streamDir + '/'), // segment prefix
    '-hls_segment_filename', path.resolve(streamDir, 'stream%%d.ts'), // segment name
    '-hls_segment_type', 'mpegts', 
    path.resolve(streamDir, 'stream.m3u8')
];

if (inputType === 'file') {
    // read at native framerate
    ffmpegArgs.splice(0, 0, '-re');
}

if (videoBitrate) {
    // insert video bitrate after video codec
    ffmpegArgs.splice(ffmpegArgs.indexOf(videoCodec) + 1, 0, '-b:v');
    ffmpegArgs.splice(ffmpegArgs.indexOf('-b:v') + 1, 0, videoBitrate);
}

if (audioBitrate) {
    // insert audio bitrate after audio codec
    ffmpegArgs.splice(ffmpegArgs.indexOf(audioCodec) + 1, 0, '-a:v');
    ffmpegArgs.splice(ffmpegArgs.indexOf('-a:v') + 1, 0, audioBitrate);
}

// spawn ffmpeg stream
var ffmpegStream = spawn('ffmpeg', ffmpegArgs);

// pipe ffmpeg stderr to terminal
ffmpegStream.stderr.pipe(process.stderr);

// wait for stream to start
var streamCheck = setInterval(() => {
    if (fs.existsSync(path.resolve(streamDir, 'stream.m3u8'))) {
        console.log('Stream ready on port ' + cli.port);
        clearInterval(streamCheck);
    }
}, 250);

// start file server
app.get('/', function (_, res) {
    let filepath = path.resolve(streamDir, 'stream.m3u8');
    res.sendFile(filepath);
});

app.get('/:path', (req, res) => {
    let filepath = req.params.path;
    res.sendFile(filepath);
});

app.listen(port);